import { describe, expect, it } from 'vitest';
import { validateHouseholdInput } from '../../../lambdas/households/validation';

describe('household input validation', () => {
  it('trims a valid name and accepts a runtime-supported IANA timezone', () => {
    expect(
      validateHouseholdInput({ name: '  River House  ', timezone: 'America/Chicago' }),
    ).toEqual({
      kind: 'valid',
      value: { name: 'River House', timezone: 'America/Chicago' },
    });
  });

  it.each([
    [{ name: '', timezone: 'America/Chicago' }, 'name'],
    [{ name: 'x'.repeat(81), timezone: 'America/Chicago' }, 'name'],
    [{ name: 'House\nName', timezone: 'America/Chicago' }, 'name'],
    [{ name: 'River House', timezone: 'Not/A_Zone' }, 'timezone'],
    [{ name: 'River House', timezone: 'UTC' }, 'timezone'],
  ])('rejects invalid input %j', (input, field) => {
    const result = validateHouseholdInput(input);
    expect(result.kind).toBe('invalid');
    if (result.kind === 'invalid')
      expect(result.fieldErrors.some((e) => e.field === field)).toBe(true);
  });

  it('rejects unknown ownership fields', () => {
    expect(
      validateHouseholdInput({
        name: 'River House',
        timezone: 'America/Chicago',
        householdId: 'another-household',
      }).kind,
    ).toBe('invalid');
  });
});
