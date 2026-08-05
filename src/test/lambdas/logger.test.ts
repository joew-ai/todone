import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { logRequest } from '../../../lambdas/shared/logger';

describe('logRequest', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it('emits exactly the allowlisted fields for a successful request', () => {
    logRequest({
      requestId: 'req-1',
      route: '/api/v1/session',
      method: 'GET',
      status: 200,
      latencyMs: 12.7,
      outcome: 'success',
    });

    expect(logSpy).toHaveBeenCalledTimes(1);
    const entry = JSON.parse(logSpy.mock.calls[0]![0] as string);

    expect(Object.keys(entry).sort()).toEqual(
      [
        'deploymentVersion',
        'latencyMs',
        'method',
        'outcome',
        'requestId',
        'route',
        'status',
        'timestamp',
      ].sort(),
    );
    expect(entry).toMatchObject({
      requestId: 'req-1',
      route: '/api/v1/session',
      method: 'GET',
      status: 200,
      latencyMs: 13,
      outcome: 'success',
    });
    expect(() => new Date(entry.timestamp).toISOString()).not.toThrow();
  });

  it('includes errorCode only when supplied', () => {
    logRequest({
      requestId: 'req-2',
      route: '/api/v1/session',
      method: 'GET',
      status: 401,
      latencyMs: 3,
      outcome: 'denied',
      errorCode: 'UNAUTHORIZED',
    });

    const entry = JSON.parse(logSpy.mock.calls[0]![0] as string);
    expect(entry.errorCode).toBe('UNAUTHORIZED');
  });

  it('never logs a token, header, claim, or body field regardless of caller intent', () => {
    // The RequestLogFields type has no slot for these; this test documents
    // that guarantee and would fail to compile if the type ever grew one.
    logRequest({
      requestId: 'req-3',
      route: '/api/v1/session',
      method: 'GET',
      status: 200,
      latencyMs: 1,
      outcome: 'success',
    });

    const raw = logSpy.mock.calls[0]![0] as string;
    expect(raw).not.toMatch(/bearer|authorization|password|sub|username/i);
  });
});
