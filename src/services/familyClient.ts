import type { ProfileColorId } from '../../shared/profilePalette';
import { messages } from '../i18n/messages';
import { APPLICATION_JSON, fetchAuthenticatedJson, HttpHeader, HttpMethod } from './apiClient';

export type FamilyMemberRole = 'parent' | 'child';
export type FamilyMemberState = 'ACTIVE' | 'PENDING_ACTIVATION';
export type PendingParentAction =
  'RESEND_WELCOME' | 'CHANGE_EMAIL_AND_RESEND' | 'CANCEL_PENDING_ACCOUNT';

export interface FamilyMember {
  memberId: string;
  username: string;
  role: FamilyMemberRole;
  activationState: FamilyMemberState;
  displayName: string;
  color: ProfileColorId;
  allowedActions: PendingParentAction[];
}

export type FamilyDirectoryResult =
  | { kind: 'success'; data: { members: FamilyMember[] } }
  | { kind: 'error'; message: string; recoverable: boolean };

export interface CreateChildInput {
  username: string;
  displayName: string;
  color: ProfileColorId;
  password: string;
  idempotencyKey: string;
}

export type CreateChildResult =
  | { kind: 'success'; data: { member: FamilyMember } }
  | {
      kind: 'error';
      message: string;
      recoverable: boolean;
      fieldErrors?: Array<{ field: string; code: string; message: string }>;
    };

const FamilyApiRoute = {
  members: '/api/v1/family-members',
  children: '/api/v1/family-members/children',
} as const;

/** Reads the authenticated caller's safe household directory; no target IDs are accepted. */
export async function fetchFamilyMembers(
  idToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<FamilyDirectoryResult> {
  try {
    const { response, body } = await fetchAuthenticatedJson<{
      members?: FamilyMember[];
      error?: { message?: string };
    }>(FamilyApiRoute.members, idToken, { method: HttpMethod.get }, fetchImpl);
    if (response.ok && body?.members) return { kind: 'success', data: { members: body.members } };
    return {
      kind: 'error',
      message:
        response.status === 401
          ? messages.familyClient.sessionEnded
          : (body?.error?.message ?? messages.familyClient.requestFailed),
      recoverable: response.status !== 401,
    };
  } catch {
    return { kind: 'error', message: messages.generic.networkError, recoverable: true };
  }
}

/** Sends a child password only in this immediate non-cacheable request. */
export async function createChild(
  idToken: string,
  input: CreateChildInput,
  fetchImpl: typeof fetch = fetch,
): Promise<CreateChildResult> {
  try {
    const { response, body } = await fetchAuthenticatedJson<{
      member?: FamilyMember;
      error?: {
        message?: string;
        fieldErrors?: Array<{ field: string; code: string; message: string }>;
      };
    }>(
      FamilyApiRoute.children,
      idToken,
      {
        method: HttpMethod.post,
        headers: {
          [HttpHeader.contentType]: APPLICATION_JSON,
          [HttpHeader.idempotencyKey]: input.idempotencyKey,
        },
        body: JSON.stringify({
          username: input.username,
          displayName: input.displayName,
          color: input.color,
          password: input.password,
        }),
      },
      fetchImpl,
    );
    if (response.ok && body?.member) return { kind: 'success', data: { member: body.member } };
    return {
      kind: 'error',
      message: body?.error?.message ?? messages.familyClient.requestFailed,
      recoverable: response.status !== 401 && response.status < 500,
      ...(body?.error?.fieldErrors ? { fieldErrors: body.error.fieldErrors } : {}),
    };
  } catch {
    return { kind: 'error', message: messages.generic.networkError, recoverable: true };
  }
}
