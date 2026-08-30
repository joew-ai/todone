import { describe, expect, it, vi } from 'vitest';
import { createChild, fetchFamilyMembers } from '../../services/familyClient';

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

describe('child provisioning API client', () => {
  it('sends the password only in a no-store authenticated request', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ member: { memberId: 'child', username: 'child-one' } }),
    });

    await expect(
      createChild(
        'private-token',
        {
          username: 'child-one',
          displayName: 'Child One',
          color: 'PINE',
          password: 'PrivatePassword1!',
          idempotencyKey: 'request-key',
        },
        fetchMock,
      ),
    ).resolves.toMatchObject({ kind: 'success' });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/family-members/children',
      expect.objectContaining({
        cache: 'no-store',
        method: 'POST',
        headers: expect.objectContaining({
          authorization: 'Bearer private-token',
          'idempotency-key': 'request-key',
        }),
        body: JSON.stringify({
          username: 'child-one',
          displayName: 'Child One',
          color: 'PINE',
          password: 'PrivatePassword1!',
        }),
      }),
    );
  });

  it('makes an unconfirmed provisioning failure non-retryable in the UI', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: { message: 'safe request failure' } }),
    });

    await expect(
      createChild(
        'token',
        {
          username: 'child-one',
          displayName: 'Child One',
          color: 'PINE',
          password: 'PrivatePassword1!',
          idempotencyKey: 'request-key',
        },
        fetchMock,
      ),
    ).resolves.toEqual({
      kind: 'error',
      message: 'safe request failure',
      recoverable: false,
    });
  });
});
