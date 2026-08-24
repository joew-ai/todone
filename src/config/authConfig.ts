export interface AuthConfig {
  userPoolId: string;
  clientId: string;
  registrationClientId: string;
  region: string;
  /**
   * LOCAL DEVELOPMENT ONLY. Set by scripts/setup-local-cognito.ts. When
   * present, sign-in uses cognito-local's USER_PASSWORD_AUTH flow instead of
   * real Cognito's SRP flow. Never set against a deployed pool.
   */
  localEndpoint?: string;
}

/**
 * Reads non-secret Cognito configuration from Vite environment variables.
 * These values come from terraform/outputs.tf once the platform is
 * provisioned; they are never credentials, tokens, or secrets.
 */
export function loadAuthConfig(env: ImportMetaEnv = import.meta.env): AuthConfig {
  const userPoolId = env.VITE_COGNITO_USER_POOL_ID;
  const clientId = env.VITE_COGNITO_CLIENT_ID;
  const registrationClientId = env.VITE_COGNITO_REGISTRATION_CLIENT_ID;
  const region = env.VITE_COGNITO_REGION;

  const missing = [
    !userPoolId && 'VITE_COGNITO_USER_POOL_ID',
    !clientId && 'VITE_COGNITO_CLIENT_ID',
    !registrationClientId && 'VITE_COGNITO_REGISTRATION_CLIENT_ID',
    !region && 'VITE_COGNITO_REGION',
  ].filter((name): name is string => Boolean(name));

  if (missing.length > 0) {
    throw new Error(
      `Missing required Cognito configuration: ${missing.join(', ')}. Copy .env.example to .env.local and fill in the Terraform outputs, or run "npm run setup:local-cognito" for a fully offline setup.`,
    );
  }

  return {
    userPoolId,
    clientId,
    registrationClientId,
    region,
    localEndpoint: env.VITE_COGNITO_LOCAL_ENDPOINT || undefined,
  };
}
