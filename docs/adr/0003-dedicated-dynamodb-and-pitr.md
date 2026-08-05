# ADR 0003: Use a Dedicated DynamoDB Table with PITR

- Status: Proposed
- Date: 2026-08-05

## Context

Todone has bounded family-scale workloads, query-driven access patterns, low-cost requirements, and private household data that needs recovery protection. Sharing a table would widen IAM and recovery blast radius. Operating a relational database would add fixed cost and administration without a current relational requirement.

## Decision

Use one DynamoDB table dedicated to Todone with string `pk` and `sk`, on-demand billing, encryption at rest, and point-in-time recovery (PITR) enabled. Use a typed persistence boundary and add secondary indexes only for documented access patterns.

The runtime role can access only this table and its indexes. Normal request and authorization paths do not use table scans. Restores create a separate table and require data and authorization verification before any deliberate cutover.

## Consequences

- Workload isolation, least privilege, cost attribution, and restore operations are simpler.
- Usage-based requests, storage, indexes, and PITR incur cost, expected to be small at family scale.
- Data modeling must begin with explicit access patterns and conditional-write requirements.
- Cross-item invariants require transactions or documented idempotent repair behavior.
- PITR protects DynamoDB data but does not back up Cognito identities, secrets, or deployment configuration.
- A restore is an operator workflow, not a user-visible undo feature.
