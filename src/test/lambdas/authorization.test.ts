import { describe, expect, it } from 'vitest';
import { isManageableChild, requireActiveParent } from '../../../lambdas/households/authorization';
import { MembershipRecordRepository } from '../helpers/membershipRecordRepository';
import type {
  CurrentMembership,
  FamilyDirectoryMember,
  Household,
  Membership,
  MembershipLookup,
} from '../../../lambdas/households/model';

const parent: CurrentMembership = {
  memberId: 'parent',
  username: 'parent',
  role: 'parent',
  household: { householdId: 'house', name: 'House', timezone: 'America/Chicago' },
};

const child: CurrentMembership = { ...parent, memberId: 'child', role: 'child' };

function member(overrides: Partial<FamilyDirectoryMember>): FamilyDirectoryMember {
  return {
    memberId: 'target',
    username: 'target',
    role: 'child',
    activationState: 'ACTIVE',
    displayName: 'Target',
    color: 'PINE',
    ...overrides,
  };
}

describe('parent target authorization', () => {
  it('allows only an active child target in the caller household context', () => {
    expect(isManageableChild(parent, member({}), 'house')).toBe(true);
    expect(isManageableChild(parent, member({ role: 'parent' }), 'house')).toBe(false);
    expect(
      isManageableChild(parent, member({ activationState: 'PENDING_ACTIVATION' }), 'house'),
    ).toBe(false);
    expect(isManageableChild(parent, member({ activationState: 'INACTIVE' }), 'house')).toBe(false);
    expect(isManageableChild(parent, member({}), 'other-house')).toBe(false);
    expect(isManageableChild(child, member({}), 'house')).toBe(false);
  });

  it.each(['PENDING_ACTIVATION', 'INACTIVE'] as const)(
    'rejects a %s caller before target authorization',
    async (activationState) => {
      const household: Household = {
        householdId: 'house',
        name: 'House',
        timezone: 'America/Chicago',
        createdAt: '2026-08-23T00:00:00.000Z',
        version: 1,
      };
      const lookup: MembershipLookup = {
        householdId: household.householdId,
        memberId: 'parent',
        username: 'parent',
        role: 'parent',
        activationState,
        createdAt: household.createdAt,
      };
      const membership: Membership = {
        householdId: household.householdId,
        memberId: lookup.memberId,
        sub: 'parent-sub',
        username: lookup.username,
        role: lookup.role,
        activationState,
        createdAt: household.createdAt,
      };
      const repository = new MembershipRecordRepository('parent-sub', {
        lookup,
        household,
        membership,
      });

      await expect(requireActiveParent(repository, 'parent-sub', 1800000000)).resolves.toBeNull();
    },
  );
});
