import { describe, expect, it } from 'vitest';
import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { handler as createHousehold } from '../../../lambdas/households/create';
import { handler as currentMembership } from '../../../lambdas/households/current';
import { isResourceInHousehold } from '../../../lambdas/households/authorization';
import { InMemoryHouseholdRepository } from '../../../lambdas/households/repository';

function event(method: 'GET' | 'POST', sub = 'sub-one', body?: unknown, key = 'request-one') {
  return {
    version: '2.0',
    routeKey: `${method} /api/v1/households`,
    rawPath: '/api/v1/households',
    rawQueryString: '',
    headers: key ? { 'idempotency-key': key } : {},
    body: body === undefined ? undefined : JSON.stringify(body),
    requestContext: {
      requestId: 'safe-request-id',
      http: { method, path: '/', protocol: 'HTTP/1.1', sourceIp: '127.0.0.1', userAgent: 'test' },
      authorizer: { jwt: { claims: { sub, 'cognito:username': 'parent' }, scopes: [] } },
    },
    isBase64Encoded: false,
  } as unknown as APIGatewayProxyEventV2;
}

describe('household bootstrap API and persistence', () => {
  it('returns null for an authenticated unattached account', async () => {
    const repository = new InMemoryHouseholdRepository();
    const response = await currentMembership(event('GET'), { repository });
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body ?? '{}')).toEqual({ membership: null });
  });

  it('atomically creates the household and immutable parent membership', async () => {
    const repository = new InMemoryHouseholdRepository(() => 'generated-id');
    const response = await createHousehold(
      event('POST', 'sub-one', { name: ' River House ', timezone: 'America/Chicago' }),
      { repository },
    );
    expect(response.statusCode).toBe(201);
    expect(JSON.parse(response.body ?? '{}').membership).toEqual({
      memberId: 'generated-id',
      role: 'parent',
      household: { householdId: 'generated-id', name: 'River House', timezone: 'America/Chicago' },
    });
    expect(await repository.getCurrentMembership('sub-one')).toMatchObject({ role: 'parent' });
  });

  it('replays the same idempotent request but rejects changed input and a second bootstrap', async () => {
    const repository = new InMemoryHouseholdRepository();
    const firstEvent = event('POST', 'sub-one', {
      name: 'River House',
      timezone: 'America/Chicago',
    });
    const first = await createHousehold(firstEvent, { repository });
    const replay = await createHousehold(firstEvent, { repository });
    const changed = await createHousehold(
      event('POST', 'sub-one', { name: 'Other House', timezone: 'America/Chicago' }),
      { repository },
    );
    const second = await createHousehold(
      event('POST', 'sub-one', { name: 'River House', timezone: 'America/Chicago' }, 'request-two'),
      { repository },
    );
    expect(first.statusCode).toBe(201);
    expect(replay.statusCode).toBe(200);
    expect(replay.body).toBe(first.body);
    expect(changed.statusCode).toBe(409);
    expect(second.statusCode).toBe(409);
  });

  it('allows different unattached users to create separate households under concurrent calls', async () => {
    let nextId = 0;
    const repository = new InMemoryHouseholdRepository(() => `id-${++nextId}`);
    const body = { name: 'River House', timezone: 'America/Chicago' };
    const [one, two] = await Promise.all([
      createHousehold(event('POST', 'sub-one', body, 'one'), { repository }),
      createHousehold(event('POST', 'sub-two', body, 'two'), { repository }),
    ]);
    expect(one.statusCode).toBe(201);
    expect(two.statusCode).toBe(201);
    expect((await repository.getCurrentMembership('sub-one'))?.household.householdId).not.toBe(
      (await repository.getCurrentMembership('sub-two'))?.household.householdId,
    );
  });

  it('rejects invalid fields and public join/role attempts without a write', async () => {
    const repository = new InMemoryHouseholdRepository();
    const response = await createHousehold(
      event('POST', 'sub-one', {
        name: '',
        timezone: 'invalid',
        householdId: 'target',
        role: 'parent',
      }),
      { repository },
    );
    expect(response.statusCode).toBe(422);
    expect(await repository.getCurrentMembership('sub-one')).toBeNull();
    expect(response.body).not.toContain('target');
  });

  it('denies missing authentication before touching membership data', async () => {
    const repository = new InMemoryHouseholdRepository();
    const unauthenticated = event('GET');
    delete (unauthenticated.requestContext as { authorizer?: unknown }).authorizer;
    const response = await currentMembership(unauthenticated, {
      repository,
      verifier: {
        verify: async () => {
          throw new Error('invalid');
        },
      },
    });
    expect(response.statusCode).toBe(401);
  });

  it('does not let a valid member authorize a resource from another household', async () => {
    const repository = new InMemoryHouseholdRepository();
    await repository.bootstrap({
      sub: 'sub-one',
      idempotencyKey: 'one',
      name: 'One',
      timezone: 'America/Chicago',
    });
    const membership = await repository.getCurrentMembership('sub-one');
    expect(membership).not.toBeNull();
    expect(isResourceInHousehold(membership!, membership!.household.householdId)).toBe(true);
    expect(isResourceInHousehold(membership!, 'another-household')).toBe(false);
  });
});
