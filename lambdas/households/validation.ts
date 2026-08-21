export interface HouseholdFields {
  name: string;
  timezone: string;
}

export type HouseholdValidation =
  | { kind: 'valid'; value: HouseholdFields }
  | {
      kind: 'invalid';
      fieldErrors: ApiFieldError[];
    };

export function validateHouseholdInput(value: unknown): HouseholdValidation {
  const acceptedFields = Object.values(HouseholdField);
  if (
    !isRecord(value) ||
    Object.keys(value).some((key) => !acceptedFields.includes(key as never))
  ) {
    return {
      kind: 'invalid',
      fieldErrors: [
        {
          field: HouseholdField.name,
          code: HouseholdErrorCode.invalidRequest,
          message: 'The request contains unsupported fields.',
        },
      ],
    };
  }

  const fieldErrors: Extract<HouseholdValidation, { kind: 'invalid' }>['fieldErrors'] = [];
  const name = typeof value.name === 'string' ? value.name.trim() : '';
  const timezone = typeof value.timezone === 'string' ? value.timezone : '';

  if (!name || [...name].length > MAX_HOUSEHOLD_NAME_LENGTH || /\p{Cc}/u.test(name)) {
    fieldErrors.push({
      field: HouseholdField.name,
      code: HouseholdErrorCode.invalidName,
      message: `The household name must be 1 to ${MAX_HOUSEHOLD_NAME_LENGTH} characters.`,
    });
  }
  if (!isSupportedIanaTimezone(timezone)) {
    fieldErrors.push({
      field: HouseholdField.timezone,
      code: HouseholdErrorCode.invalidTimezone,
      message: 'The timezone must be a supported IANA timezone.',
    });
  }

  return fieldErrors.length > 0
    ? { kind: 'invalid', fieldErrors }
    : { kind: 'valid', value: { name, timezone } };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
import type { ApiFieldError } from '../shared/responses';
import { isSupportedIanaTimezone } from '../shared/timezone';
import { HouseholdErrorCode, HouseholdField, MAX_HOUSEHOLD_NAME_LENGTH } from './constants';
