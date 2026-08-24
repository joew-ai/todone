import {
  MembershipResolutionKind,
  type PendingParentAction,
  type ProfileColorId,
} from './constants';

export type MembershipRole = 'parent' | 'child';
export type MembershipActivationState = 'ACTIVE' | 'PENDING_ACTIVATION' | 'INACTIVE';

export interface Household {
  householdId: string;
  name: string;
  timezone: string;
  createdAt: string;
  /** Starts at 1 and is reserved for optimistic concurrency on future updates. */
  version: number;
}

export interface Membership {
  memberId: string;
  householdId: string;
  sub: string;
  username: string;
  role: MembershipRole;
  activationState: MembershipActivationState;
  createdAt: string;
}

export interface MembershipLookup {
  householdId: string;
  memberId: string;
  username: string;
  role: MembershipRole;
  activationState: MembershipActivationState;
  credentialsValidAfter?: string;
  /** Optional only for first-parent lookups written before family-account metadata existed. */
  createdAt?: string;
}

export interface CurrentMembership {
  memberId: string;
  username: string;
  role: MembershipRole;
  household: Pick<Household, 'householdId' | 'name' | 'timezone'>;
}

/** A fail-closed result for the verified caller's lookup, Household, and Membership records. */
export type MembershipResolution =
  | { kind: (typeof MembershipResolutionKind)['unattached'] }
  | { kind: (typeof MembershipResolutionKind)['active']; membership: CurrentMembership }
  | { kind: (typeof MembershipResolutionKind)['pendingActivation'] }
  | { kind: (typeof MembershipResolutionKind)['inactive'] }
  | { kind: (typeof MembershipResolutionKind)['credentialsStale'] }
  | { kind: (typeof MembershipResolutionKind)['inconsistent'] };

export interface Profile {
  memberId: string;
  displayName: string;
  color: ProfileColorId;
  version: number;
}

/** Safe family-directory representation; recovery contact and Cognito fields never belong here. */
export interface FamilyDirectoryMember {
  memberId: string;
  username: string;
  role: MembershipRole;
  activationState: MembershipActivationState;
  displayName: string;
  color: ProfileColorId;
}

export type PendingParentActionValue =
  (typeof PendingParentAction)[keyof typeof PendingParentAction];

export interface FamilyDirectoryEntry extends FamilyDirectoryMember {
  allowedActions: PendingParentActionValue[];
}

export interface SaveProfileInput {
  householdId: string;
  memberId: string;
  displayName: string;
  color: ProfileColorId;
  version: number;
}

export type SaveProfileResult =
  { kind: 'created' | 'updated'; profile: Profile } | { kind: 'conflict'; profile: Profile | null };

export interface BootstrapInput {
  sub: string;
  username: string;
  idempotencyKey: string;
  name: string;
  timezone: string;
}

export type BootstrapResult =
  | { kind: 'created' | 'replayed'; membership: CurrentMembership }
  | { kind: 'already-member' }
  | { kind: 'idempotency-conflict' };

export interface HouseholdRepository {
  resolveMembership(sub: string, tokenIssuedAt?: number): Promise<MembershipResolution>;
  bootstrap(input: BootstrapInput): Promise<BootstrapResult>;
  getProfile(householdId: string, memberId: string): Promise<Profile | null>;
  saveProfile(input: SaveProfileInput): Promise<SaveProfileResult>;
  listFamilyMembers(householdId: string): Promise<FamilyDirectoryMember[]>;
}
