import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';

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
  _event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyStructuredResultV2> {
  const body = {
    status: 'ok' as const,
    timestamp: new Date().toISOString(),
  };

  return {
    statusCode: 200,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store',
    },
    body: JSON.stringify(body),
  };
}
