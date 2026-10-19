import { describe, expect, it, vi } from 'vitest';
import { createChild, fetchFamilyMembers, resetChildPassword } from '../../services/familyClient';

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

describe('child password reset API client', () => {
  it('sends a single no-store PUT without an idempotency record and accepts an empty 204', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    await expect(
      resetChildPassword('private-token', 'child', 'Replacement1!', fetchMock),
    ).resolves.toEqual({ kind: 'success' });
    expect(fetchMock).toHaveBeenCalledOnce();
    const [path, options] = fetchMock.mock.calls[0];
    expect(path).toBe('/api/v1/family-members/child/password');
    expect(options).toMatchObject({
      method: 'PUT',
      cache: 'no-store',
      body: JSON.stringify({ password: 'Replacement1!' }),
    });
    expect(options.headers).not.toHaveProperty('idempotency-key');
  });

  it.each([401, 500])(
    'distinguishes expired sessions from uncertain failures (%s)',
    async (status) => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ error: { message: 'Safe failure' } }), { status }),
        );
      await expect(
        resetChildPassword('token', 'child', 'Replacement1!', fetchMock),
      ).resolves.toMatchObject({
        kind: 'error',
        recoverable: false,
        sessionExpired: status === 401,
      });
      expect(fetchMock).toHaveBeenCalledOnce();
    },
  );

  it('does not automatically retry after a lost response', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('Lost response'));
    await expect(
      resetChildPassword('token', 'child', 'Replacement1!', fetchMock),
    ).resolves.toMatchObject({ kind: 'error', recoverable: true });
    expect(fetchMock).toHaveBeenCalledOnce();
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
