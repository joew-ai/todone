import { describe, expect, it } from 'vitest';
import { isValidUsername, normalizeUsernameForCognito } from '../../services/username';

describe('public username normalization', () => {
  it('normalizes the submitted username before Cognito creation', () => {
    expect(normalizeUsernameForCognito('  Fun-Kid_1 ')).toBe('fun-kid_1');
  });

  it.each([
    ['parent_1', true],
    ['fun-name', true],
    ['ParentOne', false],
    ['has space', false],
    ['ab', false],
    ['a'.repeat(25), false],
  ])('validates %s', (username, expected) => {
    expect(isValidUsername(username)).toBe(expected);
  });
});
