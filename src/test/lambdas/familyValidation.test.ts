import { describe, expect, it } from 'vitest';
import {
  isCanonicalProfileColor,
  isValidUsername,
  normalizeUsername,
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
});
