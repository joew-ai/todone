# Data Model and Access Patterns

## Principles

- Amazon Cognito owns credentials and authentication attributes. DynamoDB MUST NOT store passwords, setup secrets, token values, or child recovery contact data.
- Cognito `sub` is the stable authenticated user identity. Username is immutable and globally unique but MUST NOT be an ownership key. Display name and profile color are mutable application data.
- Every application entity is owned by exactly one household unless it is a user-to-membership lookup required to find that household.
- Household IDs and all resource IDs are opaque identifiers. Possession of an identifier grants no authority.
- The server derives the caller's `sub` from a verified JWT, resolves active membership, and then uses the resolved household ID for all data access.
- All normal request paths use keyed `GetItem`, `Query`, transactional writes, or conditional writes. A table scan is prohibited for user-facing requests and authorization.
- Dates and recurrence round keys follow `docs/adr/0006-household-local-date-semantics.md`.

## Dedicated table

Todone uses one dedicated, on-demand DynamoDB table with string partition key `pk`, string sort key `sk`, encryption at rest, and point-in-time recovery enabled. Secondary indexes are added only for documented access patterns. The runtime role is scoped to this table and its indexes.

The following key families are canonical logical prefixes. An implementation may encapsulate serialization behind a typed persistence boundary, but it MUST preserve their ownership and query behavior.

| Item | Primary key family | Required attributes and invariants |
| --- | --- | --- |
| Household | `pk=HOUSEHOLD#<householdId>`, `sk=HOUSEHOLD` | Name, valid IANA timezone, created timestamp, version. |
| User membership lookup | `pk=USER#<sub>`, `sk=MEMBERSHIP` | Household ID, member ID, immutable role, active state. At most one active household per `sub`. |
| Membership | `pk=HOUSEHOLD#<householdId>`, `sk=MEMBER#<memberId>` | Cognito `sub`, immutable `parent` or `child` role, activation state, creation timestamp. |
| Profile | `pk=HOUSEHOLD#<householdId>`, `sk=PROFILE#<memberId>` | Mutable non-unique display name and palette color. No credential or recovery email. |
| Todo | `pk=HOUSEHOLD#<householdId>`, `sk=TODO#<todoId>` | Title, scalar assignee member ID, optional date-only due value, lifecycle, version, creation and completion metadata, optional label ID, and optional recurrence provenance. |
| Label | `pk=HOUSEHOLD#<householdId>`, `sk=LABEL#<labelId>` | Trimmed display name and case-folded comparison key, unique within the household. |
| Recurrence template | `pk=HOUSEHOLD#<householdId>`, `sk=TEMPLATE#<templateId>` | Future generation values, assignee, cadence, activation boundary, and retirement state. |
| Restricted deletion audit | Restricted key family not returned by product repositories | Full deleted Todo snapshot and metadata. Accessible only to an explicitly separate operator path and purged by applicable child-removal cascades. |

The logical prefixes do not permit direct string concatenation from unvalidated client values. Repository code validates identifier syntax and resolves ownership before building keys.

## Required access patterns

| Access pattern | Authorization and query requirement |
| --- | --- |
| Resolve current membership by JWT `sub` | Strongly read `USER#<sub>/MEMBERSHIP`; reject absent, inactive, or inconsistent membership. Do not accept a household ID from the client as a substitute. |
| Bootstrap one household for an unattached user | Condition that no user lookup exists, and atomically or idempotently create Household, initial parent Membership, and lookup. Concurrent retries produce one household. Profile data is introduced by the later family-account capability. |
| Read household and current member | Use household ID obtained from the active lookup, then keyed reads. |
| List active household members | Query the household member key range; exclude inactive or partially provisioned members. |
| Read or update one resource | Build the household partition from resolved membership and issue a keyed read or conditional write. Cross-household identifiers return no resource data. |
| List a child's active Todos | Query an assignee-and-lifecycle projection scoped by household and member. The API substitutes the child's own member ID regardless of client input. |
| List parent-visible active Todos | Query household active projections, optionally narrowed to an active household member. Do not scan all lifecycle records. |
| List history | Query chronological household history for a parent or chronological own-assignee history for a child. Restricted deletion audits are excluded. |
| Transition or edit a Todo | Use a conditional write on current version and allowed lifecycle. A stale caller receives current safe state or a conflict response; last-write-wins is prohibited. |
| Reassign a Todo | In one transaction or one atomic item update, validate the target active membership and move the assignee query projection. |
| Suggest labels | Query a household-scoped normalized-prefix projection. Case-folded uniqueness is enforced with a conditional uniqueness item or equivalent transactional condition. |
| Filter by label | Apply the label to an already role-scoped active/history query or a household/member/label projection. A filter MUST NOT broaden the authorized base set. |
| Generate a recurrence round | Query eligible templates server-side and conditionally create at most one Todo for `(templateId, cadenceRoundKey)`. Generation does not depend on a user login. |
| Remove a child | First make Membership inactive so all sessions fail closed. Query every registered child-associated entity and audit projection without a table scan, delete the full deployed cascade and application identity records, then delete the Cognito identity and release username reuse only after the application cascade succeeds. |

## Query projections

Todo query projections MUST support these dimensions without scanning:

- Household plus `ACTIVE`, ordered deterministically.
- Household plus assignee plus `ACTIVE`, ordered deterministically.
- Household history in reverse chronological order.
- Household plus assignee history in reverse chronological order.
- The same authorized sets narrowed by one label when the label capability is delivered.

Projection sort keys SHOULD begin with a lifecycle bucket followed by a canonical sortable date or UTC timestamp and Todo ID as a tie breaker. An item changes projections as part of the same successful lifecycle write. Active and historical results MUST be non-overlapping.

Recurrence storage MUST support discovery of templates eligible for a server-side generation window and conditional uniqueness by template and round key. It MUST NOT iterate every table item. Daily keys use local `YYYY-MM-DD`, weekly keys use the local Sunday `YYYY-MM-DD`, and monthly keys use local `YYYY-MM`.

## Entity rules

### Identity and membership

- `sub` never changes for an existing Cognito identity.
- Username is authentication data used for display only where the product requires it. It is not a partition key for owned data.
- A self-registered unattached identity can create exactly one household. Later household accounts are parent-provisioned.
- Role is set when Membership is created and is immutable. Parent removal/demotion and role mutation are not supported.
- An inactive or deleted Membership fails authorization even if a previously issued JWT remains cryptographically valid.

### Todo lifecycle

The initial states are `ACTIVE` and `COMPLETE`; lifecycle/history later adds `ARCHIVED`, `preArchiveStatus`, and restricted product-deletion snapshots. Overdue is always derived from due date and household timezone, never stored as a lifecycle state.

Completion, edit, archive, restore, undo/reopen, and deletion use versioned conditional writes. Completion actor and timestamp come from server identity and time. Current member name and color are resolved from Profile rather than copied onto Todos.

Recurrence may add `MISSED` and `SKIPPED` outcomes only to generated Todos. Template identity and round provenance remain after a generated Todo is detached from rollover. One-off Todos do not acquire recurrence outcomes.

### Labels

A Todo stores zero or one label ID, never a label-name snapshot. A Label stores display case and a separate trimmed, case-folded uniqueness key. Label records are household-local even when another household uses the same text.

## Write safety

- Server timestamps are UTC RFC 3339 instants. Date-only fields are validated separately and are never converted from a client timestamp.
- Creation operations that can be retried after an uncertain response use an idempotency key or a deterministic uniqueness condition.
- Multi-item invariants use `TransactWriteItems` or an equivalent design with explicit idempotent repair behavior.
- A client-supplied version is required for mutable versioned records. Conditional failure does not silently overwrite newer state.
- Repository return types distinguish not found, unauthorized, conflict, invalid state, and dependency failure without exposing cross-household existence.

## Deletion and recovery

Archive is reversible product behavior. Product deletion is irreversible in product APIs but may retain a restricted Todo audit snapshot. Full child-account removal is different: it first makes Membership inactive so stale sessions fail closed, then purges the child's identity-linked records, Todos, history, recurrence data, and restricted snapshots before the Cognito identity is deleted and the username is released.

Point-in-time recovery protects the table from accidental writes and deletion. A restore always creates a separate table and follows `docs/operations/backup-restore.md`; it does not bypass authorization or child-removal obligations.

## Change checklist

Every change that introduces an entity or query MUST document:

- Owning household and identity references.
- Primary key and every secondary projection it writes.
- Each read path and why it does not scan.
- Conditional, transaction, retry, and idempotency behavior.
- Cross-household and role-negative tests.
- Backup/restore implications.
- Whether the entity is child-associated and how full child removal deletes it and its audit data.
