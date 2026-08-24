import {
  AdminCreateUserCommand,
  AdminDeleteUserCommand,
  AdminSetUserPasswordCommand,
  AdminUpdateUserAttributesCommand,
  AdminUserGlobalSignOutCommand,
  type CognitoIdentityProviderClient,
} from '@aws-sdk/client-cognito-identity-provider';
import { randomUUID } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import {
  AwsCognitoAdministration,
  CognitoAdministrationError,
  CognitoAdministrationFailure,
  CognitoAdministrationOperation,
  type CognitoAdministration,
  type CreateCognitoUserInput,
  type CreatedCognitoUser,
} from '../../../lambdas/cognito/administration';

class FakeClient {
  readonly commands: unknown[] = [];
  responses: unknown[] = [];

  async send(command: unknown): Promise<unknown> {
    this.commands.push(command);
    const response = this.responses.shift();
    if (response instanceof Error) throw response;
    return response ?? {};
  }
}

function adapter(client: FakeClient): AwsCognitoAdministration {
  return new AwsCognitoAdministration(
    'pool-one',
    client as unknown as CognitoIdentityProviderClient,
  );
}

describe('Cognito administration adapter', () => {
  it('creates a child without delivery and returns only the stable sub', async () => {
    const client = new FakeClient();
    client.responses.push({ User: { Attributes: [{ Name: 'sub', Value: 'sub-one' }] } });

    await expect(
      adapter(client).createUser({ kind: 'child', username: 'child-one' }),
    ).resolves.toEqual({
      sub: 'sub-one',
    });
    const command = client.commands[0];
    expect(command).toBeInstanceOf(AdminCreateUserCommand);
    expect((command as AdminCreateUserCommand).input).toEqual({
      UserPoolId: 'pool-one',
      Username: 'child-one',
      MessageAction: 'SUPPRESS',
    });
  });

  it('creates a pending parent with unverified email and built-in email delivery', async () => {
    const client = new FakeClient();
    client.responses.push({ User: { Attributes: [{ Name: 'sub', Value: 'sub-parent' }] } });

    await adapter(client).createUser({
      kind: 'pending-parent',
      username: 'parent-two',
      email: 'parent@example.test',
    });

    expect((client.commands[0] as AdminCreateUserCommand).input).toEqual({
      UserPoolId: 'pool-one',
      Username: 'parent-two',
      DesiredDeliveryMediums: ['EMAIL'],
      UserAttributes: [
        { Name: 'email', Value: 'parent@example.test' },
        { Name: 'email_verified', Value: 'false' },
      ],
    });
  });

  it('uses the reviewed Cognito commands for all lifecycle operations', async () => {
    const client = new FakeClient();
    const administration = adapter(client);
    const transientPassword = `A1!a${randomUUID()}`;

    await administration.resendWelcome('parent-two');
    await administration.updatePendingParentEmail('parent-two', 'replacement@example.test');
    await administration.markEmailVerified('parent-two');
    await administration.setPermanentPassword('child-one', transientPassword);
    await administration.globalSignOut('child-one');
    await administration.deleteUser('child-one');

    expect(client.commands.map((command) => command.constructor)).toEqual([
      AdminCreateUserCommand,
      AdminUpdateUserAttributesCommand,
      AdminUpdateUserAttributesCommand,
      AdminSetUserPasswordCommand,
      AdminUserGlobalSignOutCommand,
      AdminDeleteUserCommand,
    ]);
    for (const command of client.commands) {
      expect((command as { input: { UserPoolId?: string } }).input.UserPoolId).toBe('pool-one');
    }
    expect((client.commands[0] as AdminCreateUserCommand).input.MessageAction).toBe('RESEND');
    expect((client.commands[1] as AdminUpdateUserAttributesCommand).input.UserAttributes).toEqual([
      { Name: 'email', Value: 'replacement@example.test' },
      { Name: 'email_verified', Value: 'false' },
    ]);
    expect((client.commands[2] as AdminUpdateUserAttributesCommand).input.UserAttributes).toEqual([
      { Name: 'email_verified', Value: 'true' },
    ]);
    expect((client.commands[3] as AdminSetUserPasswordCommand).input).toEqual({
      UserPoolId: 'pool-one',
      Username: 'child-one',
      Password: transientPassword,
      Permanent: true,
    });
  });

  it.each([
    ['UsernameExistsException', CognitoAdministrationFailure.usernameConflict],
    ['AliasExistsException', CognitoAdministrationFailure.identityConflict],
    ['UserNotFoundException', CognitoAdministrationFailure.userNotFound],
    ['InvalidPasswordException', CognitoAdministrationFailure.invalidPassword],
    ['InvalidParameterException', CognitoAdministrationFailure.invalidState],
    ['TooManyRequestsException', CognitoAdministrationFailure.throttled],
    ['InternalErrorException', CognitoAdministrationFailure.unavailable],
    ['UnrecognizedDependencyFailure', CognitoAdministrationFailure.unknown],
  ])('maps %s to the safe %s domain failure', async (name, kind) => {
    const client = new FakeClient();
    const dependencyError = new Error('private@example.test raw AWS detail');
    dependencyError.name = name;
    client.responses.push(dependencyError);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    const result = await adapter(client)
      .deleteUser('private-user')
      .catch((error: unknown) => error);

    expect(result).toMatchObject({
      name: 'CognitoAdministrationError',
      kind,
      operation: CognitoAdministrationOperation.deleteUser,
    });
    expect(result).not.toHaveProperty('cause');
    expect(result).not.toHaveProperty('$metadata');
    expect((result as Error).message).not.toContain('private@example.test');
    expect((result as Error).message).not.toContain('AWS');
    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('can be replaced by a deterministic fake through the typed boundary', async () => {
    const calls: CreateCognitoUserInput[] = [];
    const fake: CognitoAdministration = {
      async createUser(input): Promise<CreatedCognitoUser> {
        calls.push(input);
        return { sub: 'fixed-sub' };
      },
      async resendWelcome() {},
      async updatePendingParentEmail() {},
      async markEmailVerified() {},
      async setPermanentPassword() {},
      async deleteUser() {},
      async globalSignOut() {},
    };

    await expect(fake.createUser({ kind: 'child', username: 'child-one' })).resolves.toEqual({
      sub: 'fixed-sub',
    });
    expect(calls).toEqual([{ kind: 'child', username: 'child-one' }]);
  });

  it('fails safely if Cognito omits the stable sub from a create response', async () => {
    const client = new FakeClient();
    client.responses.push({ User: { Attributes: [] } });

    await expect(
      adapter(client).createUser({ kind: 'child', username: 'child-one' }),
    ).rejects.toEqual(
      new CognitoAdministrationError(
        CognitoAdministrationFailure.unknown,
        CognitoAdministrationOperation.createUser,
      ),
    );
  });
});
