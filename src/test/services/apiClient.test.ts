import { describe, expect, it, vi } from 'vitest';
import { fetchHealth } from '../../services/apiClient';

describe('fetchHealth', () => {
  it('returns a success result when the response is ok', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'ok', timestamp: '2026-01-01T00:00:00.000Z' }),
    });

    const result = await fetchHealth(fetchMock as unknown as typeof fetch);

    expect(result.kind).toBe('success');
    if (result.kind === 'success') {
      expect(result.data.status).toBe('ok');
      expect(result.data.timestamp).toBe('2026-01-01T00:00:00.000Z');
    }
  });

  it('returns a recoverable error result when the response is not ok', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) });

    const result = await fetchHealth(fetchMock as unknown as typeof fetch);

    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.recoverable).toBe(true);
    }
  });

  it('returns a recoverable error result when fetch throws', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('network down'));

    const result = await fetchHealth(fetchMock as unknown as typeof fetch);

    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.recoverable).toBe(true);
      expect(result.message).not.toContain('network down');
    }
  });
});
