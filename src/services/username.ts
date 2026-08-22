export const USERNAME_PATTERN = /^[a-z0-9_-]{3,24}$/;

/** Cognito receives only canonical lowercase usernames from public registration. */
export function normalizeUsernameForCognito(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidUsername(value: string): boolean {
  return USERNAME_PATTERN.test(value);
}
