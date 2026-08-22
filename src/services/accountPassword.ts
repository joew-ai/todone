/**
 * Shared client-side guidance for every flow that chooses a Cognito account
 * password. Cognito remains the authoritative policy enforcer.
 */
export const ACCOUNT_PASSWORD_POLICY = {
  minimumLength: 8,
  requiresUppercase: true,
  requiresLowercase: true,
  requiresNumber: true,
  requiresSymbol: true,
} as const;

export function meetsAccountPasswordPolicy(password: string): boolean {
  return (
    password.length >= ACCOUNT_PASSWORD_POLICY.minimumLength &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}
