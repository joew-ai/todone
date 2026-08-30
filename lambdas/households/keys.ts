import { HouseholdRecord } from './constants';

export interface HouseholdStorageKey {
  pk: string;
  sk: string;
}

export function membershipLookupKey(sub: string): HouseholdStorageKey {
  return { pk: `${HouseholdRecord.userPrefix}#${sub}`, sk: HouseholdRecord.membership };
}

export function householdKey(householdId: string): HouseholdStorageKey {
  return {
    pk: `${HouseholdRecord.householdPrefix}#${householdId}`,
    sk: HouseholdRecord.household,
  };
}

export function householdMemberKey(householdId: string, memberId: string): HouseholdStorageKey {
  return {
    pk: `${HouseholdRecord.householdPrefix}#${householdId}`,
    sk: `${HouseholdRecord.memberPrefix}#${memberId}`,
  };
}

export function profileKey(householdId: string, memberId: string): HouseholdStorageKey {
  return {
    pk: `${HouseholdRecord.householdPrefix}#${householdId}`,
    sk: `PROFILE#${memberId}`,
  };
}

export function bootstrapReplayKey(sub: string, idempotencyKey: string): HouseholdStorageKey {
  return {
    pk: `${HouseholdRecord.userPrefix}#${sub}`,
    sk: `${HouseholdRecord.idempotencyPrefix}#${idempotencyKey}`,
  };
}

export function childProvisionReplayKey(sub: string, idempotencyKey: string): HouseholdStorageKey {
  return { pk: `${HouseholdRecord.userPrefix}#${sub}`, sk: `IDEMPOTENCY#CHILD#${idempotencyKey}` };
}

export function inMemoryReplayKey(sub: string, idempotencyKey: string): string {
  return `${sub}\0${idempotencyKey}`;
}
