# Family PaaS Handoff

## Purpose

This is the requirements contract for a separate agent working in the `family-paas` repository. That repository owns its Terraform/module layout, resource decomposition, naming implementation, CI integration, and migration mechanics. This handoff specifies Todone's required inputs, behavior, outputs, and verification without prescribing internal `family-paas` design.

The separate agent MUST return a reviewed plan and evidence to the Todone operator. It MUST NOT deploy or alter production resources without explicit human authorization.

## Preconditions and discovery

Before proposing replacement of the existing shared Cognito pool, the `family-paas` agent must:

1. Identify every user, app client, authorizer, stack output, repository reference, and deployed consumer of that pool.
2. Prove the pool contains no users and no active consumer depends on its pool ID, ARN, issuer, domain, or app clients.
3. Record the exact read-only commands and timestamp used for the proof.
4. Stop and report a blocker if a user or consumer exists. Do not plan destructive replacement under that condition.

The precondition must be repeated immediately before an authorized apply because discovery evidence can become stale.

## Required platform behavior

### Cognito user pool

Provide a Todone-compatible pool with these externally observable properties:

- Username/password authentication with case-insensitive usernames.
- Usernames are globally unique within the pool and immutable after account creation.
- Cognito `sub` remains the stable identity and is present in issued tokens.
- Email and phone are optional pool attributes. A later Todone flow can require and verify email for parent recovery without requiring either attribute for child accounts.
- Default Cognito password policy and throttling are enabled. No custom adaptive-security or bespoke lockout system is required by this handoff.
- Self-registration behavior must support Todone's later Cognito pre-signup registration-gate trigger; the platform must not create a public path to join an existing household.
- Administrative account creation, permanent child password setting/reset, deletion, and parent email verification can be granted later through narrowly scoped runtime permissions.

### PWA app client

Provide a dedicated Todone browser client:

- It is a public client and MUST NOT require or expose a client secret in browser assets.
- It supports the reviewed username/password and session refresh behavior selected for the PWA.
- Callback, logout, and allowed-origin configuration is limited to explicit local development origins and the production Todone origin.
- Token validity and revocation settings are documented for Todone session handling.

### Static application hosting

Provide HTTPS static hosting compatible with a Vue/Vite PWA:

- A private origin and CloudFront delivery path suitable for versioned assets.
- SPA navigation fallback without converting missing static assets or API paths into the application shell.
- Correct manifest, service-worker, JavaScript, CSS, icon, and HTML content types.
- A deployment mechanism that retains or can identify the prior frontend artifact for rollback.
- Outputs for the canonical production URL and distribution identity needed by the authorized release process.

### Protected API

Provide a Todone API Gateway HTTP API and Lambda integration with:

- A JWT authorizer configured for the exact Cognito issuer and Todone app-client audience.
- A protected route that can serve `GET /api/v1/session`.
- Rejection of a missing or invalid JWT before the Lambda application handler executes.
- CORS restricted to the explicit Todone origins.
- HTTPS-only public access and privacy-safe access logging.
- A deployable Lambda artifact reference that can retain or identify the previous version for rollback.

Todone application code owns the current-session response and all household authorization. The platform must pass verified claims, including `sub` and username, without treating username as ownership.

### Dedicated DynamoDB table

Provide one table dedicated to Todone:

- String partition key `pk` and string sort key `sk`.
- On-demand billing.
- Encryption at rest.
- Point-in-time recovery enabled.
- Support for secondary indexes required by `data-model-and-access-patterns.md` as Todone capabilities are delivered.
- No resource policy or runtime role that grants unrelated applications access.
- Deletion protection or an equivalent reviewed safeguard appropriate to the repository's production convention, with any exception documented.

### IAM

The Todone runtime role must:

- Read and write only the dedicated Todone table and its indexes.
- Emit only required logs and metrics.
- Receive only the explicit Cognito administrative actions required by the currently deployed Todone capabilities, scoped to the Todone pool wherever AWS supports resource scoping.
- Exclude Terraform state, S3 deployment credentials, CloudFront mutation, IAM administration, unrelated tables, and unrelated user pools.

The deployment role and runtime role are separate trust principals.

### Logs, metrics, and cost

Provide CloudWatch support for structured application logs and metrics for API error count, API latency, and authorization denials. Configuration must permit request ID, route template, status, latency, and coarse outcome while excluding credentials, JWTs, setup secrets, recovery contacts, names, Todo content, labels, and raw request/response bodies.

Use existing free or low-cost platform conventions. Do not add paid analytics, tracing, alerting, or monitoring products unless separately reviewed and approved. Apply the platform's normal ownership and environment tags.

## Required inputs from Todone

The `family-paas` implementation may require these non-secret inputs:

- Application/environment identifier for the single production environment.
- Production domain or hostname.
- Explicit local development origins and production origin.
- Static and Lambda artifact identifiers supplied by the release process.
- Requested DynamoDB secondary-index contracts when each application capability is implemented.

Raw passwords, registration gate values, verification-account credentials, and live token values are not Terraform variables, outputs, logs, or handoff artifacts. A derived registration-gate SHA-256 hash may be supplied as sensitive Lambda environment configuration, but it is never output or logged.

## Required outputs

Expose machine-readable outputs, using names consistent with `family-paas` conventions, for all values Todone must configure or verify:

| Output contract | Required value |
| --- | --- |
| Cognito pool identity | User pool ID and ARN. |
| JWT verification | Exact issuer URL and app-client audience/client ID. |
| Cognito location | AWS region and any endpoint/domain needed by the selected browser flow. |
| PWA client | Public app-client ID and non-secret session configuration needed by Todone. |
| API | Base URL and protected-authorizer identity. |
| Static site | Canonical production URL and non-secret distribution/deployment target identity. |
| DynamoDB | Dedicated table name and ARN, PITR status inspectability, and index names. |
| Runtime | Lambda/function identity and runtime role ARN for least-privilege review. |
| Observability | Log-group identities and metric namespace or equivalent query locations. |
| Rollback | Immutable or versioned identifiers for the currently deployed and immediately prior frontend and Lambda artifacts. |

No output may contain credentials, client secrets, token values, setup secrets, Terraform state secrets, or production family data.

## Verification contract

The `family-paas` agent must report the repository's exact commands rather than assuming directory or wrapper names from this document. Evidence must include:

- Repository format and validation commands passing.
- Relevant infrastructure unit/policy tests passing.
- A saved, reviewed Terraform plan for the intended production workspace with no unreviewed destructive changes.
- Plan evidence that the table is dedicated, on-demand, encrypted, and PITR-enabled.
- IAM review proving the runtime cannot access unrelated tables, user pools, deployment control, or Terraform state.
- Authorizer inspection proving issuer and audience match outputs.
- A pre-apply Cognito emptiness and consumer check.
- Cost-impact summary.
- Rollback impact summary, explicitly covering the non-reversibility of replacing a pool after users exist.

If deployment is explicitly authorized, the human operator, not the agent, owns apply and the live smoke test described in `docs/operations/deployment-rollback.md`. If authorization is absent, return plan evidence only and leave deployment incomplete.

## Acceptance criteria

The handoff is accepted when a Todone reviewer can configure the application solely from non-secret outputs, verify JWT and least-privilege boundaries, confirm PITR, identify rollback artifacts, and follow documented repository-specific validation commands without needing to infer hidden platform behavior.

## Explicit non-requirements

This handoff does not require or prescribe:

- A particular Terraform module decomposition, file path, state layout, naming algorithm, or CI provider.
- A staging environment.
- Automatic production deployment.
- Native mobile infrastructure.
- Offline mutation synchronization.
- Product analytics, email notifications, or paid monitoring.
- Household, Membership, Todo, label, or recurrence business logic inside `family-paas`.
