import { beforeEach, describe, expect, it, vi } from 'vitest';

const authenticateUserMock = vi.fn();
const signOutMock = vi.fn();
const getSignInUserSessionMock = vi.fn();

vi.mock('amazon-cognito-identity-js', () => {
  class CognitoUserPool {
    constructor(public config: unknown) {}
  }
  class AuthenticationDetails {
    constructor(public data: unknown) {}
  }
  class CognitoUser {
    constructor(public data: unknown) {}
    authenticateUser(details: unknown, callbacks: unknown) {
      authenticateUserMock(details, callbacks);
    }
    signOut() {
      signOutMock();
    }
    getSignInUserSession() {
      return getSignInUserSessionMock();
    }
  }
  return { CognitoUserPool, AuthenticationDetails, CognitoUser };
});

const sendMock = vi.fn();

vi.mock('@aws-sdk/client-cognito-identity-provider', () => {
  class CognitoIdentityProviderClient {
    constructor(public config: unknown) {}
    send(command: unknown) {
      return sendMock(command);
    }
  }
  class InitiateAuthCommand {
    constructor(public input: unknown) {}
  }
  return { CognitoIdentityProviderClient, InitiateAuthCommand };
});

const { AuthClient } = await import('../../services/authClient');

interface MockCallbacks {
  onSuccess: (session: unknown) => void;
  onFailure: (err: unknown) => void;
}

function buildSession(
  overrides: Partial<{ idToken: string; accessToken: string; exp: number }> = {},
) {
  const idToken = overrides.idToken ?? 'id-token-value';
  const accessToken = overrides.accessToken ?? 'access-token-value';
  const exp = overrides.exp ?? Math.floor(Date.now() / 1000) + 3600;
  return {
    getIdToken: () => ({ getJwtToken: () => idToken, getExpiration: () => exp }),
    getAccessToken: () => ({ getJwtToken: () => accessToken }),
  };
}

function buildClient() {
  return new AuthClient({ userPoolId: 'pool-id', clientId: 'client-id', region: 'us-east-1' });
}

function buildLocalClient() {
  return new AuthClient({
    userPoolId: 'local_abc123',
    clientId: 'local-client-id',
    region: 'local',
    localEndpoint: 'http://localhost:9229',
  });
}

describe('AuthClient', () => {
  beforeEach(() => {
    authenticateUserMock.mockReset();
    signOutMock.mockReset();
    getSignInUserSessionMock.mockReset();
    sendMock.mockReset();
  });

  it('returns a success result with idToken, accessToken, and expiresAt', async () => {
    const session = buildSession();
    authenticateUserMock.mockImplementation((_details, callbacks: MockCallbacks) => {
      callbacks.onSuccess(session);
    });

    const result = await buildClient().signIn('parent1', 'correct-password');

    expect(result.kind).toBe('success');
    if (result.kind === 'success') {
      expect(result.session.idToken).toBe('id-token-value');
      expect(result.session.accessToken).toBe('access-token-value');
      expect(result.session.expiresAt).toBeInstanceOf(Date);
    }
  });

  it('returns a generic invalid-credentials error for incorrect username or password', async () => {
    authenticateUserMock.mockImplementation((_details, callbacks: MockCallbacks) => {
      callbacks.onFailure({ code: 'NotAuthorizedException' });
    });

    const result = await buildClient().signIn('parent1', 'wrong-password');

    expect(result).toEqual({
      kind: 'error',
      message: 'Incorrect username or password.',
      recoverable: true,
    });
  });

  it('maps UserNotFoundException to the exact same result as NotAuthorizedException', async () => {
    authenticateUserMock.mockImplementation((_details, callbacks: MockCallbacks) => {
      callbacks.onFailure({ code: 'UserNotFoundException' });
    });
    const notFoundResult = await buildClient().signIn('nobody', 'whatever');

    authenticateUserMock.mockImplementation((_details, callbacks: MockCallbacks) => {
      callbacks.onFailure({ code: 'NotAuthorizedException' });
    });
    const wrongPasswordResult = await buildClient().signIn('parent1', 'wrong');

    expect(notFoundResult).toEqual(wrongPasswordResult);
  });

  it('getIdToken returns null before sign-in and the JWT after a successful sign-in', async () => {
    const client = buildClient();
    expect(client.getIdToken()).toBeNull();

    const session = buildSession({ idToken: 'fresh-token' });
    authenticateUserMock.mockImplementation((_details, callbacks: MockCallbacks) => {
      callbacks.onSuccess(session);
    });
    await client.signIn('parent1', 'correct-password');

    getSignInUserSessionMock.mockReturnValue(session);
    expect(client.getIdToken()).toBe('fresh-token');
  });

  it('signOut clears the current user so getIdToken returns null again', async () => {
    const client = buildClient();
    const session = buildSession();
    authenticateUserMock.mockImplementation((_details, callbacks: MockCallbacks) => {
      callbacks.onSuccess(session);
    });
    await client.signIn('parent1', 'correct-password');

    client.signOut();

    expect(signOutMock).toHaveBeenCalledTimes(1);
    expect(client.getIdToken()).toBeNull();
  });
});

describe('AuthClient (LOCAL DEVELOPMENT ONLY, localEndpoint set)', () => {
  beforeEach(() => {
    authenticateUserMock.mockReset();
    signOutMock.mockReset();
    getSignInUserSessionMock.mockReset();
    sendMock.mockReset();
  });

  it('uses USER_PASSWORD_AUTH instead of SRP, and never calls authenticateUser', async () => {
    sendMock.mockResolvedValue({
      AuthenticationResult: {
        IdToken: 'local-id-token',
        AccessToken: 'local-access-token',
        ExpiresIn: 3600,
      },
    });

    const result = await buildLocalClient().signIn('localdev', 'LocalDevPass123!');

    expect(result.kind).toBe('success');
    if (result.kind === 'success') {
      expect(result.session.idToken).toBe('local-id-token');
      expect(result.session.accessToken).toBe('local-access-token');
    }
    expect(authenticateUserMock).not.toHaveBeenCalled();
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          AuthFlow: 'USER_PASSWORD_AUTH',
          ClientId: 'local-client-id',
          AuthParameters: { USERNAME: 'localdev', PASSWORD: 'LocalDevPass123!' },
        }),
      }),
    );
  });

  it('maps a cognito-local NotAuthorizedException to the same generic invalid-credentials result', async () => {
    sendMock.mockRejectedValue({ name: 'NotAuthorizedException' });

    const result = await buildLocalClient().signIn('localdev', 'wrong-password');

    expect(result).toEqual({
      kind: 'error',
      message: 'Incorrect username or password.',
      recoverable: true,
    });
  });

  it('getIdToken and signOut work against the local session, independent of the SRP CognitoUser path', async () => {
    sendMock.mockResolvedValue({
      AuthenticationResult: {
        IdToken: 'local-id-token',
        AccessToken: 'local-access-token',
        ExpiresIn: 3600,
      },
    });

    const client = buildLocalClient();
    expect(client.getIdToken()).toBeNull();

    await client.signIn('localdev', 'LocalDevPass123!');
    expect(client.getIdToken()).toBe('local-id-token');

    client.signOut();
    expect(client.getIdToken()).toBeNull();
    // The local path never touches the SRP CognitoUser at all.
    expect(signOutMock).not.toHaveBeenCalled();
  });
});
