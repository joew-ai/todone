import { createHash, timingSafeEqual } from 'node:crypto';
import type { PreSignUpTriggerEvent } from 'aws-lambda';

const HASH_PATTERN = /^[a-f0-9]{64}$/;

type SupportedTriggerSource = 'PreSignUp_SignUp' | 'PreSignUp_AdminCreateUser';

/**
 * Separates the two Cognito trust paths so their ordering cannot accidentally
 * become an authorization assumption. A public browser SignUp must satisfy
 * the Entry Code gate; AdminCreateUser is independently IAM-authorized and
 * may only be reached through a server-side parent-authorized API.
 */
export function preSignUpPolicy(triggerSource: string): 'require-entry-code' | 'allow-admin' {
  switch (triggerSource as SupportedTriggerSource) {
    case 'PreSignUp_SignUp':
      return 'require-entry-code';
    case 'PreSignUp_AdminCreateUser':
      return 'allow-admin';
    default:
      throw new Error('UNSUPPORTED_PRE_SIGN_UP_SOURCE');
  }
}

/**
 * Reusable deployment registration gate. Cognito validationData is temporary:
 * it is neither a user attribute nor application data. This handler never logs
 * the submitted value, configured digest, identity attributes, or raw event.
 */
export async function handler(event: PreSignUpTriggerEvent): Promise<PreSignUpTriggerEvent> {
  if (preSignUpPolicy(event.triggerSource) === 'allow-admin') {
    return event;
  }

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
