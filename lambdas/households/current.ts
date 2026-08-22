import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { authenticateRequest } from '../shared/auth';
import { handleObservedRequest } from '../shared/request';
import { json, unauthorizedResponse } from '../shared/responses';
import type { TokenVerifier } from '../session/verifier';
import type { HouseholdRepository } from './model';
import { getHouseholdRepository } from './runtime';

const CURRENT_MEMBERSHIP_ROUTE = '/api/v1/memberships/current';

export interface CurrentHandlerDependencies {
  repository: HouseholdRepository;
  verifier?: TokenVerifier;
}

export async function handler(
  event: APIGatewayProxyEventV2,
  dependencies?: CurrentHandlerDependencies,
): Promise<APIGatewayProxyStructuredResultV2> {
  return handleObservedRequest(event, CURRENT_MEMBERSHIP_ROUTE, async (requestId) => {
    const identity = await authenticateRequest(event, dependencies?.verifier);
    if (!identity) return unauthorizedResponse(requestId);

    const repository = dependencies?.repository ?? getHouseholdRepository();
    const membership = await repository.getCurrentMembership(identity.sub, identity.issuedAt);
    return json(200, { membership });
  });
}
