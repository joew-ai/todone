import type { Request, Response } from 'express';
import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';

type Handler = (event: APIGatewayProxyEventV2) => Promise<APIGatewayProxyStructuredResultV2>;

/**
 * Simulates API Gateway invoking a Lambda handler for local development and
 * integration tests. It builds a minimal APIGatewayProxyEventV2 from the
 * incoming Express request and writes the handler's response back through
 * Express, so handlers never depend on Express-specific types.
 */
export async function simulateLambda(handler: Handler, req: Request, res: Response): Promise<void> {
  const event: APIGatewayProxyEventV2 = {
    version: '2.0',
    routeKey: `${req.method} ${req.path}`,
    rawPath: req.path,
    rawQueryString: '',
    headers: req.headers as Record<string, string>,
    requestContext: {
      http: {
        method: req.method,
        path: req.path,
        protocol: 'HTTP/1.1',
        sourceIp: req.ip ?? '',
        userAgent: req.headers['user-agent'] ?? '',
      },
    },
    isBase64Encoded: false,
    // Minimal shape; extended fields are added only when a handler needs them.
  } as unknown as APIGatewayProxyEventV2;

  try {
    const result = await handler(event);
    const headers = (result.headers ?? {}) as Record<string, string>;
    res.status(result.statusCode ?? 200);
    for (const [key, value] of Object.entries(headers)) {
      res.set(key, value);
    }
    res.send(result.body ?? '');
  } catch (error) {
    // The simulator never leaks handler internals; it mirrors what API
    // Gateway would do on an unhandled Lambda error.
    console.error('Unhandled simulator error', error instanceof Error ? error.message : error);
    res.status(500).json({ error: 'internal_error' });
  }
}
