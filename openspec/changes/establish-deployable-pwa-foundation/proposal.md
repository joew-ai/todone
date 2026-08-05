## Why

Todone needs a repeatable, safe path from a local application to a private family deployment before household data is introduced. The existing `family-paas` platform and the local `weather` application establish a compatible AWS and Vue reference, but the current shared Cognito pool requires email identities and the DynamoDB module does not enable recovery by default.

This change creates the smallest deployable, observable, and testable foundation for later vertical slices. It is separate from product behavior so identity and data infrastructure can be verified without conflating infrastructure failures with family workflows.

## What Changes

- Establish the Vue, Vite, TypeScript, Tailwind, and PWA application baseline using the local `weather` project as a development reference.
- Establish local API simulation, automated format, lint, typecheck, unit, integration, build, Playwright, and accessibility verification.
- Replace the unused shared `family-paas` Cognito user pool with a username/password pool where email and phone are optional.
- Create a Todone Cognito app client, JWT-protected API route, and current-session probe.
- Create a dedicated on-demand DynamoDB table with point-in-time recovery and least-privilege application access.
- Define structured privacy-preserving logs, minimal health metrics, deployment, backup, and rollback procedures.

## Capabilities

### New Capabilities
- `deployable-pwa-foundation`: A secure, accessible, testable, and recoverable runtime foundation for the Todone PWA and API.

### Modified Capabilities

- None.

## Impact

- Affected systems: this repository, `family-paas` shared Cognito infrastructure and modules, AWS Cognito, API Gateway, Lambda, DynamoDB, S3, CloudFront, and CloudWatch.
- The unused shared Cognito pool will be replaced, changing its pool ID, ARN, issuer, and app clients. Execution MUST verify that the pool has no users or active consumers before apply.
- The change introduces no household, member, or Todo behavior beyond a protected current-session probe.
- Privacy implications: logs and telemetry MUST exclude credentials, JWTs, names, Todo content, and other family data.
- Success criteria: a deployed PWA can authenticate against the new pool, call a protected endpoint, and pass all required local quality checks.
