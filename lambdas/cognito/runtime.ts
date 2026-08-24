import type { CognitoAdministration } from './administration';
import { AwsCognitoAdministration } from './administration';

let administration: CognitoAdministration | null = null;

export function getCognitoAdministration(): CognitoAdministration {
  if (administration) return administration;
  const userPoolId = process.env.COGNITO_USER_POOL_ID;
  if (!userPoolId) throw new Error('COGNITO_USER_POOL_ID is not configured.');
  administration = new AwsCognitoAdministration(userPoolId);
  return administration;
}
