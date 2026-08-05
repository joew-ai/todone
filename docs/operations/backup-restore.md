# Backup and Restore

## Recovery objectives and scope

The dedicated Todone DynamoDB table uses continuous point-in-time recovery (PITR). PITR is the canonical backup for application data and supports restoration to a new table within AWS's available recovery window. It does not restore Cognito passwords/tokens, setup secrets, static artifacts, Lambda artifacts, CloudFront configuration, or Terraform state.

Todone has no automatic failover and no promised minute-level recovery service level. The operating objective is deliberate recovery without making corruption worse:

- **Application data recovery point objective:** Best available DynamoDB PITR point, normally within minutes of an incident and constrained by AWS's reported earliest/latest restorable times.
- **Recovery time objective:** Same day for this family-scale service when an authorized operator is available; correctness and household isolation take priority over speed.

If stronger objectives become a product requirement, revisit architecture, cost, and drills before claiming them.

## Ownership and no-deploy rule

| Role | Responsibility |
| --- | --- |
| `family-paas` owner | Enables PITR, encryption, dedicated-table outputs, least privilege, and safe configuration/cutover mechanisms. |
| Todone operator | Checks backup health, declares incident scope, authorizes restore, verifies restored data, and records/disposes drill resources. |
| Application reviewer | Verifies entity counts, access patterns, schema compatibility, deletion obligations, and authorization against the restored copy. |
| Human release owner | Separately authorizes any application configuration change or production cutover. |

Agents may prepare read-only commands and analyze output. They MUST NOT start a restore, change the application's table target, copy production records, delete a table, disable PITR, or cut over production without explicit human authorization.

## What is protected

PITR includes DynamoDB items and index definitions represented by the source table at the selected time, subject to AWS restore behavior. It protects Household, Membership lookup, Profile, Todo, Label, RecurrenceTemplate, projections, and restricted audits stored in the table.

Separately retain through platform/repository controls:

- Reviewed infrastructure source and protected Terraform state/backups.
- Immutable frontend and Lambda artifacts for current and prior releases.
- Non-secret deployment outputs and release records.
- Setup secrets in their owning secret store with a rotation process, not in DynamoDB.

## Cognito limitation

Cognito user credentials and original `sub` identities are not recoverable through DynamoDB PITR. Prevent accidental pool loss through manual reviewed deployment, immediate pre-apply consumer/user checks, and prohibition on pool replacement after users exist without a migration plan.

A lost populated user pool is a disaster requiring a separately designed identity recovery/migration. Creating replacement users would issue new `sub` values and MUST NOT be pointed at restored Membership data without an explicit verified mapping and security review. This runbook does not pretend that DynamoDB recovery restores authentication.

## Backup health check

The operator uses read-only AWS credentials scoped to inspect the Todone table. Values come from reviewed `family-paas` outputs, never guessed from production names.

```sh
export AWS_PROFILE="<authorized-read-profile>"
export AWS_REGION="<todone-region>"
export TODONE_TABLE_NAME="<family-paas-output>"

aws dynamodb describe-continuous-backups \
  --profile "$AWS_PROFILE" \
  --region "$AWS_REGION" \
  --table-name "$TODONE_TABLE_NAME"
```

Record `PointInTimeRecoveryStatus=ENABLED`, `EarliestRestorableDateTime`, and `LatestRestorableDateTime` without recording item data. Also verify the table is active, dedicated, and encrypted:

```sh
aws dynamodb describe-table \
  --profile "$AWS_PROFILE" \
  --region "$AWS_REGION" \
  --table-name "$TODONE_TABLE_NAME"
```

Run this check after initial provisioning, after infrastructure changes affecting the table, and before a production deployment that changes persistence. Failure to prove PITR is enabled blocks data-bearing deployment.

## Incident preparation

Before restoring:

1. Stop or disable the faulty writer through an explicitly authorized application action if ongoing writes worsen corruption. Do not destroy evidence or casually take the service offline.
2. Record incident time range, current application/deployment IDs, table ARN, suspected affected entities/access patterns, and timezone used for operator timestamps.
3. Inspect privacy-safe logs and release records to select a UTC restore instant before the bad write but after required good writes where possible.
4. Confirm AWS reports that instant within the restorable range.
5. Review data written after the selected instant. A cutover would lose those writes; decide whether reconciliation is possible and authorized.
6. Choose a new target table name that clearly identifies a restore/drill and cannot be confused with production.
7. Obtain explicit human authorization for restore creation. This authorization does not also authorize production cutover.

## Restore to a separate table

Use either an explicit UTC timestamp or, for a drill only when acceptable, AWS's latest restorable time. Never restore over or delete the source table.

```sh
export RESTORE_TIME="2026-08-05T18:30:00Z"
export RESTORE_TABLE_NAME="${TODONE_TABLE_NAME}-restore-20260805t183000z"

aws dynamodb restore-table-to-point-in-time \
  --profile "$AWS_PROFILE" \
  --region "$AWS_REGION" \
  --source-table-name "$TODONE_TABLE_NAME" \
  --target-table-name "$RESTORE_TABLE_NAME" \
  --restore-date-time "$RESTORE_TIME"
```

Wait and inspect with read-only commands:

```sh
aws dynamodb wait table-exists \
  --profile "$AWS_PROFILE" \
  --region "$AWS_REGION" \
  --table-name "$RESTORE_TABLE_NAME"

aws dynamodb describe-table \
  --profile "$AWS_PROFILE" \
  --region "$AWS_REGION" \
  --table-name "$RESTORE_TABLE_NAME"
```

Do not assume restore reproduces every operational setting. Compare billing mode, encryption, indexes, tags, PITR state on the new table, deletion safeguards, resource policies, TTL if introduced later, and IAM/application references. Enable or alter restored-table controls only through the separately reviewed `family-paas` process.

## Data verification

The application reviewer uses a read-only verification role scoped to the restored table and a purpose-built offline verifier. Do not point the production Lambda or PWA at the restored table for inspection.

Verification must record aggregate evidence, not family content:

1. Table and index status is active and schema matches the selected application version.
2. Entity and projection counts are internally plausible. Do not publish names, titles, usernames, emails, or raw items.
3. Every required access pattern in `docs/architecture/data-model-and-access-patterns.md` returns consistent base/projection records without scans.
4. User lookup, Membership, and Household references agree; inactive/removed users do not become authorized merely because older data was restored.
5. Active and history projections are non-overlapping and lifecycle/version invariants hold.
6. Label uniqueness and recurrence `(templateId, roundKey)` uniqueness hold for delivered capabilities.
7. Restricted audit records remain inaccessible to product repository/query paths.
8. The selected point contains the intended pre-incident state and the scope of post-point data loss is understood.
9. Full child-removal obligations are reconciled against current Cognito/application reality. A restore MUST NOT reintroduce deleted-child data into active production.

Run the full application verification suite against an isolated local/test configuration where feasible:

```sh
npm run test:unit
npm run test:integration
npm run build
```

These scripts must not target production Cognito or the production table. The restore verifier and table configuration mechanism are implementation tasks; if they do not exist, production cutover is blocked rather than verified by ad hoc broad scans.

## Cutover decision

Creating and validating a restored table does not authorize cutover. The human release owner and operator must separately approve a reviewed `family-paas` plan that:

- Points only Todone's runtime at the verified restored table.
- Preserves the original table intact and write-protected for investigation.
- Applies required encryption, PITR, tags, indexes, safeguards, and least-privilege IAM to the restored table.
- Uses an application version compatible with the restored schema.
- Defines treatment of good writes after the restore instant.
- Prevents restored stale Membership or deleted-child records from authorizing access.
- Names an application rollback target and a data roll-forward plan.

After authorized cutover, run a non-destructive authentication and authorized-read smoke, verify cross-household denial using synthetic approved test identities if available, and monitor error/latency/denial metrics. Do not expose raw restored records through debugging endpoints.

## Restore drill

Perform a drill after initial data-table provisioning and after material data-model, index, IAM, or restore-process changes. For a quiet family system, also perform at least annually while it remains in use.

A drill:

1. Checks PITR health.
2. Restores the latest safe point to a separate clearly named table after authorization.
3. Verifies configuration and aggregate data/access-pattern invariants.
4. Does not point production at the table.
5. Records duration, commands, restorable range, aggregate results, gaps, and follow-up owner without private content.
6. Deletes the drill table only after explicit human approval and retention of safe evidence.

Deletion is a production-account change even for a drill table. Use the platform-owned reviewed command/process, verify the target ARN/name twice, and never delete the source table.

## Failure and escalation

- PITR disabled or restorable range missing: stop data-bearing deployment and repair through `family-paas`.
- Restore command fails: preserve output/request ID, verify account/region/table and permissions, and do not broaden IAM casually.
- Verification finds inconsistent references/projections: do not cut over; select another restore point or implement a reviewed offline repair.
- Cognito and restored Membership disagree: fail closed and design a deliberate reconciliation. Do not rewrite `sub` values by guess.
- Source table is missing: preserve restored/original evidence, prevent application writes, and escalate to the human operator before any reconfiguration.

## Sensitive-data handling

Production item exports are not part of the normal backup plan. Do not download raw tables to developer laptops, attach records to issues, paste data into chat, or commit data. If a narrowly scoped export is required for incident recovery, it needs explicit authorization, encrypted storage, least-privilege access, an owner, an expiry/deletion date, and a record that excludes the data itself.
