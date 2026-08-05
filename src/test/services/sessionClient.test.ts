import { describe, expect, it, vi } from 'vitest';
import { fetchSession } from '../../services/sessionClient';

describe('fetchSession', () => {
  it('sends the token as a Bearer Authorization header and returns success data', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        sub: 'sub-1',
        username: 'parent1',
        expiresAt: '2026-01-01T00:00:00.000Z',
      }),
    });

    const result = await fetchSession('a-jwt', fetchMock as unknown as typeof fetch);

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/session',
      expect.objectContaining({
        headers: expect.objectContaining({ authorization: 'Bearer a-jwt' }),
      }),
    );
    expect(result).toEqual({
      kind: 'success',
      data: { sub: 'sub-1', username: 'parent1', expiresAt: '2026-01-01T00:00:00.000Z' },
    });
  });

  it('returns a recoverable error without leaking the failure reason when the response is not ok', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) });

    const result = await fetchSession('a-jwt', fetchMock as unknown as typeof fetch);

    expect(result).toEqual({
      kind: 'error',
      message: 'Your session could not be verified. Please sign in again.',
      recoverable: true,
    });
  });

  it('returns a recoverable error when fetch throws', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('network down'));

    const result = await fetchSession('a-jwt', fetchMock as unknown as typeof fetch);

    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.recoverable).toBe(true);
      expect(result.message).not.toContain('network down');
    }
  });
});
