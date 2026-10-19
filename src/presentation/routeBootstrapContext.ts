import type { AuthClient } from '../services/authClient';
import type { CurrentMembership } from '../services/householdClient';
import type { Profile } from '../services/profileClient';
import type { AppRouteName } from '../router/routes';

interface RouteBootstrapContext {
  routeName: AppRouteName;
  authClient: AuthClient;
  membership: CurrentMembership | null;
  profile: Profile | null;
}

let pendingContext: RouteBootstrapContext | null = null;
let resolutionVersion = 0;

/** One-use handoff from the current guard, never an authorization cache. */
export function stageRouteBootstrapContext(context: RouteBootstrapContext): void {
  pendingContext = context;
}

export function clearRouteBootstrapContext(): number {
  pendingContext = null;
  return ++resolutionVersion;
}

export function isCurrentRouteBootstrapResolution(version: number): boolean {
  return version === resolutionVersion;
}

export function takeRouteBootstrapContext(routeName: AppRouteName): RouteBootstrapContext | null {
  const context = pendingContext;
  pendingContext = null;
  if (context?.routeName === routeName) return context;
  return null;
}
