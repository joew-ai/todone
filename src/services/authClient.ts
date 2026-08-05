import {
  AuthenticationDetails,
  CognitoUser,
  CognitoUserPool,
  type CognitoUserSession,
} from 'amazon-cognito-identity-js';
import type { AuthConfig } from '../config/authConfig';
import { mapAuthError } from './authErrors';

export interface AuthSession {
  idToken: string;
  accessToken: string;
  expiresAt: Date;
}

export type SignInResult =
  | { kind: 'success'; session: AuthSession }
  | { kind: 'error'; message: string; recoverable: boolean };

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
  private currentUser: CognitoUser | null = null;
  private localSession: AuthSession | null = null;

  constructor(config: AuthConfig) {
    this.config = config;
    this.pool = new CognitoUserPool({
      UserPoolId: config.userPoolId,
      ClientId: config.clientId,
    });
  }

  async signIn(username: string, password: string): Promise<SignInResult> {
    if (this.config.localEndpoint) {
      return this.signInLocal(username, password);
    }
    return this.signInSrp(username, password);
  }

  signOut(): void {
    this.currentUser?.signOut();
    this.currentUser = null;
    this.localSession = null;
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
      return { kind: 'success', session };
    } catch (err) {
      return { kind: 'error', ...mapAuthError(err) };
    }
  }
}

function toAuthSession(session: CognitoUserSession): AuthSession {
  return {
    idToken: session.getIdToken().getJwtToken(),
    accessToken: session.getAccessToken().getJwtToken(),
    expiresAt: new Date(session.getIdToken().getExpiration() * 1000),
  };
}
