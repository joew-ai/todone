import { GetItemCommand, type AttributeValue, type DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { describe, expect, it } from 'vitest';
import { DynamoHouseholdRepository } from '../../../lambdas/households/repository';

const createdAt = '2026-08-23T00:00:00.000Z';

function string(value: string): AttributeValue {
  return { S: value };
}

function number(value: number): AttributeValue {
  return { N: String(value) };
}

function itemKey(pk: string, sk: string): string {
  return `${pk}\0${sk}`;
}

function records(overrides?: {
  lookup?: Record<string, AttributeValue>;
  household?: Record<string, AttributeValue>;
  membership?: Record<string, AttributeValue>;
}) {
  return new Map<string, Record<string, AttributeValue>>([
    [
      itemKey('USER#sub-one', 'MEMBERSHIP'),
      {
        householdId: string('house-one'),
        memberId: string('member-one'),
        username: string('parent-one'),
        role: string('parent'),
        activationState: string('ACTIVE'),
        createdAt: string(createdAt),
        ...overrides?.lookup,
      },
    ],
    [
      itemKey('HOUSEHOLD#house-one', 'HOUSEHOLD'),
      {
        householdId: string('house-one'),
        name: string('River House'),
        timezone: string('America/Chicago'),
        createdAt: string(createdAt),
        version: number(1),
        ...overrides?.household,
      },
    ],
    [
      itemKey('HOUSEHOLD#house-one', 'MEMBER#member-one'),
      {
        memberId: string('member-one'),
        sub: string('sub-one'),
        username: string('parent-one'),
        role: string('parent'),
        activationState: string('ACTIVE'),
        createdAt: string(createdAt),
        ...overrides?.membership,
      },
    ],
  ]);
}

function repositoryWithRecords(items: Map<string, Record<string, AttributeValue>>) {
  const client = {
    async send(command: unknown) {
      if (!(command instanceof GetItemCommand)) throw new Error('Unexpected DynamoDB command.');
      const key = command.input.Key;
      const pk = key?.pk?.S;
      const sk = key?.sk?.S;
      if (!pk || !sk) throw new Error('Expected a complete DynamoDB key.');
      return { Item: items.get(itemKey(pk, sk)) };
    },
  } as unknown as DynamoDBClient;
  return new DynamoHouseholdRepository('households', client);
}

describe('DynamoDB Membership resolution', () => {
  it('accepts only a consistent active lookup, Household, and Membership', async () => {
    await expect(
      repositoryWithRecords(records()).resolveMembership('sub-one', 1800000000),
    ).resolves.toMatchObject({
      kind: 'active',
      membership: { household: { householdId: 'house-one' }, memberId: 'member-one' },
    });
  });

  it.each([
    ['missing Member', records({ membership: { sub: string('other-sub') } })],
    ['malformed Membership role', records({ membership: { role: string('not-a-role') } })],
    ['inconsistent username', records({ membership: { username: string('other-parent') } })],
  ])('fails closed for a %s record', async (_name, items) => {
    await expect(
      repositoryWithRecords(items).resolveMembership('sub-one', 1800000000),
    ).resolves.toEqual({
      kind: 'inconsistent',
    });
  });

  it('applies the credentials cutoff from the lookup record', async () => {
    const items = records({
      lookup: { credentialsValidAfter: string('2028-01-01T00:00:00.000Z') },
    });
    await expect(
      repositoryWithRecords(items).resolveMembership('sub-one', 1800000000),
    ).resolves.toEqual({
      kind: 'credentials-stale',
    });
  });
});
