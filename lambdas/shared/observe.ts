import { emitApiMetrics } from './metrics';
import { logRequest, type LogOutcome } from './logger';

export interface RecordRequestInput {
  route: string;
  method: string;
  requestId: string;
  status: number;
  /** Value from `performance.now()` (or equivalent) captured at request start. */
  startedAtMs: number;
  errorCode?: string;
}

function classifyOutcome(status: number): LogOutcome {
  if (status === 401 || status === 403) {
    return 'denied';
  }
  if (status >= 500) {
    return 'error';
  }
  return 'success';
}

/**
 * Single call site handlers use right before returning a response. Computes
 * latency and outcome from the status code, then emits both the privacy-safe
 * structured log line and the EMF metrics document.
 */
export function recordRequest(input: RecordRequestInput): void {
  const latencyMs = performance.now() - input.startedAtMs;
  const outcome = classifyOutcome(input.status);

  logRequest({
    requestId: input.requestId,
    route: input.route,
    method: input.method,
    status: input.status,
    latencyMs,
    outcome,
    errorCode: input.errorCode,
  });

  emitApiMetrics({
    route: input.route,
    latencyMs,
    isError: outcome === 'error',
    isDenied: outcome === 'denied',
  });
}
