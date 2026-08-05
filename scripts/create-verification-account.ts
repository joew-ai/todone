#!/usr/bin/env node
/**
 * Administrator-only setup script.
 *
 * Creates (or resets the password for) the single verification-only Cognito
 * account used to exercise the temporary sign-in probe
 * (establish-deployable-pwa-foundation, task 2.4). This script:
 *
 *   - is never invoked by the running application;
 *   - never logs, prints, or persists the password;
 *   - must never be pointed at a pool containing real family accounts.
 *
 * Usage:
 *   COGNITO_USER_POOL_ID=<pool-id> AWS_REGION=us-east-1 \
 *     npx tsx scripts/create-verification-account.ts <username> <password>
 *
 * Requires operator AWS credentials scoped to at least
 * cognito-idp:AdminCreateUser and cognito-idp:AdminSetUserPassword on the
 * target pool only (see docs/architecture/family-paas-handoff.md).
 */
import {
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  CognitoIdentityProviderClient,
} from '@aws-sdk/client-cognito-identity-provider';

async function main(): Promise<void> {
  const userPoolId = process.env.COGNITO_USER_POOL_ID;
  const region = process.env.AWS_REGION ?? 'us-east-1';
  const [username, password] = process.argv.slice(2);

  if (!userPoolId) {
    throw new Error('Set COGNITO_USER_POOL_ID to the Todone verification pool ID.');
  }
  if (!username || !password) {
    throw new Error('Usage: create-verification-account.ts <username> <password>');
  }

  const client = new CognitoIdentityProviderClient({ region });

  await client.send(
    new AdminCreateUserCommand({
      UserPoolId: userPoolId,
      Username: username,
      // Suppresses invitation delivery; this account has no email/phone,
      // matching the child provisioning model.
      MessageAction: 'SUPPRESS',
    }),
  );

  await client.send(
    new AdminSetUserPasswordCommand({
      UserPoolId: userPoolId,
      Username: username,
      Password: password,
      Permanent: true,
    }),
  );

  console.log(`Verification account "${username}" is ready. The password was not logged.`);
}

main().catch((error: unknown) => {
  console.error(
    'Failed to create verification account:',
    error instanceof Error ? error.message : error,
  );
  process.exitCode = 1;
});
