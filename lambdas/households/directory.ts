import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { authenticateRequest } from '../shared/auth';
import { handleObservedRequest } from '../shared/request';
import { HttpStatus, json, unauthorizedResponse } from '../shared/responses';
import type { TokenVerifier } from '../session/verifier';
import { HouseholdRole, MembershipActivationState, PendingParentAction } from './constants';
import type {
  CurrentMembership,
  FamilyDirectoryEntry,
  FamilyDirectoryMember,
  HouseholdRepository,
} from './model';
import { getHouseholdRepository } from './runtime';

const FAMILY_DIRECTORY_ROUTE = '/api/v1/family-members';

export interface DirectoryHandlerDependencies {
  repository: HouseholdRepository;
  verifier?: TokenVerifier;
}

/** API Gateway supplies a Cognito-verified `sub`; it alone selects the caller's household. */
export async function handler(
  event: APIGatewayProxyEventV2,
  dependencies?: DirectoryHandlerDependencies,
): Promise<APIGatewayProxyStructuredResultV2> {
  return handleObservedRequest(event, FAMILY_DIRECTORY_ROUTE, async (requestId) => {
    const identity = await authenticateRequest(event, dependencies?.verifier);
    if (!identity) return unauthorizedResponse(requestId);

    const repository = dependencies?.repository ?? getHouseholdRepository();
    const membership = await repository.getCurrentMembership(identity.sub, identity.issuedAt);
    if (!membership) return unauthorizedResponse(requestId);
    const members = await repository.listFamilyMembers(membership.household.householdId);
    return json(HttpStatus.ok, { members: directoryForCaller(membership, members) });
  });
}

export function directoryForCaller(
  caller: CurrentMembership,
  members: FamilyDirectoryMember[],
): FamilyDirectoryEntry[] {
  return members
    .filter((member) => {
      if (member.activationState === MembershipActivationState.active) return true;
      return (
        caller.role === HouseholdRole.parent &&
        member.activationState === MembershipActivationState.pendingActivation &&
        member.role === HouseholdRole.parent
      );
    })
    .map((member) => ({
      ...member,
      allowedActions:
        member.activationState === MembershipActivationState.pendingActivation
          ? Object.values(PendingParentAction)
          : [],
    }));
}
