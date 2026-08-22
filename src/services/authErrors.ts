import { messages } from '../i18n/messages';

export interface AuthErrorResult {
  message: string;
  recoverable: boolean;
}

const GENERIC_INVALID_CREDENTIALS: AuthErrorResult = {
  message: 'Incorrect username or password.',
  recoverable: true,
};

const NETWORK_ERROR: AuthErrorResult = {
  message: messages.generic.networkError,
  recoverable: true,
};

const UNEXPECTED_ERROR: AuthErrorResult = {
  message: messages.generic.unexpectedError,
  recoverable: true,
};

/**
 * Maps a Cognito/network error to a safe, generic result. Per
 * docs/ux/interaction-states.md, credential errors never reveal whether the
 * username or password was incorrect, and no raw Cognito error text,
 * username, or other submitted value is ever surfaced.
 */
export function mapAuthError(error: unknown): AuthErrorResult {
  const code = getErrorCode(error);

  switch (code) {
    case 'NotAuthorizedException':
    case 'UserNotFoundException':
    case 'UserNotConfirmedException':
      return GENERIC_INVALID_CREDENTIALS;
    // cognito-local (LOCAL DEVELOPMENT ONLY) reports a wrong password as
    // InvalidPasswordException instead of NotAuthorizedException; real
    // Cognito's InvalidPasswordException means something different (weak
    // new password), but treating it as a generic credential error here is
    // still safe and never misleading in either environment.
    case 'InvalidPasswordException':
      return GENERIC_INVALID_CREDENTIALS;
    case 'NetworkError':
    case 'ECONNABORTED':
      return NETWORK_ERROR;
    default:
      return UNEXPECTED_ERROR;
  }
}

export function getErrorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) {
    return undefined;
  }

  const code = (error as { code?: unknown }).code;
  if (typeof code === 'string') {
    return code;
  }

  // AWS SDK v3 client errors (used by the local-dev USER_PASSWORD_AUTH
  // path) expose the exception name via `.name` rather than `.code`.
  const name = (error as { name?: unknown }).name;
  return typeof name === 'string' ? name : undefined;
}

export function getErrorMessage(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  const message = (error as { message?: unknown }).message;
  return typeof message === 'string' ? message : undefined;
}
