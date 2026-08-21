export const HouseholdRole = {
  parent: 'parent',
  child: 'child',
} as const;

export const HouseholdRecord = {
  household: 'HOUSEHOLD',
  membership: 'MEMBERSHIP',
  memberPrefix: 'MEMBER',
  userPrefix: 'USER',
  householdPrefix: 'HOUSEHOLD',
  idempotencyPrefix: 'IDEMPOTENCY#HOUSEHOLD',
} as const;

export const HouseholdField = {
  name: 'name',
  timezone: 'timezone',
} as const;

export const HouseholdErrorCode = {
  invalidRequest: 'INVALID_REQUEST',
  invalidName: 'INVALID_NAME',
  invalidTimezone: 'INVALID_TIMEZONE',
  invalidIdempotencyKey: 'INVALID_IDEMPOTENCY_KEY',
  membershipExists: 'MEMBERSHIP_EXISTS',
  idempotencyConflict: 'IDEMPOTENCY_CONFLICT',
} as const;

export const MAX_HOUSEHOLD_NAME_LENGTH = 80;
export const MAX_IDEMPOTENCY_KEY_LENGTH = 200;
/** Reserved for optimistic concurrency checks when household updates are added. */
export const INITIAL_HOUSEHOLD_VERSION = 1;
export const ATTRIBUTE_DOES_NOT_EXIST = 'attribute_not_exists(pk)';
