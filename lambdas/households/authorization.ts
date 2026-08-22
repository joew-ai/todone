import { HouseholdRole, MembershipActivationState } from './constants';
import type { CurrentMembership, FamilyDirectoryMember, HouseholdRepository } from './model';

export async function requireMembership(
  repository: HouseholdRepository,
  sub: string,
): Promise<CurrentMembership | null> {
  return repository.getCurrentMembership(sub);
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
  const membership = await repository.getCurrentMembership(sub, tokenIssuedAt);
  if (!membership || membership.role !== HouseholdRole.parent) return null;
  return membership;
}

/** A parent may administer only an active child in their resolved household, never a peer parent. */
export function isManageableChild(
  caller: CurrentMembership,
  target: FamilyDirectoryMember,
  targetHouseholdId: string,
): boolean {
  return (
    target.role === HouseholdRole.child &&
    target.activationState === MembershipActivationState.active &&
    isResourceInHousehold(caller, targetHouseholdId)
  );
}
