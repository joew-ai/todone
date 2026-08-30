import type { ApiResult } from './apiResult';

export const HttpHeader = {
  accept: 'accept',
  authorization: 'authorization',
  contentType: 'content-type',
  idempotencyKey: 'idempotency-key',
} as const;
export const APPLICATION_JSON = 'application/json';
export const HttpMethod = { get: 'GET', post: 'POST', put: 'PUT' } as const;
const NO_STORE = 'no-store';

export interface AuthenticatedJsonResponse<T> {
  response: Response;
  body: T | null;
}

/** Applies the application's non-cacheable bearer-token JSON request contract. */
export async function fetchAuthenticatedJson<T>(
  url: string,
  idToken: string,
  init: RequestInit,
  fetchImpl: typeof fetch = fetch,
): Promise<AuthenticatedJsonResponse<T>> {
  const response = await fetchImpl(url, {
    ...init,
    headers: {
      [HttpHeader.accept]: APPLICATION_JSON,
      [HttpHeader.authorization]: `Bearer ${idToken}`,
      ...init.headers,
    },
    cache: NO_STORE,
  });
  return { response, body: (await response.json().catch(() => null)) as T | null };
}

export interface HealthResponse {
  status: 'ok';
  timestamp: string;
}

/**
 * Typed boundary between the Vue shell and the local API simulator (and,
 * later, the deployed API). Callers never see raw fetch/Response objects;
 * they receive a discriminated result they can render as loading, success,
 * or a recoverable error.
 */
export async function fetchHealth(
  fetchImpl: typeof fetch = fetch,
): Promise<ApiResult<HealthResponse>> {
  try {
    const response = await fetchImpl('/api/v1/health', {
      method: HttpMethod.get,
      headers: { [HttpHeader.accept]: APPLICATION_JSON },
    });

    if (!response.ok) {
      return {
        kind: 'error',
        message: 'The service is temporarily unavailable. Please try again.',
        recoverable: true,
      };
    }

    const data = (await response.json()) as HealthResponse;
    return { kind: 'success', data };
  } catch {
    return {
      kind: 'error',
      message: 'Could not reach the server. Check your connection and try again.',
      recoverable: true,
    };
  }
}
