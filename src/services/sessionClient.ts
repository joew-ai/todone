import type { ApiResult } from './apiResult';

export interface SessionInfo {
  sub: string;
  username: string;
  expiresAt: string;
}

/**
 * Calls the protected current-session endpoint with a bearer JWT. Returns
 * exactly `sub`, `username`, and `expiresAt` on success; every failure
 * (missing, malformed, expired, or wrong-issuer token; network failure)
 * collapses to the same generic recoverable error so the UI never signals
 * which credential or token property was wrong.
 */
export async function fetchSession(
  idToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ApiResult<SessionInfo>> {
  try {
    const response = await fetchImpl('/api/v1/session', {
      method: 'GET',
      headers: { authorization: `Bearer ${idToken}`, accept: 'application/json' },
    });

    if (!response.ok) {
      return {
        kind: 'error',
        message: 'Your session could not be verified. Please sign in again.',
        recoverable: true,
      };
    }

    const data = (await response.json()) as SessionInfo;
    return { kind: 'success', data };
  } catch {
    return {
      kind: 'error',
      message: 'Could not reach the server. Check your connection and try again.',
      recoverable: true,
    };
  }
}
