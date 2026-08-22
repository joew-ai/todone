export interface CurrentMembership {
  memberId: string;
  username: string;
  role: 'parent' | 'child';
  household: { householdId: string; name: string; timezone: string };
}

export interface MembershipResponse {
  membership: CurrentMembership | null;
}

export type HouseholdResult =
  | { kind: 'success'; data: MembershipResponse }
  | {
      kind: 'error';
      message: string;
      recoverable: boolean;
      fieldErrors?: Array<{ field: 'name' | 'timezone'; message: string }>;
    };

export async function fetchCurrentMembership(
  idToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<HouseholdResult> {
  return request(
    HouseholdApiRoute.currentMembership,
    idToken,
    { method: HTTP_METHOD.get },
    fetchImpl,
  );
}

export async function createHousehold(
  idToken: string,
  input: { name: string; timezone: string; idempotencyKey: string },
  fetchImpl: typeof fetch = fetch,
): Promise<HouseholdResult> {
  return request(
    HouseholdApiRoute.households,
    idToken,
    {
      method: HTTP_METHOD.post,
      headers: {
        [HttpHeader.contentType]: APPLICATION_JSON,
        [HttpHeader.idempotencyKey]: input.idempotencyKey,
      },
      body: JSON.stringify({ name: input.name, timezone: input.timezone }),
    },
    fetchImpl,
  );
}

async function request(
  url: string,
  idToken: string,
  init: RequestInit,
  fetchImpl: typeof fetch,
): Promise<HouseholdResult> {
  try {
    const response = await fetchImpl(url, {
      ...init,
      headers: {
        [HttpHeader.accept]: APPLICATION_JSON,
        [HttpHeader.authorization]: `Bearer ${idToken}`,
        ...init.headers,
      },
      cache: NO_STORE,
    });
    const body = (await response.json().catch(() => null)) as {
      membership?: CurrentMembership | null;
      error?: {
        message?: string;
        fieldErrors?: Array<{ field: 'name' | 'timezone'; message: string }>;
      };
    };
    if (response.ok && body && 'membership' in body) {
      return { kind: 'success', data: { membership: body.membership ?? null } };
    }
    return {
      kind: 'error',
      message:
        response.status === 401
          ? messages.householdClient.sessionEnded
          : (body.error?.message ?? messages.householdClient.requestFailed),
      recoverable: response.status !== 401,
      fieldErrors: body.error?.fieldErrors,
    };
  } catch {
    return {
      kind: 'error',
      message: messages.generic.networkError,
      recoverable: true,
    };
  }
}
import { messages } from '../i18n/messages';

const HouseholdApiRoute = {
  currentMembership: '/api/v1/memberships/current',
  households: '/api/v1/households',
} as const;
const HttpHeader = {
  accept: 'accept',
  authorization: 'authorization',
  contentType: 'content-type',
  idempotencyKey: 'idempotency-key',
} as const;
const APPLICATION_JSON = 'application/json';
const HTTP_METHOD = { get: 'GET', post: 'POST' } as const;
const NO_STORE = 'no-store';
