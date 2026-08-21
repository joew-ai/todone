import { createHash, timingSafeEqual } from 'node:crypto';
import type { PreSignUpTriggerEvent } from 'aws-lambda';

const HASH_PATTERN = /^[a-f0-9]{64}$/;

/**
 * Reusable deployment registration gate. Cognito validationData is temporary:
 * it is neither a user attribute nor application data. This handler never logs
 * the submitted value, configured digest, identity attributes, or raw event.
 */
export async function handler(event: PreSignUpTriggerEvent): Promise<PreSignUpTriggerEvent> {
  const configuredHash = process.env.REGISTRATION_GATE_PASSWORD_HASH?.trim() ?? '';
  if (!HASH_PATTERN.test(configuredHash)) {
    throw new Error('REGISTRATION_CLOSED');
  }

  const submitted = event.request.validationData?.registrationGatePassword;
  if (typeof submitted !== 'string' || submitted.length === 0) {
    throw new Error('INVALID_REGISTRATION_GATE');
  }

  const actualHash = createHash('sha256').update(submitted, 'utf8').digest();
  const expectedHash = Buffer.from(configuredHash, 'hex');
  if (expectedHash.length !== actualHash.length || !timingSafeEqual(actualHash, expectedHash)) {
    throw new Error('INVALID_REGISTRATION_GATE');
  }

  event.response.autoConfirmUser = false;
  event.response.autoVerifyEmail = false;
  event.response.autoVerifyPhone = false;
  return event;
}
