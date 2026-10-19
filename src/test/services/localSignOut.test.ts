import { afterEach, describe, expect, it, vi } from 'vitest';
import { activeMembershipRole } from '../../presentation/appContext';
import { applyProfileTone, clearProfileTone } from '../../presentation/profileTone';
import {
  clearRouteBootstrapContext,
  stageRouteBootstrapContext,
  takeRouteBootstrapContext,
} from '../../presentation/routeBootstrapContext';
import { AppRouteName } from '../../router/routes';
import type { AuthClient } from '../../services/authClient';
import { clearLocalAuthentication } from '../../services/localSignOut';

describe('local sign-out privacy boundary', () => {
  afterEach(() => {
    activeMembershipRole.value = null;
    clearProfileTone();
    clearRouteBootstrapContext();
  });

  it.each([false, true])('clears private presentation when SDK cleanup throws: %s', (throws) => {
    activeMembershipRole.value = 'child';
    applyProfileTone('LAKE');
    const signOut = vi.fn(() => {
      if (throws) throw new Error('SDK cleanup failure');
    });
    stageRouteBootstrapContext({
      routeName: AppRouteName.todos,
      authClient: { signOut } as unknown as AuthClient,
      membership: null,
      profile: null,
    });
    expect(() => clearLocalAuthentication({ signOut })).not.toThrow();
    expect(takeRouteBootstrapContext(AppRouteName.todos)).toBeNull();
    expect(signOut).toHaveBeenCalledOnce();
    expect(activeMembershipRole.value).toBeNull();
    expect(document.documentElement.hasAttribute('data-profile-color')).toBe(false);
  });
});
