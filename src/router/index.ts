import { createRouter, createWebHistory, type RouteLocationNormalized } from 'vue-router';
import ProductionBootstrap from '../components/ProductionBootstrap.vue';
import TodoPlaceholder from '../components/TodoPlaceholder.vue';
import { loadAuthConfig } from '../config/authConfig';
import { messages } from '../i18n/messages';
import { applyMembershipContext } from '../presentation/appContext';
import { applyProfileTone } from '../presentation/profileTone';
import {
  clearRouteBootstrapContext,
  isCurrentRouteBootstrapResolution,
  stageRouteBootstrapContext,
} from '../presentation/routeBootstrapContext';
import { AuthClient } from '../services/authClient';
import { fetchCurrentMembership } from '../services/householdClient';
import { fetchMyProfile } from '../services/profileClient';
import {
  appRouteDefinitions,
  AppRouteName,
  isPublicRouteName,
  isUnavailableRouteName,
} from './routes';
import type { AppRouteName as AppRouteNameType } from './routes';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    ...Object.values(appRouteDefinitions).map((route) => ({
      path: route.path,
      name: route.name,
      component: route.todoPlaceholder ? TodoPlaceholder : ProductionBootstrap,
    })),
    { path: '/:pathMatch(.*)*', redirect: { name: AppRouteName.root } },
  ],
});

/**
 * Resolves only safe session, membership, and profile prerequisites before a
 * protected route renders. Form values and secrets never participate in route
 * state, redirects, or history.
 */
router.beforeEach(async (to) => resolveRouteAccess(to));
router.afterEach((to) => {
  const routeName = to.name as AppRouteNameType;
  document.title = `${appRouteDefinitions[routeName].title} · ${messages.navigation.appName}`;
});

async function resolveRouteAccess(to: RouteLocationNormalized) {
  const resolutionVersion = clearRouteBootstrapContext();
  const routeName = to.name as AppRouteNameType;
  if (isUnavailableRouteName(routeName)) {
    return { name: AppRouteName.root, replace: true };
  }

  const authClient = new AuthClient(loadAuthConfig());
  const session = await authClient.restoreSession();
  if (!isCurrentRouteBootstrapResolution(resolutionVersion)) return false;
  if (!session) {
    applyMembershipContext(null);
    if (isPublicRouteName(routeName)) return true;
    return { name: AppRouteName.signIn, replace: true };
  }

  const membershipResult = await fetchCurrentMembership(session.idToken);
  if (!isCurrentRouteBootstrapResolution(resolutionVersion)) return false;
  if (membershipResult.kind === 'error') {
    applyMembershipContext(null);
    if (membershipResult.recoverable) return true;
    return { name: AppRouteName.signIn, replace: true };
  }
  const membership = membershipResult.data.membership;
  applyMembershipContext(membership);
  if (!membership) {
    if (routeName === AppRouteName.householdSetup) {
      stageRouteBootstrapContext({ routeName, authClient, membership, profile: null });
      return true;
    }
    return { name: AppRouteName.householdSetup, replace: true };
  }

  const profileResult = await fetchMyProfile(session.idToken);
  if (!isCurrentRouteBootstrapResolution(resolutionVersion)) return false;
  if (profileResult.kind === 'error') {
    if (profileResult.recoverable) return true;
    return { name: AppRouteName.signIn, replace: true };
  }
  if (!profileResult.data.profile) {
    if (routeName === AppRouteName.profileSetup) {
      stageRouteBootstrapContext({ routeName, authClient, membership, profile: null });
      return true;
    }
    return { name: AppRouteName.profileSetup, replace: true };
  }
  applyProfileTone(profileResult.data.profile.color);

  const homeRoute = membership.role === 'child' ? AppRouteName.todos : AppRouteName.family;
  if (
    routeName === AppRouteName.root ||
    isPublicRouteName(routeName) ||
    routeName === AppRouteName.householdSetup ||
    routeName === AppRouteName.profileSetup ||
    (membership.role === 'child' &&
      (routeName === AppRouteName.family ||
        routeName === AppRouteName.newChild ||
        routeName === AppRouteName.resetChildPassword))
  ) {
    return { name: homeRoute, replace: true };
  }
  stageRouteBootstrapContext({
    routeName,
    authClient,
    membership,
    profile: profileResult.data.profile,
  });
  return true;
}
