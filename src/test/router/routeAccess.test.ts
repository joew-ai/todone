import { beforeEach, describe, expect, it, vi } from 'vitest';

const restoreSession = vi.fn();
const fetchCurrentMembership = vi.fn();
const fetchMyProfile = vi.fn();

vi.mock('../../config/authConfig', () => ({
  loadAuthConfig: () => ({ userPoolId: 'pool', clientId: 'client', region: 'us-east-1' }),
}));
vi.mock('../../services/authClient', () => ({
  AuthClient: class {
    restoreSession = restoreSession;
  },
}));
vi.mock('../../services/householdClient', () => ({ fetchCurrentMembership }));
vi.mock('../../services/profileClient', () => ({ fetchMyProfile }));

const { router } = await import('../../router');
const { AppRouteName } = await import('../../router/routes');

const childMembership = {
  memberId: 'child-member',
  username: 'child-one',
  role: 'child' as const,
  household: { householdId: 'house-one', name: 'River House', timezone: 'America/Chicago' },
};

describe('route access', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    restoreSession.mockResolvedValue(null);
    fetchCurrentMembership.mockResolvedValue({ kind: 'success', data: { membership: null } });
    fetchMyProfile.mockResolvedValue({ kind: 'success', data: { profile: null } });
    await router.push({ name: AppRouteName.signIn });
  });

  it('replaces a signed-out protected route with sign in', async () => {
    await router.push({ name: AppRouteName.family });

    expect(router.currentRoute.value.name).toBe(AppRouteName.signIn);
    expect(router.currentRoute.value.fullPath).toBe('/sign-in');
  });

  it('routes an active child with a profile to the honest Todo placeholder', async () => {
    restoreSession.mockResolvedValue({ idToken: 'token' });
    fetchCurrentMembership.mockResolvedValue({
      kind: 'success',
      data: { membership: childMembership },
    });
    fetchMyProfile.mockResolvedValue({
      kind: 'success',
      data: {
        profile: { memberId: 'child-member', displayName: 'Moss', color: 'MOSS', version: 1 },
      },
    });

    await router.push({ name: AppRouteName.root });

    expect(router.currentRoute.value.name).toBe(AppRouteName.todos);
    expect(router.currentRoute.value.fullPath).toBe('/todos');
  });

  it('keeps verification identity and code out of the route', async () => {
    await router.push({ name: AppRouteName.verifyEmail });

    expect(router.currentRoute.value.fullPath).toBe('/verify-email');
    expect(router.currentRoute.value.query).toEqual({});
    expect(router.currentRoute.value.hash).toBe('');
  });
});
