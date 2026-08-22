# Authorization Matrix

## Principals

| Principal | Meaning |
| --- | --- |
| Anonymous | No valid Cognito JWT. |
| Unattached account | Authenticated first-parent registrant with no Membership. |
| Child | Authenticated user with an active immutable `child` Membership. |
| Parent | Authenticated user with an active immutable `parent` Membership. All parents are peers. |
| Scheduler | Non-user runtime path that generates/reconciles recurrence under a narrowly scoped service role. |
| Operator | Human with separately authorized AWS/deployment access. Not an application household role. |

Authentication proves a Cognito `sub`. Each application request then resolves active Membership. UI visibility is not authorization.

## Session

| Operation | Anonymous | Unattached | Child | Parent | Additional server rule |
| --- | --- | --- | --- | --- | --- |
| Load public PWA assets | Allow | Allow | Allow | Allow | Public static assets only; no private API cache. |
| Read current session | Deny | Self | Self | Self | Valid JWT; return exactly `sub`, `username`, `expiresAt`. |
| Sign out | No session | Self | Self | Self | Clears caller session only. |

## Bootstrap and recovery

| Operation | Anonymous | Unattached | Child | Parent | Additional server rule |
| --- | --- | --- | --- | --- | --- |
| Register first-parent account | With valid registration gate | Deny while signed in | Deny | Deny | Pre-signup trigger validates the gate; creates unattached identity only; cannot accept a join target; requires unique username and verified parent email. |
| Sign in / initiate parent Forgot Password | Allow | Allow | Allow sign-in only | Allow | Cognito rules; recovery requires that account's verified email; generic responses. |
| Create household | Deny | Self once | Deny | Deny | No existing user lookup; atomically/idempotently creates Household and initial parent Membership. |
| Read current household/membership | Deny | Returns no membership only | Own household | Own household | Derive by `sub`; never trust requested household ID. |

## Profiles and family accounts

| Operation | Child | Parent | Additional server rule |
| --- | --- | --- | --- |
| Read active household member directory | Household-safe fields | Household-safe fields | Same active household; never include recovery email. |
| Edit display name/profile color | Self only | Self only | Target Membership active; color paired with name. |
| Read/change recovery email | Deny | Self only | Cognito-backed verified replacement; another parent cannot read it. |
| Create child account | Deny | Allow | Same household; globally unique username; role fixed `child`; password never stored/logged. |
| Create parent account | Deny | Allow | Same household; role fixed `parent`; activation requires target's verified email and self-selected password. |
| Reset child password | Deny | Same-household child | Reject parent target before Cognito call. |
| Remove child account | Deny | Same-household child | Explicit confirmation and complete deployed cascade before username reuse. |
| Remove/demote parent or change any role | Deny | Deny | No such product operation. |
| Repair partial provisioning/removal | Deny | Deny | Separately authorized operator only; no product UI. |

## Todos and history

| Operation | Child | Parent | Additional server rule |
| --- | --- | --- | --- |
| Create Todo | Deny | Allow | Exactly one active same-household assignee in initial slice. |
| Read active Todos | Own assignments only | Household/member lists | Child target ID is server-derived; filters cannot broaden the base set. |
| Complete active Todo | If current assignee | Any household Todo | Conditional current `ACTIVE` state; actor from caller `sub`. |
| Edit title/due/assignee | Deny | Active household Todo | Completed/archived metadata immutable; target assignee active in household. |
| Read history | Own current assignments only | Household history | Restricted deletion audits excluded. |
| Undo completion | Own assignment only when child was completion actor | Reopen any household completion | One conditional completed-to-active transition. |
| Archive active/complete Todo | Deny | Allow | Preserve pre-archive state; generated rollover-bound Todo becomes `SKIPPED`. |
| Restore archived Todo | Deny | Allow | Restore exact pre-archive active/complete state; `SKIPPED` is irreversible. |
| Delete Todo from product | Deny | Allow with confirmation | Active, complete, or archived; writes restricted audit snapshot. |
| Read restricted deletion audit | Deny | Deny | Separately authorized operator path only; never a product API. |
| Correct generated `MISSED` to `COMPLETED` | Deny | Allow | Same household; records parent and correction time. |

## Labels and recurrence templates

| Operation | Child | Parent | Scheduler | Additional server rule |
| --- | --- | --- | --- | --- |
| Read label filter options | Household label names | Household labels | Deny | Child may see options but no sibling Todo data. |
| Create/select/clear Todo label | Deny | Allow where Todo lifecycle permits | Deny | Same household; active/complete mutable, archived immutable. |
| Filter active/history by label | Own authorized set | Household authorized set | Deny | Filter runs after role scoping. |
| Create/edit/retire recurrence template | Deny | Allow | Deny | Same-household active assignee; future generation only. |
| Read templates | Deny unless later explicitly specified | Household | Service need only | No client identifier grants authority. |
| Generate/reconcile rounds | Deny | Deny | Allow | Eligible templates only; current period only; conditional unique round key. |

## Operator and infrastructure operations

| Operation | Application users/runtime | Operator rule |
| --- | --- | --- |
| Terraform plan | Deny | Read-only plan may be prepared by an agent; a human reviews destructive changes and cost. |
| Terraform apply / production deploy | Deny | Explicit human authorization required for each production change. CI/agent success is not authorization. |
| Inspect/repair Cognito orphan | Deny | Authorized operator, pool-scoped commands, no secret logging. |
| DynamoDB restore | Deny | Authorized operator restores to a separate table, verifies data/isolation, and separately approves cutover. |
| Roll back frontend/Lambda | Deny | Human release owner selects retained artifact and verifies smoke path. |

## Enforcement rules

1. API Gateway rejects an invalid JWT before protected handlers.
2. Lambda derives `sub` only from verified claims and reads a lookup plus matching active Membership for every household route; pending, inactive, or inconsistent records deny access.
3. Data keys use the resolved household, not a client household field.
4. The operation checks role, target membership, ownership, and lifecycle before persistence or Cognito administration.
5. Cross-household or hidden resources return the same safe result as absence.
6. Membership removal takes effect on the next API call even if a JWT remains valid.
7. Every matrix row that permits one role and denies another has integration tests for allow, role denial, cross-household denial, inactive membership, and forged identifiers.
8. New endpoints are blocked from release until this matrix and its tests are updated.
