import { describe, expect, it, vi } from 'vitest';
import { fetchFamilyMembers } from '../../services/familyClient';

describe('family directory API client', () => {
  it('uses the self-derived directory route with bearer authentication and no-store', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ members: [] }),
    });

    await expect(fetchFamilyMembers('private-token', fetchMock)).resolves.toEqual({
      kind: 'success',
      data: { members: [] },
    });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/family-members',
      expect.objectContaining({
        cache: 'no-store',
        method: 'GET',
        headers: expect.objectContaining({ authorization: 'Bearer private-token' }),
      }),
    );
  });
});
