import type { AuthClient } from './authClient';
import { applyMembershipContext } from '../presentation/appContext';
import { clearProfileTone } from '../presentation/profileTone';
import { clearRouteBootstrapContext } from '../presentation/routeBootstrapContext';

/** SDK failures must not keep this tab signed in or retain private presentation. */
export function clearLocalAuthentication(authClient: Pick<AuthClient, 'signOut'> | null): void {
  try {
    authClient?.signOut();
  } catch {
    // AuthClient clears stored credentials in its own finally block. Continue local cleanup.
  } finally {
    applyMembershipContext(null);
    clearProfileTone();
    clearRouteBootstrapContext();
  }
}
