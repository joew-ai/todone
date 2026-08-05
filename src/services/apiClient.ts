import type { ApiResult } from './apiResult';

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
      method: 'GET',
      headers: { accept: 'application/json' },
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
