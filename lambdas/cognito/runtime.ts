import type { CognitoAdministration } from './administration';
import { AwsCognitoAdministration } from './administration';
import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';

let administration: CognitoAdministration | null = null;
const EnvironmentVariable = {
  cognitoUserPoolId: 'COGNITO_USER_POOL_ID',
  cognitoLocalEndpoint: 'COGNITO_LOCAL_ENDPOINT',
  localDevelopment: 'TODONE_LOCAL_DEVELOPMENT',
} as const;

export function getCognitoAdministration(): CognitoAdministration {
  if (administration) return administration;
  const userPoolId = process.env[EnvironmentVariable.cognitoUserPoolId];
  if (!userPoolId) throw new Error('COGNITO_USER_POOL_ID is not configured.');
  administration = new AwsCognitoAdministration(userPoolId, localCognitoClient());
  return administration;
}

/** Local Cognito is an explicit, loopback-only development mode; production always uses AWS. */
export function localCognitoClient(
  environment: Record<string, string | undefined> = process.env,
): CognitoIdentityProviderClient | undefined {
  if (environment[EnvironmentVariable.localDevelopment] !== 'true') return undefined;
  const endpoint = environment[EnvironmentVariable.cognitoLocalEndpoint];
  if (!endpoint) throw new Error('COGNITO_LOCAL_ENDPOINT is required for local development.');
  const url = new URL(endpoint);
  if (!['localhost', '127.0.0.1', '::1'].includes(url.hostname))
    throw new Error('COGNITO_LOCAL_ENDPOINT must use a loopback host.');
  return new CognitoIdentityProviderClient({
    region: 'local',
    endpoint: url.toString(),
    credentials: { accessKeyId: 'local', secretAccessKey: 'local' },
  });
}
