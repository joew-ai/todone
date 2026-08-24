import {
  HouseholdErrorCode,
  HouseholdField,
  MAX_DISPLAY_NAME_LENGTH,
  ProfileColor,
  type ProfileColorId,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  USERNAME_PATTERN,
} from './constants';
import type { ApiFieldError } from '../shared/responses';
import { messages } from '../shared/messages';

// Unicode General Category Cc matches invisible control characters, which do not belong in names.
const CONTROL_CHARACTER_PATTERN = /\p{Cc}/u;

export interface ProfileFields {
  displayName: string;
  color: ProfileColorId;
  version: number;
}

export type ProfileValidation =
  { kind: 'valid'; value: ProfileFields } | { kind: 'invalid'; fieldErrors: ApiFieldError[] };

export type CanonicalProfileColor = ProfileColorId;

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

export function validateProfileInput(value: unknown): ProfileValidation {
  if (!isRecord(value)) {
    return unsupportedProfileFields();
  }
  const acceptedFields = [HouseholdField.displayName, HouseholdField.color, 'version'];
  if (Object.keys(value).some((key) => !acceptedFields.includes(key))) {
    return unsupportedProfileFields();
  }

  const displayName = typeof value.displayName === 'string' ? value.displayName.trim() : '';
  const color = value.color;
  const version = value.version;
  const fieldErrors: ApiFieldError[] = [];
  if (
    typeof value.displayName !== 'string' ||
    !displayName ||
    [...displayName].length > MAX_DISPLAY_NAME_LENGTH ||
    CONTROL_CHARACTER_PATTERN.test(displayName)
  ) {
    fieldErrors.push({
      field: HouseholdField.displayName,
      code: HouseholdErrorCode.invalidDisplayName,
      message: messages.profileApi.invalidDisplayName,
    });
  }
  if (!isCanonicalProfileColor(color)) {
    fieldErrors.push({
      field: HouseholdField.color,
      code: HouseholdErrorCode.invalidProfileColor,
      message: messages.profileApi.invalidColor,
    });
  }
  if (typeof version !== 'number' || !Number.isSafeInteger(version) || version < 0) {
    fieldErrors.push({
      field: 'version',
      code: HouseholdErrorCode.invalidRequest,
      message: messages.profileApi.invalidVersion,
    });
  }
  return fieldErrors.length > 0
    ? { kind: 'invalid', fieldErrors }
    : {
        kind: 'valid',
        value: { displayName, color: color as ProfileColorId, version: version as number },
      };
}

function unsupportedProfileFields(): ProfileValidation {
  return {
    kind: 'invalid',
    fieldErrors: [
      {
        field: HouseholdField.displayName,
        code: HouseholdErrorCode.invalidRequest,
        message: messages.profileApi.unsupportedFields,
      },
    ],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
