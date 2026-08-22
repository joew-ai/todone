import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { authenticateRequest } from '../shared/auth';
import { handleObservedRequest } from '../shared/request';
import {
  errorResponse,
  invalidJsonResponse,
  json,
  unauthorizedResponse,
  validationFailedResponse,
} from '../shared/responses';
import type { TokenVerifier } from '../session/verifier';
import { HouseholdErrorCode, MAX_IDEMPOTENCY_KEY_LENGTH } from './constants';
import { isValidUsername, normalizeUsername, usernameValidationMessage } from './familyValidation';
import type { HouseholdRepository } from './model';
import { getHouseholdRepository } from './runtime';
import { validateHouseholdInput } from './validation';

const HOUSEHOLDS_ROUTE = '/api/v1/households';
const IDEMPOTENCY_KEY_HEADER = 'idempotency-key';

export interface CreateHandlerDependencies {
  repository: HouseholdRepository;
  verifier?: TokenVerifier;
}

export async function handler(
  event: APIGatewayProxyEventV2,
  dependencies?: CreateHandlerDependencies,
): Promise<APIGatewayProxyStructuredResultV2> {
  return handleObservedRequest(event, HOUSEHOLDS_ROUTE, async (requestId) => {
    const identity = await authenticateRequest(event, dependencies?.verifier);
    if (!identity) return unauthorizedResponse(requestId);

    const idempotencyKey = header(event, IDEMPOTENCY_KEY_HEADER);
    if (!idempotencyKey || idempotencyKey.length > MAX_IDEMPOTENCY_KEY_LENGTH) {
      return errorResponse(
        400,
        HouseholdErrorCode.invalidIdempotencyKey,
        'The idempotency key is invalid.',
        requestId,
      );
    }

    let body: unknown;
    try {
      body = JSON.parse(event.body ?? '');
    } catch {
      return invalidJsonResponse(requestId);
    }
    const validation = validateHouseholdInput(body);
    if (validation.kind === 'invalid')
      return validationFailedResponse(requestId, validation.fieldErrors);

    const repository = dependencies?.repository ?? getHouseholdRepository();
    const username = normalizeUsername(identity.username);
    if (!isValidUsername(username)) {
      return validationFailedResponse(requestId, [
        {
          field: 'username',
          code: HouseholdErrorCode.invalidUsername,
          message: usernameValidationMessage(),
        },
      ]);
    }
    const result = await repository.bootstrap({
      sub: identity.sub,
      username,
      idempotencyKey,
      ...validation.value,
    });
    if (result.kind === 'already-member') {
      return errorResponse(
        409,
        HouseholdErrorCode.membershipExists,
        'A household membership already exists for this account.',
        requestId,
      );
    }
    if (result.kind === 'idempotency-conflict') {
      return errorResponse(
        409,
        HouseholdErrorCode.idempotencyConflict,
        'The idempotency key was already used with different input.',
        requestId,
      );
    }
    return json(result.kind === 'created' ? 201 : 200, { membership: result.membership });
  });
}

function header(event: APIGatewayProxyEventV2, name: string): string | undefined {
  const entry = Object.entries(event.headers ?? {}).find(([key]) => key.toLowerCase() === name);
  return entry?.[1];
}
