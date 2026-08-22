import { describe, expect, it } from 'vitest';
import { isManageableChild } from '../../../lambdas/households/authorization';
import type { CurrentMembership, FamilyDirectoryMember } from '../../../lambdas/households/model';

const parent: CurrentMembership = {
  memberId: 'parent',
  username: 'parent',
  role: 'parent',
  household: { householdId: 'house', name: 'House', timezone: 'America/Chicago' },
};

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
  });
});
