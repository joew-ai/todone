import {
  HouseholdErrorCode,
  HouseholdRole,
  MembershipActivationState,
  MembershipResolutionKind,
} from './constants';
import { errorResponse, HttpStatus } from '../shared/responses';
import { messages } from '../shared/messages';
import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import type {
  CurrentMembership,
  FamilyDirectoryMember,
  HouseholdMemberTarget,
  HouseholdRepository,
  MembershipResolution,
} from './model';

export async function resolveMembership(
  repository: HouseholdRepository,
  sub: string,
  tokenIssuedAt?: number,
): Promise<MembershipResolution> {
  return repository.resolveMembership(sub, tokenIssuedAt);
}

export function activeMembershipFromResolution(
  resolution: MembershipResolution,
): CurrentMembership | null {
  if (resolution.kind !== MembershipResolutionKind.active) return null;
  return resolution.membership;
}

export function isActiveParentMembership(membership: CurrentMembership): boolean {
  return membership.role === HouseholdRole.parent;
}

/** Maps non-active Membership outcomes without exposing state or stored identity values. */
export function membershipResolutionFailureResponse(
  resolution: Exclude<MembershipResolution, { kind: 'active' }>,
  requestId: string,
): APIGatewayProxyStructuredResultV2 {
  if (resolution.kind === MembershipResolutionKind.credentialsStale) {
    return errorResponse(
      HttpStatus.unauthorized,
      HouseholdErrorCode.sessionReauthenticationRequired,
      messages.membershipApi.reauthenticationRequired,
      requestId,
    );
  }
  if (resolution.kind === MembershipResolutionKind.inconsistent) {
    return errorResponse(
      HttpStatus.internalServerError,
      HouseholdErrorCode.internalError,
      messages.membershipApi.internalError,
      requestId,
    );
  }
  return errorResponse(
    HttpStatus.forbidden,
    HouseholdErrorCode.memberAccessUnavailable,
    messages.membershipApi.accessUnavailable,
    requestId,
  );
}

export function isResourceInHousehold(
  membership: CurrentMembership,
  resourceHouseholdId: string,
): boolean {
  return membership.household.householdId === resourceHouseholdId;
}

/** Resolves the caller's active Membership and rejects children before any Cognito administration. */
export async function requireActiveParent(
  repository: HouseholdRepository,
  sub: string,
  tokenIssuedAt?: number,
): Promise<CurrentMembership | null> {
  const membership = activeMembershipFromResolution(
    await repository.resolveMembership(sub, tokenIssuedAt),
  );
  if (!membership || !isActiveParentMembership(membership)) return null;
  return membership;
}

/** A parent may administer only an active child in their resolved household, never a peer parent. */
export function isManageableChild(
  caller: CurrentMembership,
  target: Pick<FamilyDirectoryMember | HouseholdMemberTarget, 'role' | 'activationState'>,
  targetHouseholdId: string,
): boolean {
  return (
    isActiveParentMembership(caller) &&
    target.role === HouseholdRole.child &&
    target.activationState === MembershipActivationState.active &&
    isResourceInHousehold(caller, targetHouseholdId)
  );
}
