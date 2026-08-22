import { describe, expect, it } from 'vitest';
import {
  isCanonicalProfileColor,
  isValidUsername,
  normalizeUsername,
  validateProfileInput,
} from '../../../lambdas/households/familyValidation';

describe('family-account validation contracts', () => {
  it.each([
    ['kid_1', true],
    ['fun-name', true],
    ['abc', true],
    ['a', false],
    ['has space', false],
    ['upperCase', false],
    ['a'.repeat(25), false],
  ])('validates username %s', (username, expected) => {
    expect(isValidUsername(username)).toBe(expected);
  });

  it('normalizes a submitted username before persistence or Cognito use', () => {
    expect(normalizeUsername('  Fun-Kid_1  ')).toBe('fun-kid_1');
  });

  it.each(['PINE', 'FERN', 'MOSS', 'CLAY', 'CEDAR', 'MARIGOLD', 'LAKE', 'DUSK'])(
    'accepts canonical profile color %s',
    (color) => {
      expect(isCanonicalProfileColor(color)).toBe(true);
    },
  );

  it.each(['#2F6B4F', 'pink', '', null])('rejects arbitrary color %s', (color) => {
    expect(isCanonicalProfileColor(color)).toBe(false);
  });

  it('accepts a trimmed versioned profile update', () => {
    expect(
      validateProfileInput({ displayName: '  River Kid  ', color: 'LAKE', version: 1 }),
    ).toEqual({
      kind: 'valid',
      value: { displayName: 'River Kid', color: 'LAKE', version: 1 },
    });
  });

  it.each([
    { displayName: '', color: 'PINE', version: 0 },
    { displayName: 'x'.repeat(61), color: 'PINE', version: 0 },
    { displayName: 'Name', color: '#2F6B4F', version: 0 },
    { displayName: 'Name', color: 'PINE', version: -1 },
    { displayName: 'Name', color: 'PINE', version: 1.5 },
    { displayName: 'Name', color: 'PINE', version: 0, role: 'parent' },
  ])('rejects invalid profile input %j', (input) => {
    expect(validateProfileInput(input).kind).toBe('invalid');
  });

  it('rejects a non-string display name as a malformed caller contract', () => {
    expect(() => validateProfileInput({ displayName: 42, color: 'PINE', version: 0 })).toThrow(
      'Profile display name must be a string.',
    );
  });
});
