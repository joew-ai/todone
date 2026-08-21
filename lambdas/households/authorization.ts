import type { CurrentMembership, HouseholdRepository } from './model';

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
