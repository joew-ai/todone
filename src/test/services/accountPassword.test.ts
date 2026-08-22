import { describe, expect, it } from 'vitest';
import { meetsAccountPasswordPolicy } from '../../services/accountPassword';

describe('meetsAccountPasswordPolicy', () => {
  it.each([
    ['Short1!', false],
    ['alllowercase1!', false],
    ['ALLUPPERCASE1!', false],
    ['NoNumber!', false],
    ['NoSymbol1', false],
    ['StrongPassword1!', true],
  ])('validates %s', (password, expected) => {
    expect(meetsAccountPasswordPolicy(password)).toBe(expected);
  });
});
