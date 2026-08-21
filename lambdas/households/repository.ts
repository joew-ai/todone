import { createHash, randomUUID } from 'node:crypto';
import {
  DynamoDBClient,
  GetItemCommand,
  TransactWriteItemsCommand,
  TransactionCanceledException,
  type AttributeValue,
} from '@aws-sdk/client-dynamodb';
import { ATTRIBUTE_DOES_NOT_EXIST, HouseholdRole, INITIAL_HOUSEHOLD_VERSION } from './constants';
import {
  bootstrapReplayKey,
  householdKey,
  householdMemberKey,
  inMemoryReplayKey,
  membershipLookupKey,
  type HouseholdStorageKey,
} from './keys';
import type {
  BootstrapInput,
  BootstrapResult,
  CurrentMembership,
  HouseholdRepository,
  MembershipRole,
} from './model';

interface StoredMembership extends CurrentMembership {
  sub: string;
}

export class DynamoHouseholdRepository implements HouseholdRepository {
  constructor(
    private readonly tableName: string,
    private readonly client = new DynamoDBClient({}),
    private readonly now = () => new Date(),
    private readonly id = randomUUID,
  ) {}

  async getCurrentMembership(sub: string): Promise<CurrentMembership | null> {
    const lookup = await this.getItem(membershipLookupKey(sub));
    if (!lookup || !booleanAttributeValue(lookup.active)) return null;
    const householdId = requiredStringAttribute(lookup.householdId);
    const household = await this.getItem(householdKey(householdId));
    return household ? membershipFromStoredItems(lookup, household) : null;
  }

  async bootstrap(input: BootstrapInput): Promise<BootstrapResult> {
    const inputHash = hashInput(input.name, input.timezone);
    const replay = await this.readReplay(input.sub, input.idempotencyKey, inputHash);
    if (replay) return replay;

    const householdId = this.id();
    const memberId = this.id();
    const createdAt = this.now().toISOString();
    const membership = currentMembership({
      householdId,
      memberId,
      name: input.name,
      timezone: input.timezone,
    });
    try {
      await this.client.send(
        new TransactWriteItemsCommand({
          TransactItems: [
            putItem(
              this.tableName,
              membershipLookupItem(input.sub, householdId, memberId),
              ATTRIBUTE_DOES_NOT_EXIST,
            ),
            putItem(this.tableName, householdItem(householdId, input, createdAt)),
            putItem(
              this.tableName,
              householdMemberItem(householdId, memberId, input.sub, createdAt),
            ),
            putItem(
              this.tableName,
              bootstrapReplayItem(input, inputHash, householdId, memberId),
              ATTRIBUTE_DOES_NOT_EXIST,
            ),
          ],
        }),
      );
      return { kind: 'created', membership };
    } catch (error) {
      if (!(error instanceof TransactionCanceledException)) throw error;
      const replayAfterConflict = await this.readReplay(input.sub, input.idempotencyKey, inputHash);
      if (replayAfterConflict) return replayAfterConflict;
      return (await this.getCurrentMembership(input.sub))
        ? { kind: 'already-member' }
        : { kind: 'idempotency-conflict' };
    }
  }

  private async readReplay(
    sub: string,
    idempotencyKey: string,
    inputHash: string,
  ): Promise<BootstrapResult | null> {
    const item = await this.getItem(bootstrapReplayKey(sub, idempotencyKey));
    if (!item) return null;
    if (requiredStringAttribute(item.inputHash) !== inputHash)
      return { kind: 'idempotency-conflict' };
    return { kind: 'replayed', membership: membershipFromReplayItem(item) };
  }

  private async getItem(key: HouseholdStorageKey): Promise<Record<string, AttributeValue> | null> {
    const result = await this.client.send(
      new GetItemCommand({
        TableName: this.tableName,
        Key: { pk: stringAttribute(key.pk), sk: stringAttribute(key.sk) },
        ConsistentRead: true,
      }),
    );
    return result.Item ?? null;
  }
}

export class InMemoryHouseholdRepository implements HouseholdRepository {
  private readonly memberships = new Map<string, StoredMembership>();
  private readonly replays = new Map<string, { hash: string; membership: CurrentMembership }>();
  constructor(private readonly id = randomUUID) {}

  async getCurrentMembership(sub: string): Promise<CurrentMembership | null> {
    const stored = this.memberships.get(sub);
    if (!stored) return null;
    const { sub: ignoredSub, ...membership } = stored;
    void ignoredSub;
    return structuredClone(membership);
  }

  async bootstrap(input: BootstrapInput): Promise<BootstrapResult> {
    const replayKey = inMemoryReplayKey(input.sub, input.idempotencyKey);
    const inputHash = hashInput(input.name, input.timezone);
    const replay = this.replays.get(replayKey);
    if (replay) {
      return replay.hash === inputHash
        ? { kind: 'replayed', membership: structuredClone(replay.membership) }
        : { kind: 'idempotency-conflict' };
    }
    if (this.memberships.has(input.sub)) return { kind: 'already-member' };

    const membership = currentMembership({
      memberId: this.id(),
      householdId: this.id(),
      name: input.name,
      timezone: input.timezone,
    });
    this.memberships.set(input.sub, { ...structuredClone(membership), sub: input.sub });
    this.replays.set(replayKey, { hash: inputHash, membership: structuredClone(membership) });
    return { kind: 'created', membership };
  }
}

function currentMembership(input: {
  memberId: string;
  householdId: string;
  name: string;
  timezone: string;
}): CurrentMembership {
  return {
    memberId: input.memberId,
    role: HouseholdRole.parent,
    household: { householdId: input.householdId, name: input.name, timezone: input.timezone },
  };
}

function membershipLookupItem(sub: string, householdId: string, memberId: string) {
  const key = membershipLookupKey(sub);
  return {
    pk: stringAttribute(key.pk),
    sk: stringAttribute(key.sk),
    householdId: stringAttribute(householdId),
    memberId: stringAttribute(memberId),
    role: stringAttribute(HouseholdRole.parent),
    active: booleanAttribute(true),
  };
}

function householdItem(householdId: string, input: BootstrapInput, createdAt: string) {
  const key = householdKey(householdId);
  return {
    pk: stringAttribute(key.pk),
    sk: stringAttribute(key.sk),
    householdId: stringAttribute(householdId),
    name: stringAttribute(input.name),
    timezone: stringAttribute(input.timezone),
    createdAt: stringAttribute(createdAt),
    // Future household updates use this as their optimistic-concurrency version.
    version: numberAttribute(INITIAL_HOUSEHOLD_VERSION),
  };
}

function householdMemberItem(
  householdId: string,
  memberId: string,
  sub: string,
  createdAt: string,
) {
  const key = householdMemberKey(householdId, memberId);
  return {
    pk: stringAttribute(key.pk),
    sk: stringAttribute(key.sk),
    memberId: stringAttribute(memberId),
    sub: stringAttribute(sub),
    role: stringAttribute(HouseholdRole.parent),
    active: booleanAttribute(true),
    createdAt: stringAttribute(createdAt),
  };
}

function bootstrapReplayItem(
  input: BootstrapInput,
  inputHash: string,
  householdId: string,
  memberId: string,
) {
  const key = bootstrapReplayKey(input.sub, input.idempotencyKey);
  return {
    pk: stringAttribute(key.pk),
    sk: stringAttribute(key.sk),
    inputHash: stringAttribute(inputHash),
    householdId: stringAttribute(householdId),
    memberId: stringAttribute(memberId),
    name: stringAttribute(input.name),
    timezone: stringAttribute(input.timezone),
  };
}

function membershipFromStoredItems(
  lookup: Record<string, AttributeValue>,
  household: Record<string, AttributeValue>,
): CurrentMembership {
  return {
    memberId: requiredStringAttribute(lookup.memberId),
    role: requiredMembershipRole(lookup.role),
    household: {
      householdId: requiredStringAttribute(lookup.householdId),
      name: requiredStringAttribute(household.name),
      timezone: requiredStringAttribute(household.timezone),
    },
  };
}

function membershipFromReplayItem(item: Record<string, AttributeValue>): CurrentMembership {
  return currentMembership({
    memberId: requiredStringAttribute(item.memberId),
    householdId: requiredStringAttribute(item.householdId),
    name: requiredStringAttribute(item.name),
    timezone: requiredStringAttribute(item.timezone),
  });
}

function putItem(
  tableName: string,
  item: Record<string, AttributeValue>,
  conditionExpression?: string,
) {
  return {
    Put: {
      TableName: tableName,
      Item: item,
      ...(conditionExpression ? { ConditionExpression: conditionExpression } : {}),
    },
  };
}
function stringAttribute(value: string): AttributeValue {
  return { S: value };
}
function numberAttribute(value: number): AttributeValue {
  return { N: String(value) };
}
function booleanAttribute(value: boolean): AttributeValue {
  return { BOOL: value };
}
function booleanAttributeValue(value: AttributeValue | undefined): boolean {
  return Boolean(value && 'BOOL' in value && value.BOOL);
}
function requiredStringAttribute(value: AttributeValue | undefined): string {
  if (!value || !('S' in value) || !value.S) throw new Error('Stored household record is invalid.');
  return value.S;
}
function requiredMembershipRole(value: AttributeValue | undefined): MembershipRole {
  const role = requiredStringAttribute(value);
  if (role !== HouseholdRole.parent && role !== HouseholdRole.child)
    throw new Error('Stored role is invalid.');
  return role;
}
function hashInput(name: string, timezone: string): string {
  return createHash('sha256').update(JSON.stringify({ name, timezone })).digest('hex');
}
