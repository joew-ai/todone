/**
 * Privacy-safe structured request logging.
 *
 * This is the ONLY allowed shape for request logs (docs/security/threat-model.md
 * "Privacy-safe logging allowlist"; docs/architecture/api-conventions.md
 * "Observability"). The type signature itself enforces the allowlist: there is
 * no field here for tokens, claims, headers, bodies, usernames, `sub`, or any
 * household/product identifier. Callers cannot accidentally log a forbidden
 * field because there is nowhere to put it.
 */

export type LogOutcome = 'success' | 'denied' | 'error';

export interface RequestLogFields {
  requestId: string;
  route: string;
  method: string;
  status: number;
  /** Wall-clock request duration in milliseconds. */
  latencyMs: number;
  outcome: LogOutcome;
  /** Stable machine-readable error code only; never a raw dependency message. */
  errorCode?: string;
}

function deploymentVersion(): string {
  return process.env.DEPLOYMENT_VERSION ?? 'local';
}

/**
 * Emits one structured JSON log line per request via `console.log`, which
 * both the local Express simulator and the real Lambda runtime (CloudWatch
 * Logs) capture without additional setup or dependencies.
 */
export function logRequest(fields: RequestLogFields): void {
  const entry: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    requestId: fields.requestId,
    route: fields.route,
    method: fields.method,
    status: fields.status,
    latencyMs: Math.round(fields.latencyMs),
    deploymentVersion: deploymentVersion(),
    outcome: fields.outcome,
  };
  if (fields.errorCode) {
    entry.errorCode = fields.errorCode;
  }
  console.log(JSON.stringify(entry));
}
