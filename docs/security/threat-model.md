# Threat Model

## Scope and security goals

This model covers the Todone PWA, Cognito authentication, API Gateway, Lambda, the dedicated DynamoDB table, CloudWatch, static hosting, and the `family-paas` deployment boundary. It includes later household, account, Todo, label, history, and recurrence capabilities so their changes can inherit controls.

Security goals:

- Only an authenticated active member can access their household.
- Children and parents can perform only the role and ownership actions in `authorization-matrix.md`.
- No household can discover or access another household's identities or data.
- Credentials, setup secrets, tokens, recovery contacts, names, and Todo content do not leak through logs, caches, errors, URLs, or build artifacts.
- Mutations remain correct under retry, concurrency, stale clients, and partial dependency failure.
- Operators can deploy, roll back application artifacts, and restore DynamoDB deliberately without silent data loss or unauthorized production action.

## Assets

- Cognito passwords, refresh/access/ID tokens, verified recovery email, and setup secret.
- Stable Cognito `sub`, immutable username, household membership, and immutable role.
- Household name/timezone, member profiles, Todos, labels, recurrence templates, history, and restricted deletion audits.
- Production infrastructure credentials, Terraform state, deployment artifacts, CloudFront configuration, and AWS outputs.
- Availability and integrity of authentication, API, scheduled generation, and DynamoDB recovery.

## Trust boundaries

1. **Untrusted browser:** DOM, storage, service worker, routes, identifiers, device clock, timezone, and network responses can be manipulated.
2. **Internet edge:** CloudFront, Cognito, and API Gateway receive hostile traffic.
3. **Verified-token boundary:** API Gateway establishes token validity; it does not establish Membership or role.
4. **Household authorization boundary:** Lambda resolves active Membership and resource ownership for every operation.
5. **Persistence boundary:** DynamoDB and restricted audit data are reachable only through scoped roles and repositories.
6. **Operations boundary:** Human-controlled AWS/Terraform credentials can change or destroy production and are not available to the browser or runtime.
7. **Third-party software boundary:** npm packages, build actions, browser extensions, and CI dependencies may be compromised.

## Assumptions and exclusions

AWS managed-service security is relied upon for physical security, TLS endpoints, Cognito password storage, and DynamoDB encryption. Family members may know data they are legitimately shown; preventing a user from photographing their own screen is out of scope. A fully compromised user device or AWS administrator can defeat application controls, but least privilege, short sessions, no-secret logs, and operational review reduce impact.

## Threats and controls

| Threat | Primary controls | Required verification |
| --- | --- | --- |
| Credential guessing or enumeration | Cognito password policy/throttling; generic sign-in and recovery messages; no public child registration; setup-gated first-parent registration. | Invalid username/password responses are indistinguishable; throttling path is handled; secrets do not appear in logs. |
| Duplicate or impersonating username | Cognito case-insensitive global uniqueness and immutability; display name is separate and non-unique. | Case variants conflict; ownership always uses `sub`. |
| Token theft from storage, URL, logs, or cache | HTTPS; bearer token only in header; session material in memory/session-scoped storage, never URL, logs, Cache API, service-worker cache, or application database; CSP and XSS controls; `no-store` protected responses. | Inspect storage/cache/logs; token redaction tests; protected cache headers; sign-out clears local session state. |
| Forged, expired, wrong-issuer, or wrong-audience JWT | API Gateway JWT authorizer with exact issuer/audience; handlers accept only authorizer claims. | Negative integration tests prove rejection before handler data access. |
| Cross-household IDOR | Resolve household from verified `sub`; build keys from resolved household; verify every target; cross-household response matches absence. | Tests for every resource type and list/filter endpoint using another household's IDs. |
| Role escalation or client-side bypass | Immutable server-owned role; shared membership middleware plus operation-specific checks; no authorization bypass in tests. | Parent/child negative matrix tests; forged role/body/route fields ignored or rejected. |
| Removed member uses stale JWT | Active Membership checked on every household route; deletion fails closed until complete. | Removed-session integration test. |
| Setup secret disclosure or misuse | Store outside application data and source; validate server-side with constant-time secret comparison where applicable; never log; rotate through operator process; it creates only unattached accounts. | Invalid/valid tests, log inspection, and proof that supplied household IDs cannot join. |
| Parent peer administration | Target role and ownership checks before Cognito calls; recovery email is self-only. | Another parent cannot read email, reset password, remove, demote, or edit profile. |
| Child password/recovery exposure | TLS; no persistence/logging; parent-only reset for same-household child; child has no email requirement. | Secret-redaction and target-role negative tests. |
| XSS or malicious static content | Vue escaping by default; prohibit unsafe HTML for family content; strict CSP; dependency review; hashed assets; no secrets in build-time client config. | CSP/header test, rendered hostile strings, dependency audit review, build artifact secret scan. |
| CSRF or cross-origin API use | Bearer token in explicit header rather than ambient auth cookie; restrictive CORS; state changes never use GET. | Unapproved origins fail CORS; mutation without bearer token fails. CORS is not counted as authorization. |
| Service-worker privacy leak | Cache public versioned assets only; never cache protected/auth requests or responses; controlled cache version cleanup. | Automated service-worker/cache inspection after authenticated flows and logout. |
| Injection and malformed input | Schema validation, unknown-field rejection, typed persistence, no dynamic expression/path construction from raw input, escaped output. | Unit/fuzz boundary cases and hostile strings; no raw AWS error disclosure. |
| Overposting ownership or lifecycle fields | Endpoint allowlists mutable fields; server supplies household, actor, status, timestamps, and protected role fields. | Requests with extra ownership/state fields fail or are ignored according to schema, never applied. |
| Replay, duplicate write, or race | Idempotency keys, deterministic recurrence keys, transactions, and conditional versions. | Concurrent bootstrap, completion, edit, delete, label uniqueness, and generation tests. |
| Query/filter leaks sibling data | Authorize base set before label/filter application; child ID comes from Membership. | Child sibling-list and sibling-only-label tests return no sibling records. |
| Sensitive observability data | Structured allowlist logs only; no raw body/header/claim logging; coarse metrics; restricted retention/access. | Induced failures and authentication errors are inspected for forbidden fields. |
| Dependency or CI supply-chain compromise | Lockfile with `npm ci`; minimal dependencies; review install scripts and updates; pinned CI actions where used; no production credentials in untrusted jobs. | Dependency audit is reviewed, not blindly auto-fixed; build provenance/artifact hash recorded. |
| Runtime IAM escalation or data exfiltration | Dedicated table and configured Todone user pool; least-privilege runtime role; deployment/runtime separation; no Terraform state access. | Review effective IAM and negative access to unrelated resources. |
| Accidental table deletion/corruption | Dedicated table, PITR, human-reviewed plan, separate-table restore drill. | PITR inspection and periodic restore drill with item/access-pattern verification. |
| Accidental Cognito replacement | Immediate pre-apply empty-user and consumer check; manual apply; no pool recreation after users without migration plan. | Recorded check and reviewed plan. |
| Malicious or accidental production deployment | No deploy credentials for agents/CI by default; explicit human authorization; reviewed plan and artifacts; retained rollback targets. | Release record identifies human owner, commands, plan, artifact hashes, smoke, and rollback target. |
| Denial of service or runaway recurrence | Cognito/API throttling, bounded validation/page sizes, on-demand table, idempotent current-only generation, no elapsed backfill. | Limit and retry tests; generator duplicate/outage tests; cost review. |
| Backup restores deleted child data | Restore is isolated; before cutover reconcile deletion obligations and verify authorization; no automatic table swap. | Restore drill checks removed/inactive identities and restricted audit policy before any cutover. |

## Browser session policy

The browser uses Cognito's supported session flow. Token values may exist in memory and session-scoped browser storage needed to restore the current tab after reload. They MUST NOT be placed in `localStorage`, IndexedDB, URLs, service-worker caches, product data, or logs. Session storage is treated as XSS-readable, so CSP, dependency control, and no-unsafe-HTML rules are required; it is not described as a secure vault.

Protected API responses use `Cache-Control: no-store`. Signing out clears token/session storage and private client state. Session expiration blocks writes and routes to sign-in. Server-side active Membership checks provide revocation of household access independent of token expiry.

## Privacy-safe logging allowlist

Allowed fields: UTC timestamp, request ID, route template, method, status, latency, deployment version, coarse outcome/error code, and aggregate authorization-denial count.

Forbidden fields: authorization headers, JWTs or claims beyond an ephemeral in-process authorization use, passwords, setup secrets, recovery email/phone, username where avoidable, `sub`, household/member/resource IDs, household names, display names, profile colors, Todo titles/content, label names, request/response bodies, and raw Cognito/AWS errors. If diagnosis needs a resource correlation, add a separately reviewed non-reversible diagnostic token rather than logging the identifier by default.

## Security ownership and cadence

The implementing engineer owns threat-linked tests and safe defaults. The reviewer owns authorization-matrix and data-flow review. The `family-paas` owner owns infrastructure IAM, public exposure, outputs, and plan evidence. The human release owner owns production authorization and smoke evidence. The operator owns setup-secret rotation, identity repair, restore drills, and incident response.

Review this model for every new entity, endpoint, dependency, token storage change, public route, Cognito permission, service-worker strategy, log field, deployment path, or child-removal cascade extension. A discovered cross-household access, secret exposure, authorization bypass, or unrecoverable destructive plan blocks release.
