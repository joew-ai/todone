export type MembershipRole = 'parent' | 'child';

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
  role: MembershipRole;
  active: boolean;
  createdAt: string;
}

export interface CurrentMembership {
  memberId: string;
  role: MembershipRole;
  household: Pick<Household, 'householdId' | 'name' | 'timezone'>;
}

export interface BootstrapInput {
  sub: string;
  idempotencyKey: string;
  name: string;
  timezone: string;
}

export type BootstrapResult =
  | { kind: 'created' | 'replayed'; membership: CurrentMembership }
  | { kind: 'already-member' }
  | { kind: 'idempotency-conflict' };

export interface HouseholdRepository {
  getCurrentMembership(sub: string): Promise<CurrentMembership | null>;
  bootstrap(input: BootstrapInput): Promise<BootstrapResult>;
}
