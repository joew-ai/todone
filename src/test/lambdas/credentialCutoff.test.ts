import { describe, expect, it } from 'vitest';
import { isTokenCurrent } from '../../../lambdas/households/repository';

describe('membership credential-validity cutoff', () => {
  const cutoff = { S: '2026-08-21T12:00:00.500Z' } as const;
  const cutoffSecond = Math.floor(Date.parse(cutoff.S) / 1000);

  it('rejects an absent, same-second, or older verified issuance time after a cutoff', () => {
    expect(isTokenCurrent(cutoff)).toBe(false);
    expect(isTokenCurrent(cutoff, cutoffSecond)).toBe(false);
    expect(isTokenCurrent(cutoff, cutoffSecond - 1)).toBe(false);
  });

  it('accepts a token issued after the cutoff and any token when no cutoff exists', () => {
    expect(isTokenCurrent(cutoff, cutoffSecond + 1)).toBe(true);
    expect(isTokenCurrent(undefined)).toBe(true);
  });
});
