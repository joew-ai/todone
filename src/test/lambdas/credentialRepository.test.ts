import {
  ConditionalCheckFailedException,
  GetItemCommand,
  UpdateItemCommand,
  type DynamoDBClient,
} from '@aws-sdk/client-dynamodb';
import { describe, expect, it, vi } from 'vitest';
import {
  DynamoHouseholdRepository,
  InMemoryHouseholdRepository,
} from '../../../lambdas/households/repository';

const cutoff = '2026-10-19T12:00:00.000Z';

describe('credential cutoff persistence', () => {
  it.each(['missing', 'wrong-household', 'wrong-username'])(
    'rejects a %s target lookup before returning a Cognito target',
    async (state) => {
      const target = {
        memberId: { S: 'child' },
        sub: { S: 'child-sub' },
        username: { S: 'child-one' },
        role: { S: 'child' },
        activationState: { S: 'ACTIVE' },
      };
      const lookup = {
        householdId: { S: state === 'wrong-household' ? 'other' : 'house' },
        memberId: { S: 'child' },
        username: { S: state === 'wrong-username' ? 'other-child' : 'child-one' },
        role: { S: 'child' },
        activationState: { S: 'ACTIVE' },
      };
      const send = vi
        .fn()
        .mockResolvedValueOnce({ Item: target })
        .mockResolvedValueOnce({ Item: state === 'missing' ? undefined : lookup });
      const repository = new DynamoHouseholdRepository('table', {
        send,
      } as unknown as DynamoDBClient);
      await expect(repository.getHouseholdMemberTarget('house', 'child')).rejects.toThrow();
      expect(send.mock.calls.every(([command]) => command.input.ConsistentRead === true)).toBe(
        true,
      );
    },
  );

  it('rejects an in-memory target whose identity lookup now points elsewhere', async () => {
    let id = 0;
    const repository = new InMemoryHouseholdRepository(() => `id-${++id}`);
    await repository.bootstrap({
      sub: 'parent',
      username: 'parent',
      name: 'Home',
      timezone: 'America/Chicago',
      idempotencyKey: 'parent',
    });
    const child = {
      callerSub: 'parent',
      householdId: 'id-1',
      childSub: 'child-sub',
      username: 'child-one',
      displayName: 'Child',
      color: 'PINE' as const,
      idempotencyKey: 'child',
    };
    await repository.provisionChild(child);
    // Model a corrupt overwrite through the persistence boundary, without bypassing authorization.
    await repository.provisionChild({
      ...child,
      householdId: 'other-house',
      idempotencyKey: 'other',
    });
    await expect(repository.getHouseholdMemberTarget('id-1', 'id-3')).rejects.toThrow();
  });

  it('conditionally updates only an existing lookup with a lower cutoff', async () => {
    const send = vi.fn().mockResolvedValue({});
    const repository = new DynamoHouseholdRepository('table', {
      send,
    } as unknown as DynamoDBClient);
    await repository.advanceCredentialsValidAfter('child-sub', cutoff);
    const command = send.mock.calls[0][0] as UpdateItemCommand;
    expect(command).toBeInstanceOf(UpdateItemCommand);
    expect(command.input).toMatchObject({
      Key: { pk: { S: 'USER#child-sub' }, sk: { S: 'MEMBERSHIP' } },
      ConditionExpression:
        'attribute_exists(pk) AND (attribute_not_exists(#credentialsValidAfter) OR #credentialsValidAfter < :cutoff)',
      ExpressionAttributeValues: { ':cutoff': { S: cutoff } },
    });
  });

  it.each([cutoff, '2026-10-20T00:00:00.000Z'])(
    'accepts a concurrent cutoff that is already at least as recent (%s)',
    async (stored) => {
      const send = vi
        .fn()
        .mockRejectedValueOnce(
          new ConditionalCheckFailedException({ $metadata: {}, message: 'condition' }),
        )
        .mockResolvedValueOnce({ Item: { credentialsValidAfter: { S: stored } } });
      const repository = new DynamoHouseholdRepository('table', {
        send,
      } as unknown as DynamoDBClient);
      await expect(
        repository.advanceCredentialsValidAfter('child', cutoff),
      ).resolves.toBeUndefined();
      expect(send.mock.calls[1][0]).toBeInstanceOf(GetItemCommand);
      expect(send.mock.calls[1][0].input.ConsistentRead).toBe(true);
    },
  );

  it.each([undefined, {}, { credentialsValidAfter: { S: '2026-10-18T00:00:00.000Z' } }])(
    'does not claim success after lookup deletion or an unconfirmed cutoff',
    async (Item) => {
      const send = vi
        .fn()
        .mockRejectedValueOnce(
          new ConditionalCheckFailedException({ $metadata: {}, message: 'condition' }),
        )
        .mockResolvedValueOnce({ Item });
      const repository = new DynamoHouseholdRepository('table', {
        send,
      } as unknown as DynamoDBClient);
      await expect(repository.advanceCredentialsValidAfter('child', cutoff)).rejects.toThrow();
    },
  );

  it('keeps the in-memory cutoff monotonic and rejects missing lookups', async () => {
    const repository = new InMemoryHouseholdRepository();
    await repository.bootstrap({
      sub: 'parent',
      username: 'parent',
      name: 'Home',
      timezone: 'America/Chicago',
      idempotencyKey: 'one',
    });
    await repository.advanceCredentialsValidAfter('parent', cutoff);
    await repository.advanceCredentialsValidAfter('parent', '2026-10-18T00:00:00.000Z');
    await expect(
      repository.resolveMembership('parent', Date.parse(cutoff) / 1000),
    ).resolves.toEqual({ kind: 'credentials-stale' });
    await expect(
      repository.resolveMembership('parent', Date.parse(cutoff) / 1000 + 1),
    ).resolves.toMatchObject({ kind: 'active' });
    await expect(repository.advanceCredentialsValidAfter('missing', cutoff)).rejects.toThrow();
  });
});
