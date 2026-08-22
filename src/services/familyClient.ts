import type { ProfileColorId } from '../../shared/profilePalette';
import { messages } from '../i18n/messages';
import { fetchAuthenticatedJson, HttpMethod } from './apiClient';

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

const FamilyApiRoute = { members: '/api/v1/family-members' } as const;

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
