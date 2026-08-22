export const HouseholdRole = {
  parent: 'parent',
  child: 'child',
} as const;

export const MembershipActivationState = {
  active: 'ACTIVE',
  pendingActivation: 'PENDING_ACTIVATION',
  inactive: 'INACTIVE',
} as const;

export const ProfileColor = {
  pine: 'PINE',
  fern: 'FERN',
  moss: 'MOSS',
  clay: 'CLAY',
  cedar: 'CEDAR',
  marigold: 'MARIGOLD',
  lake: 'LAKE',
  dusk: 'DUSK',
} as const;

export type ProfileColorId = (typeof ProfileColor)[keyof typeof ProfileColor];

export const ProfileColorHex = {
  [ProfileColor.pine]: '#2F6B4F',
  [ProfileColor.fern]: '#4D7C3F',
  [ProfileColor.moss]: '#6B7A3A',
  [ProfileColor.clay]: '#B85C3F',
  [ProfileColor.cedar]: '#8A5A44',
  [ProfileColor.marigold]: '#966300',
  [ProfileColor.lake]: '#337B8C',
  [ProfileColor.dusk]: '#76507A',
} as const;

export const USERNAME_PATTERN = /^[a-z0-9_-]{3,24}$/;
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 24;

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
  username: 'username',
  displayName: 'displayName',
  color: 'color',
} as const;

export const HouseholdErrorCode = {
  invalidRequest: 'INVALID_REQUEST',
  invalidName: 'INVALID_NAME',
  invalidTimezone: 'INVALID_TIMEZONE',
  invalidIdempotencyKey: 'INVALID_IDEMPOTENCY_KEY',
  invalidUsername: 'INVALID_USERNAME',
  invalidDisplayName: 'INVALID_DISPLAY_NAME',
  invalidProfileColor: 'INVALID_PROFILE_COLOR',
  profileConflict: 'PROFILE_CONFLICT',
  membershipExists: 'MEMBERSHIP_EXISTS',
  idempotencyConflict: 'IDEMPOTENCY_CONFLICT',
} as const;

export const MAX_HOUSEHOLD_NAME_LENGTH = 80;
export const MAX_DISPLAY_NAME_LENGTH = 60;
export const MAX_IDEMPOTENCY_KEY_LENGTH = 200;
/** Reserved for optimistic concurrency checks when household updates are added. */
export const INITIAL_HOUSEHOLD_VERSION = 1;
export const INITIAL_PROFILE_VERSION = 1;
export const ATTRIBUTE_DOES_NOT_EXIST = 'attribute_not_exists(pk)';
