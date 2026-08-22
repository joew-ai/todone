import { createHash } from 'node:crypto';
import type { PreSignUpTriggerEvent } from 'aws-lambda';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { handler, preSignUpPolicy } from '../../../lambdas/pre-signup/index';

function event(
  password?: string,
  triggerSource: PreSignUpTriggerEvent['triggerSource'] = 'PreSignUp_SignUp',
): PreSignUpTriggerEvent {
  return {
    version: '1',
    region: 'us-east-1',
    userPoolId: 'pool',
    userName: 'parent',
    callerContext: { awsSdkVersion: 'test', clientId: 'client' },
    triggerSource,
    request: {
      userAttributes: { email: 'private@example.invalid' },
      validationData: password === undefined ? undefined : { registrationGatePassword: password },
      clientMetadata: undefined,
    },
    response: { autoConfirmUser: false, autoVerifyEmail: false, autoVerifyPhone: false },
  };
}

describe('Cognito pre-signup registration gate', () => {
  afterEach(() => {
    delete process.env.REGISTRATION_GATE_PASSWORD_HASH;
    vi.restoreAllMocks();
  });

  it('accepts the matching digest without auto-confirming or auto-verifying', async () => {
    process.env.REGISTRATION_GATE_PASSWORD_HASH = createHash('sha256')
      .update('gate-value')
      .digest('hex');
    const result = await handler(event('gate-value'));
    expect(result.response).toEqual({
      autoConfirmUser: false,
      autoVerifyEmail: false,
      autoVerifyPhone: false,
    });
  });

  it.each([undefined, '', 'not-a-sha256-digest', 'A'.repeat(64)])(
    'closes registration for missing, empty, or malformed configuration %j',
    async (configured) => {
      if (configured !== undefined) process.env.REGISTRATION_GATE_PASSWORD_HASH = configured;
      await expect(handler(event('gate-value'))).rejects.toThrow('REGISTRATION_CLOSED');
    },
  );

  it.each([undefined, '', 'wrong-value'])(
    'rejects missing or incorrect submitted values',
    async (password) => {
      process.env.REGISTRATION_GATE_PASSWORD_HASH = createHash('sha256')
        .update('gate-value')
        .digest('hex');
      await expect(handler(event(password))).rejects.toThrow('INVALID_REGISTRATION_GATE');
    },
  );

  it('does not log the gate, hash, email, username, or raw event on failure', async () => {
    const log = vi.spyOn(console, 'log');
    const error = vi.spyOn(console, 'error');
    process.env.REGISTRATION_GATE_PASSWORD_HASH = createHash('sha256')
      .update('secret-gate')
      .digest('hex');
    await expect(handler(event('wrong-secret'))).rejects.toThrow();
    expect(log).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });

  it('permits independently IAM-authorized administrative creation without an Entry Code', async () => {
    const result = await handler(event(undefined, 'PreSignUp_AdminCreateUser'));

    expect(result.response).toEqual({
      autoConfirmUser: false,
      autoVerifyEmail: false,
      autoVerifyPhone: false,
    });
  });

  it('keeps the public and administrative trigger sources as explicit independent policies', () => {
    expect(preSignUpPolicy('PreSignUp_SignUp')).toBe('require-entry-code');
    expect(preSignUpPolicy('PreSignUp_AdminCreateUser')).toBe('allow-admin');
  });

  it.each(['PreSignUp_ExternalProvider', 'PreSignUp_Unknown'])(
    'fails closed for unexpected source %s',
    async (triggerSource) => {
      await expect(
        handler(event(undefined, triggerSource as PreSignUpTriggerEvent['triggerSource'])),
      ).rejects.toThrow('UNSUPPORTED_PRE_SIGN_UP_SOURCE');
    },
  );
});
