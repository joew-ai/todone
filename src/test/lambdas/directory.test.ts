import { describe, expect, it } from 'vitest';
import { directoryForCaller } from '../../../lambdas/households/directory';
import type { CurrentMembership, FamilyDirectoryMember } from '../../../lambdas/households/model';

const parent: CurrentMembership = {
  memberId: 'parent',
  username: 'parent',
  role: 'parent',
  household: { householdId: 'house', name: 'River House', timezone: 'America/Chicago' },
};
const child: CurrentMembership = { ...parent, memberId: 'child', username: 'child', role: 'child' };
const members: FamilyDirectoryMember[] = [
  {
    memberId: 'active',
    username: 'active',
    role: 'child',
    activationState: 'ACTIVE',
    displayName: 'Active Child',
    color: 'PINE',
  },
  {
    memberId: 'pending',
    username: 'pending',
    role: 'parent',
    activationState: 'PENDING_ACTIVATION',
    displayName: 'Pending Parent',
    color: 'LAKE',
  },
  {
    memberId: 'inactive',
    username: 'inactive',
    role: 'child',
    activationState: 'INACTIVE',
    displayName: 'Inactive Child',
    color: 'DUSK',
  },
];

describe('family directory visibility', () => {
  it('gives active parents the three pending-parent actions but never returns inactive members', () => {
    expect(directoryForCaller(parent, members)).toEqual([
      expect.objectContaining({ memberId: 'active', allowedActions: [] }),
      expect.objectContaining({
        memberId: 'pending',
        allowedActions: ['RESEND_WELCOME', 'CHANGE_EMAIL_AND_RESEND', 'CANCEL_PENDING_ACCOUNT'],
      }),
    ]);
  });

  it('returns active members only to a child', () => {
    expect(directoryForCaller(child, members)).toEqual([
      expect.objectContaining({ memberId: 'active', allowedActions: [] }),
    ]);
  });
});
