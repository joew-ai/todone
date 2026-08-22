import {
  ProfileColor,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  USERNAME_PATTERN,
} from './constants';

export type CanonicalProfileColor = (typeof ProfileColor)[keyof typeof ProfileColor];

/** Usernames are immutable display copies; Cognito remains their uniqueness authority. */
export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidUsername(value: string): boolean {
  return USERNAME_PATTERN.test(value);
}

export function usernameValidationMessage(): string {
  return `Username must be ${USERNAME_MIN_LENGTH} to ${USERNAME_MAX_LENGTH} lowercase characters using letters, numbers, hyphens, or underscores.`;
}

export function isCanonicalProfileColor(value: unknown): value is CanonicalProfileColor {
  return (
    typeof value === 'string' &&
    Object.values(ProfileColor).includes(value as CanonicalProfileColor)
  );
}
