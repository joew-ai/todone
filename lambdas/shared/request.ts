import { randomUUID } from 'node:crypto';
import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { recordRequest } from './observe';

/** Runs a handler operation and records every completed response, including successes. */
export async function handleObservedRequest(
  event: APIGatewayProxyEventV2,
  route: string,
  operation: (requestId: string) => Promise<APIGatewayProxyStructuredResultV2>,
): Promise<APIGatewayProxyStructuredResultV2> {
  const requestId = event.requestContext?.requestId ?? randomUUID();
  const startedAtMs = performance.now();
  const response = await operation(requestId);

  recordRequest({
    route,
    method: event.requestContext?.http?.method ?? 'UNKNOWN',
    requestId,
    status: response.statusCode ?? 500,
    startedAtMs,
  });
  return response;
}
