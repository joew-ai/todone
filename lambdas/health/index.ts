import { randomUUID } from 'node:crypto';
import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { recordRequest } from '../shared/observe';

const ROUTE = '/api/v1/health';

/**
 * Local-simulator health handler.
 *
 * This is a foundation-scope example handler only. It proves the
 * Lambda-shaped request/response contract end to end (API simulator ->
 * typed client -> Vue shell). It is not the protected current-session
 * endpoint; that contract belongs to task 2.6 once Cognito/JWT
 * infrastructure exists.
 */
export async function handler(
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyStructuredResultV2> {
  const startedAtMs = performance.now();
  const requestId = event.requestContext?.requestId ?? randomUUID();
  const method = event.requestContext?.http?.method ?? 'GET';

  const body = {
    status: 'ok' as const,
    timestamp: new Date().toISOString(),
  };

  const result: APIGatewayProxyStructuredResultV2 = {
    statusCode: 200,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store',
    },
    body: JSON.stringify(body),
  };

  recordRequest({ route: ROUTE, method, requestId, status: result.statusCode ?? 200, startedAtMs });
  return result;
}
