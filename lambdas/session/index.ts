import { randomUUID } from 'node:crypto';
import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { createCognitoVerifier, type TokenVerifier } from './verifier';
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
  const headers = (event.headers ?? {}) as Record<string, string | undefined>;
  const token = extractBearerToken(headers.authorization ?? headers.Authorization);

  if (!token) {
    return unauthorized();
  }

  try {
    const verifier = verifierOverride ?? getVerifier();
    const claims = await verifier.verify(token);

    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
      body: JSON.stringify({
        sub: claims.sub,
        username: claims.username,
        expiresAt: new Date(claims.exp * 1000).toISOString(),
      }),
    };
  } catch {
    return unauthorized();
  }
}
