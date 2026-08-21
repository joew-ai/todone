import { randomUUID } from 'node:crypto';
import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { createCognitoVerifier, type SessionClaims, type TokenVerifier } from './verifier';
import { recordRequest } from '../shared/observe';

const ROUTE = '/api/v1/session';

let cachedVerifier: TokenVerifier | null = null;

function getVerifier(): TokenVerifier {
  if (!cachedVerifier) {
    const userPoolId = process.env.COGNITO_USER_POOL_ID;
    const clientId = process.env.COGNITO_CLIENT_ID;
    if (!userPoolId || !clientId) {
      throw new Error('Missing COGNITO_USER_POOL_ID or COGNITO_CLIENT_ID environment variable.');
    }
    // LOCAL DEVELOPMENT ONLY (see scripts/setup-local-cognito.ts). This env
    // var is never set against a deployed pool.
    const localEndpoint = process.env.COGNITO_LOCAL_ENDPOINT;
    cachedVerifier = createCognitoVerifier({ userPoolId, clientId, localEndpoint });
  }
  return cachedVerifier;
}

function unauthorized(): APIGatewayProxyStructuredResultV2 {
  // Deliberately identical for missing, malformed, expired, and
  // wrong-issuer/audience tokens: no data disclosure, no hint about why
  // verification failed (docs/security/threat-model.md).
  return {
    statusCode: 401,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
    body: JSON.stringify({ error: 'unauthorized' }),
  };
}

function extractBearerToken(header: string | undefined): string | null {
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match ? (match[1] ?? null) : null;
}

/**
 * API Gateway's JWT authorizer is the production authentication boundary.
 * It verifies the token before invoking this handler and supplies the
 * verified claims through the HTTP API v2 event. The local simulator has no
 * authorizer, so it intentionally falls back to its injected token verifier.
 */
function getGatewayClaims(
  event: APIGatewayProxyEventV2,
): { kind: 'absent' } | { kind: 'invalid' } | { kind: 'valid'; claims: SessionClaims } {
  const requestContext = event.requestContext as { authorizer?: unknown };
  if (requestContext.authorizer === undefined) {
    return { kind: 'absent' };
  }

  const authorizer = requestContext.authorizer;
  if (typeof authorizer !== 'object' || authorizer === null || !('jwt' in authorizer)) {
    return { kind: 'invalid' };
  }

  const jwt = authorizer.jwt;
  if (typeof jwt !== 'object' || jwt === null || !('claims' in jwt)) {
    return { kind: 'invalid' };
  }

  const rawClaims = jwt.claims;
  if (typeof rawClaims !== 'object' || rawClaims === null) {
    return { kind: 'invalid' };
  }
  const claims = rawClaims as Record<string, unknown>;

  const sub = claims.sub;
  const username = claims['cognito:username'] ?? claims.username;
  const exp = claims.exp;

  if (
    typeof sub !== 'string' ||
    typeof username !== 'string' ||
    (typeof exp !== 'string' && typeof exp !== 'number')
  ) {
    return { kind: 'invalid' };
  }

  const expiresAtSeconds = typeof exp === 'number' ? exp : Number(exp);
  if (!Number.isSafeInteger(expiresAtSeconds) || expiresAtSeconds <= 0) {
    return { kind: 'invalid' };
  }

  return { kind: 'valid', claims: { sub, username, exp: expiresAtSeconds } };
}

function sessionResponse(claims: SessionClaims): APIGatewayProxyStructuredResultV2 {
  return {
    statusCode: 200,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
    body: JSON.stringify({
      sub: claims.sub,
      username: claims.username,
      expiresAt: new Date(claims.exp * 1000).toISOString(),
    }),
  };
}

/**
 * Protected current-session endpoint. Returns exactly `sub`, `username`,
 * and `expiresAt` for a valid token; rejects everything else with an
 * identical 401 and no session data.
 *
 * Every call records one privacy-safe structured log line and one EMF
 * metrics document (request ID, route, method, status, latency, outcome
 * only -- see docs/security/threat-model.md "Privacy-safe logging
 * allowlist"). The token, claims, and headers never reach `recordRequest`.
 *
 * The optional `verifierOverride` parameter exists only for tests; API
 * Gateway always calls this with a single argument.
 */
export async function handler(
  event: APIGatewayProxyEventV2,
  verifierOverride?: TokenVerifier,
): Promise<APIGatewayProxyStructuredResultV2> {
  const startedAtMs = performance.now();
  const requestId = event.requestContext?.requestId ?? randomUUID();
  const method = event.requestContext?.http?.method ?? 'GET';

  const result = await handle(event, verifierOverride);

  recordRequest({ route: ROUTE, method, requestId, status: result.statusCode ?? 500, startedAtMs });
  return result;
}

async function handle(
  event: APIGatewayProxyEventV2,
  verifierOverride?: TokenVerifier,
): Promise<APIGatewayProxyStructuredResultV2> {
  const gatewayClaims = getGatewayClaims(event);
  if (gatewayClaims.kind === 'valid') {
    return sessionResponse(gatewayClaims.claims);
  }
  if (gatewayClaims.kind === 'invalid') {
    return unauthorized();
  }

  // The local API simulator does not implement API Gateway's JWT authorizer.
  // Verify its bearer token here so offline development still exercises the
  // same authentication semantics without weakening deployed authorization.
  const headers = (event.headers ?? {}) as Record<string, string | undefined>;
  const token = extractBearerToken(headers.authorization ?? headers.Authorization);

  if (!token) {
    return unauthorized();
  }

  try {
    const verifier = verifierOverride ?? getVerifier();
    const claims = await verifier.verify(token);
    return sessionResponse(claims);
  } catch {
    return unauthorized();
  }
}
