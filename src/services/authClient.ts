import {
  AuthenticationDetails,
  CognitoUser,
  CognitoUserAttribute,
  CognitoUserPool,
  type CognitoUserSession,
} from 'amazon-cognito-identity-js';
import type { AuthConfig } from '../config/authConfig';
import { messages } from '../i18n/messages';
import { getErrorCode, getErrorMessage, mapAuthError } from './authErrors';
import { isValidUsername, normalizeUsernameForCognito } from './username';

const CognitoErrorCode = {
  invalidPassword: 'InvalidPasswordException',
  usernameExists: 'UsernameExistsException',
} as const;

export interface AuthSession {
  idToken: string;
  accessToken: string;
  expiresAt: Date;
}

export type SignInResult =
  | { kind: 'success'; session: AuthSession }
  | { kind: 'error'; message: string; recoverable: boolean };

export type AuthActionResult =
  | { kind: 'success' }
  | {
      kind: 'error';
      message: string;
      recoverable: boolean;
      field?: 'username' | 'email' | 'registrationGatePassword' | 'code' | 'password';
    };

/**
 * Thin, typed wrapper around amazon-cognito-identity-js using username/JWT
 * terminology throughout (never "email"), matching the replacement Cognito
 * pool's username/password sign-in model (ADR 0002).
 *
 * When `config.localEndpoint` is set (LOCAL DEVELOPMENT ONLY, see
 * scripts/setup-local-cognito.ts), sign-in instead goes through
 * cognito-local's USER_PASSWORD_AUTH flow via the raw Cognito API, because
 * cognito-local does not implement SRP. Real Cognito always uses SRP; this
 * branch is unreachable unless a developer has explicitly bootstrapped a
 * local pool.
 *
 * This client performs authentication only. Household/session-restoration
 * behavior belongs to `bootstrap-household-membership`.
 */
export class AuthClient {
  private readonly config: AuthConfig;
  private readonly pool: CognitoUserPool;
  private readonly storage: Storage;
  private currentUser: CognitoUser | null = null;
  private localSession: AuthSession | null = null;

  constructor(config: AuthConfig) {
    this.config = config;
    this.storage = sessionStorage;
    this.pool = new CognitoUserPool({
      UserPoolId: config.userPoolId,
      ClientId: config.clientId,
      Storage: this.storage,
    });
  }

  async signIn(username: string, password: string): Promise<SignInResult> {
    if (this.config.localEndpoint) {
      return this.signInLocal(username, password);
    }
    return this.signInSrp(username, password);
  }

  async registerFirstParent(
    username: string,
    password: string,
    email: string,
    registrationGatePassword: string,
  ): Promise<AuthActionResult> {
    const canonicalUsername = normalizeUsernameForCognito(username);
    if (!isValidUsername(canonicalUsername)) {
      return {
        kind: 'error',
        field: 'username',
        message: messages.bootstrap.usernamePolicyError,
        recoverable: true,
      };
    }
    if (this.config.localEndpoint) {
      return this.registerLocal(canonicalUsername, password, email, registrationGatePassword);
    }
    return new Promise((resolve) => {
      this.pool.signUp(
        canonicalUsername,
        password,
        [new CognitoUserAttribute({ Name: 'email', Value: email })],
        [
          new CognitoUserAttribute({
            Name: 'registrationGatePassword',
            Value: registrationGatePassword,
          }),
        ],
        (error) => resolve(error ? registrationError(error) : { kind: 'success' }),
      );
    });
  }

  async confirmRegistration(username: string, code: string): Promise<AuthActionResult> {
    return new Promise((resolve) => {
      this.user(username).confirmRegistration(code, true, (error) =>
        resolve(error ? confirmationError(error) : { kind: 'success' }),
      );
    });
  }

  async resendConfirmationCode(username: string): Promise<AuthActionResult> {
    return new Promise((resolve) => {
      this.user(username).resendConfirmationCode((error) =>
        resolve(error ? confirmationError(error) : { kind: 'success' }),
      );
    });
  }

  async forgotPassword(username: string): Promise<AuthActionResult> {
    return new Promise((resolve) => {
      this.user(username).forgotPassword({
        inputVerificationCode: () => resolve({ kind: 'success' }),
        onSuccess: () => resolve({ kind: 'success' }),
        onFailure: (error) => {
          // Initiation remains generic and does not disclose whether an account exists.
          resolve(
            getErrorCode(error) === 'UserNotFoundException'
              ? { kind: 'success' }
              : { kind: 'error', ...mapAuthError(error) },
          );
        },
      });
    });
  }

  async confirmForgotPassword(
    username: string,
    code: string,
    newPassword: string,
  ): Promise<AuthActionResult> {
    return new Promise((resolve) => {
      this.user(username).confirmPassword(code, newPassword, {
        onSuccess: () => resolve({ kind: 'success' }),
        onFailure: (error) => resolve(passwordResetError(error)),
      });
    });
  }

  signOut(): void {
    try {
      if (!this.config.localEndpoint) {
        (this.currentUser ?? this.pool.getCurrentUser())?.signOut();
      }
    } finally {
      // Sign-out is a local privacy boundary. Cognito SDK errors must not
      // leave this tab's session credentials or derived state behind.
      this.currentUser = null;
      this.localSession = null;
      this.clearStoredSession();
    }
  }

  /** Restores a non-expired session from this tab's sessionStorage. */
  async restoreSession(): Promise<AuthSession | null> {
    if (this.config.localEndpoint) {
      return this.restoreLocalSession();
    }

    const user = this.pool.getCurrentUser();
    if (!user) {
      this.clearStoredSession();
      return null;
    }

    return new Promise<AuthSession | null>((resolve) => {
      user.getSession((error: Error | null, cognitoSession: CognitoUserSession | null) => {
        if (error || !cognitoSession) {
          this.clearStoredSession();
          resolve(null);
          return;
        }

        const session = toAuthSession(cognitoSession);
        if (session.expiresAt.getTime() <= Date.now()) {
          user.signOut();
          this.clearStoredSession();
          resolve(null);
          return;
        }

        this.currentUser = user;
        resolve(session);
      });
    });
  }

  /** Returns the current ID token JWT for use as a bearer token, or null if signed out. */
  getIdToken(): string | null {
    if (this.localSession) {
      return this.localSession.idToken;
    }
    return this.currentUser?.getSignInUserSession()?.getIdToken().getJwtToken() ?? null;
  }

  private async signInSrp(username: string, password: string): Promise<SignInResult> {
    const user = new CognitoUser({ Username: username, Pool: this.pool });
    const authDetails = new AuthenticationDetails({ Username: username, Password: password });

    return new Promise<SignInResult>((resolve) => {
      user.authenticateUser(authDetails, {
        onSuccess: (session: CognitoUserSession) => {
          this.currentUser = user;
          resolve({ kind: 'success', session: toAuthSession(session) });
        },
        onFailure: (err: unknown) => {
          resolve({ kind: 'error', ...mapAuthError(err) });
        },
      });
    });
  }

  private user(username: string): CognitoUser {
    return new CognitoUser({ Username: username, Pool: this.pool });
  }

  private async registerLocal(
    username: string,
    password: string,
    email: string,
    registrationGatePassword: string,
  ): Promise<AuthActionResult> {
    const { CognitoIdentityProviderClient, SignUpCommand } =
      await import('@aws-sdk/client-cognito-identity-provider');
    const client = new CognitoIdentityProviderClient({
      region: this.config.region,
      endpoint: this.config.localEndpoint,
      credentials: { accessKeyId: 'local', secretAccessKey: 'local' },
    });
    try {
      await client.send(
        new SignUpCommand({
          ClientId: this.config.clientId,
          Username: username,
          Password: password,
          UserAttributes: [{ Name: 'email', Value: email }],
          ValidationData: [{ Name: 'registrationGatePassword', Value: registrationGatePassword }],
        }),
      );
      return { kind: 'success' };
    } catch (error) {
      return registrationError(error);
    }
  }

  private async signInLocal(username: string, password: string): Promise<SignInResult> {
    // Dynamically imported so this heavier SDK client never lands in the
    // production bundle for the (default) SRP path.
    const { CognitoIdentityProviderClient, InitiateAuthCommand } =
      await import('@aws-sdk/client-cognito-identity-provider');

    const client = new CognitoIdentityProviderClient({
      region: this.config.region,
      endpoint: this.config.localEndpoint,
      credentials: { accessKeyId: 'local', secretAccessKey: 'local' },
    });

    try {
      const response = await client.send(
        new InitiateAuthCommand({
          AuthFlow: 'USER_PASSWORD_AUTH',
          ClientId: this.config.clientId,
          AuthParameters: { USERNAME: username, PASSWORD: password },
        }),
      );

      const result = response.AuthenticationResult;
      if (!result?.IdToken || !result.AccessToken) {
        return {
          kind: 'error',
          message: 'Something went wrong. Please try again.',
          recoverable: true,
        };
      }

      const session: AuthSession = {
        idToken: result.IdToken,
        accessToken: result.AccessToken,
        expiresAt: new Date(Date.now() + (result.ExpiresIn ?? 3600) * 1000),
      };
      this.localSession = session;
      this.storage.setItem(this.localSessionKey(), serializeSession(session));
      return { kind: 'success', session };
    } catch (err) {
      return { kind: 'error', ...mapAuthError(err) };
    }
  }

  private restoreLocalSession(): AuthSession | null {
    const stored = this.storage.getItem(this.localSessionKey());
    if (!stored) {
      return null;
    }

    try {
      const value = JSON.parse(stored) as Partial<{
        idToken: unknown;
        accessToken: unknown;
        expiresAt: unknown;
      }>;
      if (
        typeof value.idToken !== 'string' ||
        typeof value.accessToken !== 'string' ||
        typeof value.expiresAt !== 'string'
      ) {
        throw new Error('Invalid stored session');
      }

      const session: AuthSession = {
        idToken: value.idToken,
        accessToken: value.accessToken,
        expiresAt: new Date(value.expiresAt),
      };
      if (
        !Number.isFinite(session.expiresAt.getTime()) ||
        session.expiresAt.getTime() <= Date.now()
      ) {
        throw new Error('Expired stored session');
      }

      this.localSession = session;
      return session;
    } catch {
      this.clearStoredSession();
      return null;
    }
  }

  private localSessionKey(): string {
    return `todone.auth.${this.config.clientId}.localSession`;
  }

  private clearStoredSession(): void {
    const cognitoPrefix = `CognitoIdentityServiceProvider.${this.config.clientId}.`;
    const keysToRemove: string[] = [];
    for (let index = 0; index < this.storage.length; index += 1) {
      const key = this.storage.key(index);
      if (key && (key.startsWith(cognitoPrefix) || key === this.localSessionKey())) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => this.storage.removeItem(key));
  }
}

function registrationError(error: unknown): Extract<AuthActionResult, { kind: 'error' }> {
  const code = getErrorCode(error);
  const message = getErrorMessage(error) ?? '';
  if (code === CognitoErrorCode.usernameExists) {
    return {
      kind: 'error',
      field: 'username',
      message: 'That username is already in use.',
      recoverable: true,
    };
  }
  if (message.includes('REGISTRATION_CLOSED')) {
    return { kind: 'error', message: 'Registration is currently closed.', recoverable: false };
  }
  if (message.includes('INVALID_REGISTRATION_GATE')) {
    return {
      kind: 'error',
      field: 'registrationGatePassword',
      message: messages.bootstrap.entryCodeInvalid,
      recoverable: true,
    };
  }
  if (code === CognitoErrorCode.invalidPassword) {
    return {
      kind: 'error',
      field: 'password',
      message: messages.bootstrap.passwordPolicyError,
      recoverable: true,
    };
  }
  return { kind: 'error', ...mapAuthError(error) };
}

function confirmationError(error: unknown): Extract<AuthActionResult, { kind: 'error' }> {
  const code = getErrorCode(error);
  if (code === 'CodeMismatchException' || code === 'ExpiredCodeException') {
    return {
      kind: 'error',
      field: 'code',
      message: 'That verification code is invalid or expired. Request a new code and try again.',
      recoverable: true,
    };
  }
  return { kind: 'error', ...mapAuthError(error) };
}

function passwordResetError(error: unknown): Extract<AuthActionResult, { kind: 'error' }> {
  if (getErrorCode(error) === CognitoErrorCode.invalidPassword) {
    return {
      kind: 'error',
      field: 'password',
      message: messages.bootstrap.passwordPolicyError,
      recoverable: true,
    };
  }
  return confirmationError(error);
}

function toAuthSession(session: CognitoUserSession): AuthSession {
  return {
    idToken: session.getIdToken().getJwtToken(),
    accessToken: session.getAccessToken().getJwtToken(),
    expiresAt: new Date(session.getIdToken().getExpiration() * 1000),
  };
}

function serializeSession(session: AuthSession): string {
  return JSON.stringify({
    idToken: session.idToken,
    accessToken: session.accessToken,
    expiresAt: session.expiresAt.toISOString(),
  });
}
