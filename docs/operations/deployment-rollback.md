# Deployment and Rollback

## Policy

Todone has one production environment and no staging environment. Local simulation and automated CI are pre-production verification only. Production deployment is manual, reviewed, and owned by an explicitly authorized human release owner.

An agent or CI job MUST NOT apply Terraform, upload or publish production artifacts, change Cognito, update Lambda, invalidate CloudFront, create a production verification account, modify production data, or run a live authenticated smoke test without explicit human authorization for that action. A request to prepare or review a release is not deployment authorization.

## Roles

| Role | Responsibility |
| --- | --- |
| Implementing engineer | Produces reviewed source, passing local checks, build artifacts, migration notes, and rollback compatibility assessment. |
| `family-paas` owner | Produces repository-specific validation commands, reviewed Terraform plan, output contract, IAM/cost evidence, and infrastructure rollback notes. |
| Human release owner | Gives explicit authorization, executes production-changing commands, records results, performs smoke, and decides rollback/roll-forward. |
| Operator/reviewer | Independently reviews destructive changes, Cognito preconditions, data compatibility, logs/metrics, and release record. |

One person may hold several human roles for this family deployment, but the responsibilities must still be performed and recorded.

## Required release record

Create a private release record in an operator-approved location that is not public source control and is not excluded from backup/retention policy. It remains outside this repository unless a separate approved, access-controlled documentation location is established. Include:

- Date/time, release owner, reviewer, source commit, and change names.
- Clean-install verification command outputs.
- Frontend and Lambda artifact immutable IDs or cryptographic hashes.
- Reviewed `family-paas` plan identifier and exact command supplied by that repository.
- Current and prior frontend/Lambda deployment identifiers.
- Data-model compatibility and migration/rollback decision.
- Cognito emptiness/consumer evidence when pool replacement is planned.
- Explicit authorization statement and scope.
- Deployment commands actually run, result, smoke result, metrics/log observations, and rollback/roll-forward decision.

Do not put credentials, setup secrets, passwords, token values, recovery email, family data, or raw Terraform state in the record.

## Pre-deployment gate

The implementing engineer runs from a clean checkout or otherwise proves a clean dependency install:

```sh
npm ci
npm run format:check
npm run lint
npm run typecheck
npm run test:unit
npm run test:integration
npm run build
npm run test:e2e
npm run test:a11y
```

These scripts are the target contract established by the application-foundation implementation. If a script does not yet exist, the gate is not satisfied; do not substitute an undocumented partial command and claim completion.

The reviewer then confirms:

1. The diff contains only intended changes and approved generated artifacts.
2. OpenSpec/product, architecture, security, UX, testing, and operations documents remain coherent.
3. Browser assets contain no secrets or production credentials.
4. Changed APIs remain backward-compatible with the frontend deployment order, or a deliberate maintenance/roll-forward plan exists.
5. Data writes are compatible with the prior Lambda during the rollback window. Destructive migrations require a separate approved plan and backup evidence.
6. The prior frontend and Lambda artifacts still exist and are identifiable.
7. The `family-paas` owner has run its exact repository-specific format, validation, policy-test, and plan commands and supplied outputs. Todone does not prescribe that repository's internals.
8. The Terraform plan contains only expected resources, IAM, outputs, and cost. Any replacement or deletion is called out explicitly.
9. DynamoDB is dedicated, on-demand, encrypted, and PITR-enabled before product data is written.
10. Runtime IAM cannot access unrelated tables, pools, deployment controls, or Terraform state.

## Cognito replacement gate

Replacing the legacy shared pool is destructive. Immediately before an authorized apply, the release owner reruns the `family-paas`-documented read-only checks and records that:

- The pool contains zero users.
- No app client, authorizer, deployed application, configured environment, or repository consumer depends on the pool ID, ARN, issuer, domain, or client IDs.
- The reviewed plan replaces only the intended unused pool resources.

If any user or consumer exists, stop. Do not apply, delete, import, or force replacement. A separate identity migration decision is required.

## Deployment sequence

The exact infrastructure/app publication commands are supplied and owned by `family-paas`; this document intentionally does not invent its module paths or wrappers. After explicit authorization, the human release owner executes the recorded commands in this order unless the reviewed compatibility plan requires a safer order:

1. Reconfirm source commit, target AWS account/region/environment, artifact hashes, current deployment IDs, and authorization scope.
2. Capture current outputs and verify PITR/backup readiness using `backup-restore.md`.
3. Rerun the saved infrastructure plan or regenerate/re-review it if any input or state changed. Never apply a stale or different plan silently.
4. Apply non-destructive/backward-compatible infrastructure required by both old and new application versions.
5. Publish the immutable Lambda artifact and update the API to its reviewed version.
6. Publish hashed frontend assets, then update the shell/manifest/service-worker deployment using the platform's atomic/versioned mechanism.
7. Verify CloudFront serves expected content types and production URL, and that protected responses are `no-store` and absent from service-worker caches.
8. Run the authorized smoke test.
9. Observe API error count, latency, authorization denials, and structured logs long enough to catch immediate release failures. Inspect only privacy-safe fields.
10. Record deployed and prior identifiers and close the release only after success evidence is complete.

## Foundation smoke test

The human release owner performs this non-destructive browser flow with the verification-only account:

1. Open the canonical production URL in a clean browser context and verify the PWA shell loads.
2. Confirm keyboard focus, labels, and responsive layout at one target viewport.
3. Sign in through the temporary username/password form without recording the credentials.
4. Confirm the live protected endpoint response presents exactly `sub`, `username`, and `expiresAt` and no household/profile data.
5. Sign out and confirm private state is cleared.
6. Confirm a protected request without authentication is rejected with no session data.
7. Confirm logs contain request ID, route, status/outcome, and no token, credentials, username, `sub`, or family content.

Later releases replace this probe with the smallest non-destructive critical flow for delivered capabilities. Do not create, edit, or delete real family data merely to smoke-test when synthetic/reversible verification is available.

## Rollback decision

Roll back application artifacts when the release causes client load failures, authentication/protected-route regression, elevated errors/latency, accessibility failure on a critical flow, or incorrect behavior and the prior version is data-compatible. Prefer roll-forward when new writes or infrastructure are not backward-compatible.

Do not "roll back" by applying an old Terraform plan, recreating Cognito, replacing the DynamoDB table, restoring a backup over production, or deleting resources. Those are separately reviewed production/data operations.

## Application artifact rollback

After explicit human authorization:

1. Stop further release changes and record the reason and first known affected version.
2. Determine whether new data written by the release is readable/safe under the prior Lambda and frontend.
3. Use the `family-paas`-owned command to repoint Lambda to the retained prior immutable artifact/version.
4. Use the platform-owned static deployment mechanism to restore the prior frontend shell/manifest and artifact set. Do not overwrite hashed assets needed by active clients.
5. Perform any reviewed CloudFront invalidation required for the shell only; do not invalidate blindly.
6. Repeat authentication/protected API smoke and confirm error, latency, denial, and privacy-safe log behavior.
7. Record actual rollback IDs and whether follow-up data repair is required.

If the prior application cannot safely read new data, keep the safest compatible version deployed and execute a reviewed roll-forward fix. Do not mutate production records ad hoc.

## Infrastructure and data incidents

- **Failed Terraform apply:** Stop, inspect state and AWS reality using `family-paas` procedures, regenerate a plan, and choose completion or targeted repair. Never retry blindly or edit state manually without a separate approved platform procedure.
- **Cognito partial identity operation:** Product access fails closed through Membership. Follow the platform's AWS/CLI orphan repair procedure; never log/reset a password in the release record.
- **DynamoDB corruption/deletion:** Follow `backup-restore.md`. Restore to a separate table and verify before a separately authorized cutover.
- **Compromised secret/token:** Stop deployment, rotate/revoke through the owning system, inspect privacy-safe evidence, and invalidate affected sessions where supported. Do not paste the value into tickets or logs.

## Post-deployment documentation

Update the private release record, not OpenSpec task checkboxes automatically. An OpenSpec deployment/smoke task remains incomplete if explicit authorization was not granted or the smoke did not run. Documentation or plan completion must never be represented as production deployment completion.
