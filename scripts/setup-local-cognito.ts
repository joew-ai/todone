#!/usr/bin/env node
/**
 * LOCAL DEVELOPMENT ONLY.
 *
 * One-time (idempotent) bootstrap for cognito-local: creates a local-only
 * Cognito user pool + app client + verification account against
 * cognito-local (never real AWS, never the internet), then writes the
 * resulting non-secret configuration to .env.local so `npm run dev:full`
 * picks it up automatically.
 *
 * Requires `npm run dev:cognito` (or `dev:full`) to already be running.
 *
 * Usage:
 *   npm run setup:local-cognito
 *   npm run setup:local-cognito -- <username> <password>
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import {
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  CognitoIdentityProviderClient,
  CreateUserPoolClientCommand,
  CreateUserPoolCommand,
  ListUserPoolClientsCommand,
  ListUserPoolsCommand,
  UpdateUserPoolCommand,
  type CreateUserPoolClientCommandInput,
} from '@aws-sdk/client-cognito-identity-provider';

const LOCAL_ENDPOINT = process.env.COGNITO_LOCAL_ENDPOINT ?? 'http://localhost:9229';
const POOL_NAME = 'todone-local';
const PWA_CLIENT_NAME = 'todone-local-pwa';
const REGISTRATION_CLIENT_NAME = 'todone-local-registration';
const DEFAULT_USERNAME = 'localdev';
// Local-only, throwaway credential. Never used against real infrastructure,
// never a production secret.
const DEFAULT_PASSWORD = 'LocalDevPass123!';
const ENV_LOCAL_PATH = '.env.local';

async function main(): Promise<void> {
  const [username = DEFAULT_USERNAME, password = DEFAULT_PASSWORD] = process.argv.slice(2);

  const client = new CognitoIdentityProviderClient({
    region: 'local',
    endpoint: LOCAL_ENDPOINT,
    credentials: { accessKeyId: 'local', secretAccessKey: 'local' },
  });

  const userPoolId = await getOrCreateUserPool(client);
  await enableLocalEmailVerification(client, userPoolId);
  const clientId = await getOrCreateAppClient(client, userPoolId, PWA_CLIENT_NAME, [
    'ALLOW_USER_PASSWORD_AUTH',
    'ALLOW_REFRESH_TOKEN_AUTH',
  ]);
  const registrationClientId = await getOrCreateAppClient(
    client,
    userPoolId,
    REGISTRATION_CLIENT_NAME,
    ['ALLOW_CUSTOM_AUTH'],
  );
  await upsertVerificationAccount(client, userPoolId, username, password);
  writeLocalEnv({ userPoolId, clientId, registrationClientId });

  console.log('Local Cognito is ready.');
  console.log(`  Endpoint: ${LOCAL_ENDPOINT}`);
  console.log(`  Pool:     ${userPoolId}`);
  console.log(`  PWA client:          ${clientId}`);
  console.log(`  Registration client: ${registrationClientId}`);
  console.log(`  Username: ${username}`);
  console.log(
    password === DEFAULT_PASSWORD
      ? `  Password: ${DEFAULT_PASSWORD} (local-only default, never a real credential)`
      : '  Password: (the value you provided; not repeated here)',
  );
  console.log('');
  console.log('.env.local has been updated. Restart `npm run dev:full` if it was already running.');
}

async function getOrCreateUserPool(client: CognitoIdentityProviderClient): Promise<string> {
  const existing = await client.send(new ListUserPoolsCommand({ MaxResults: 60 }));
  const found = existing.UserPools?.find((pool) => pool.Name === POOL_NAME);
  if (found?.Id) {
    return found.Id;
  }

  const created = await client.send(
    new CreateUserPoolCommand({
      PoolName: POOL_NAME,
      // Mirrors the replacement production pool: plain, case-insensitive,
      // immutable usernames (ADR 0002); no email/phone requirement.
      UsernameConfiguration: { CaseSensitive: false },
      // Cognito Local writes verification codes for these attributes to its
      // console. Without this, SignUp creates an unconfirmed user but has no
      // delivery channel and therefore no code to enter in the local UI.
      AutoVerifiedAttributes: ['email'],
      Policies: {
        PasswordPolicy: {
          MinimumLength: 8,
          RequireUppercase: true,
          RequireLowercase: true,
          RequireNumbers: true,
          RequireSymbols: true,
        },
      },
    }),
  );

  if (!created.UserPool?.Id) {
    throw new Error('cognito-local did not return a user pool ID.');
  }
  return created.UserPool.Id;
}

/** Applies email-code delivery to a pool created by an earlier setup run. */
async function enableLocalEmailVerification(
  client: CognitoIdentityProviderClient,
  userPoolId: string,
): Promise<void> {
  await client.send(
    new UpdateUserPoolCommand({
      UserPoolId: userPoolId,
      AutoVerifiedAttributes: ['email'],
    }),
  );
}

async function getOrCreateAppClient(
  client: CognitoIdentityProviderClient,
  userPoolId: string,
  clientName: string,
  explicitAuthFlows: NonNullable<CreateUserPoolClientCommandInput['ExplicitAuthFlows']>,
): Promise<string> {
  const existing = await client.send(
    new ListUserPoolClientsCommand({ UserPoolId: userPoolId, MaxResults: 60 }),
  );
  const found = existing.UserPoolClients?.find((c) => c.ClientName === clientName);
  if (found?.ClientId) {
    return found.ClientId;
  }

  const created = await client.send(
    new CreateUserPoolClientCommand({
      UserPoolId: userPoolId,
      ClientName: clientName,
      // Public client: no secret, matching the real PWA app client.
      GenerateSecret: false,
      ExplicitAuthFlows: explicitAuthFlows,
    }),
  );

  if (!created.UserPoolClient?.ClientId) {
    throw new Error('cognito-local did not return an app client ID.');
  }
  return created.UserPoolClient.ClientId;
}

async function upsertVerificationAccount(
  client: CognitoIdentityProviderClient,
  userPoolId: string,
  username: string,
  password: string,
): Promise<void> {
  try {
    await client.send(
      new AdminCreateUserCommand({
        UserPoolId: userPoolId,
        Username: username,
        MessageAction: 'SUPPRESS',
      }),
    );
  } catch (error) {
    // Idempotent: if the account already exists, just (re)set its password.
    if (!isUsernameExists(error)) {
      throw error;
    }
  }

  await client.send(
    new AdminSetUserPasswordCommand({
      UserPoolId: userPoolId,
      Username: username,
      Password: password,
      Permanent: true,
    }),
  );
}

function isUsernameExists(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as { name?: unknown }).name === 'UsernameExistsException'
  );
}

function writeLocalEnv(values: {
  userPoolId: string;
  clientId: string;
  registrationClientId: string;
}): void {
  const lines = existsSync(ENV_LOCAL_PATH)
    ? readFileSync(ENV_LOCAL_PATH, 'utf-8').split('\n').filter(Boolean)
    : [];

  const updates: Record<string, string> = {
    VITE_COGNITO_USER_POOL_ID: values.userPoolId,
    VITE_COGNITO_CLIENT_ID: values.clientId,
    VITE_COGNITO_REGISTRATION_CLIENT_ID: values.registrationClientId,
    VITE_COGNITO_REGION: 'local',
    VITE_COGNITO_LOCAL_ENDPOINT: LOCAL_ENDPOINT,
    COGNITO_USER_POOL_ID: values.userPoolId,
    COGNITO_CLIENT_ID: values.clientId,
    COGNITO_LOCAL_ENDPOINT: LOCAL_ENDPOINT,
  };

  const seen = new Set<string>();
  const merged = lines.map((line) => {
    const [key] = line.split('=');
    if (key && key in updates) {
      seen.add(key);
      return `${key}=${updates[key]}`;
    }
    return line;
  });

  for (const [key, value] of Object.entries(updates)) {
    if (!seen.has(key)) {
      merged.push(`${key}=${value}`);
    }
  }

  writeFileSync(ENV_LOCAL_PATH, `${merged.join('\n')}\n`, 'utf-8');
}

main().catch((error: unknown) => {
  console.error('Failed to set up local Cognito:', error instanceof Error ? error.message : error);
  console.error('Is `npm run dev:cognito` (or `dev:full`) running?');
  process.exitCode = 1;
});
