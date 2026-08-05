import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { emitApiMetrics } from '../../../lambdas/shared/metrics';

describe('emitApiMetrics', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it('emits a valid CloudWatch EMF document with only latency, error, and denial metrics', () => {
    emitApiMetrics({ route: '/api/v1/session', latencyMs: 42, isError: false, isDenied: true });

    expect(logSpy).toHaveBeenCalledTimes(1);
    const doc = JSON.parse(logSpy.mock.calls[0]![0] as string);

    expect(doc._aws.CloudWatchMetrics[0].Namespace).toBe('Todone/Api');
    const metricNames = doc._aws.CloudWatchMetrics[0].Metrics.map((m: { Name: string }) => m.Name);
    expect(metricNames.sort()).toEqual(['AuthorizationDenied', 'ErrorCount', 'Latency'].sort());
    expect(doc.Route).toBe('/api/v1/session');
    expect(doc.Latency).toBe(42);
    expect(doc.ErrorCount).toBe(0);
    expect(doc.AuthorizationDenied).toBe(1);
  });

  it('never includes token, header, or claim data (only the approved aggregate denial count)', () => {
    emitApiMetrics({ route: '/api/v1/session', latencyMs: 1, isError: true, isDenied: false });

    const raw = logSpy.mock.calls[0]![0] as string;
    expect(raw).not.toMatch(/bearer |authorization:|password|"sub"|"username"/i);
  });
});
