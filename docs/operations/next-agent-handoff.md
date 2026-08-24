# Next-agent handoff: Cognito administration and IAM foundation

## Goal of the next changeset

The identity-administration foundation is complete: `manage-family-accounts` tasks 2.2–2.3 add the typed Cognito adapter and a separate pool-scoped family-account Lambda role. No provisioning endpoint calls the adapter yet.

The next infrastructure slice is tasks 2.4–2.5: configure Cognito's static welcome template, built-in sender, retained verified-email behavior, and browser app-client attribute restrictions. After that, implement one provisioning vertical slice using the adapter only after application authorization.

Do not deploy or apply the reviewed IAM plan. No SES configuration, custom-message Lambda, member provisioning endpoint, or product UI was added by tasks 2.2–2.3.

## Current state

The working tree contains owner-approved uncommitted documentation changes that should be included
with the next implementation commit. The completed visual/family-directory changes are in commit
`6d0e713` (`pretty UI for family management`). No production deployment is implied by that commit.

Completed `manage-family-accounts` work:

- 1.1: reconciled Membership-state, endpoint/error/idempotency, activation, manual-repair, recovery-email, removal, and built-in Cognito email-delivery contracts.
- 2.1: explicit pre-signup trigger-source policy.
- 2.2: typed Cognito administration adapter with deterministic fake boundary and safe error taxonomy.
- 2.3: separate family-account runtime role with five pool-scoped Cognito actions and Todone-table-only data access.
- 3.1–3.3: self-only Profiles and the household-safe family directory.
- 3.4: canonical `vue-router` navigation and the child `/todos` placeholder.
- 3.5–3.6: accepted family-account HTML reference and responsive family/profile implementation.
- 7.0: approved local command families.

Tasks 1.2–1.6 are complete. The implementation uses a typed fail-closed resolution across DynamoDB and the in-memory test repository; unit and integration tests cover active, pending, inactive, stale-cutoff, malformed, and mismatched records as well as parent/child/cross-household target rules.

The separate `establish-visual-design-foundation` change has implementation tasks 1.1–2.3 complete. Its manual/final verification tasks 3.1–3.5 remain unchecked. They are not part of this backend changeset and must not be silently marked complete.

## Existing architecture to preserve

### Identity and trust boundary

- Cognito authenticates a global immutable username and supplies verified `sub`, username, and token `iat`. Username is a display/read copy, never an ownership key.
- Every household API derives the caller from the verified token and resolves `USER#<sub>/MEMBERSHIP`; it never accepts client-owned `sub`, household, member, role, activation state, or credential cutoff.
- Household scope comes only from the resolved active Membership. Cross-household and hidden targets use the same safe result as absence.
- Roles are immutable `parent` or `child`. Activation states are `ACTIVE`, `PENDING_ACTIVATION`, and `INACTIVE`. All parents are peers; the product has no parent removal, demotion, peer password reset, or peer profile-edit operation.
- Pending and inactive members have no household authority. An existing JWT is insufficient once Membership becomes inactive or its credential-validity cutoff rejects the token's `iat`.
- Membership resolution has typed `UNATTACHED`, `ACTIVE`, `PENDING_ACTIVATION`, `INACTIVE`, `CREDENTIALS_STALE`, and `INCONSISTENT` outcomes. Only a truly absent lookup produces `200 {"membership": null}`; other states are never routed to second-household setup.
- Additional-parent activation is the one narrow exception to active-Membership authorization: after Cognito completes `NEW_PASSWORD_REQUIRED`, `POST /api/v1/parent-activations` derives the pending identity only from the verified caller and atomically activates both Membership copies.

### Persistence boundary

- `lambdas/households/model.ts` defines the repository-facing domain types.
- `lambdas/households/keys.ts` owns DynamoDB key construction.
- `lambdas/households/repository.ts` contains both DynamoDB and in-memory implementations. Production membership resolution strongly reads the lookup, household, and household Membership.
- DynamoDB and in-memory repositories both resolve the full lookup, Household, and Membership tuple. Any malformed or inconsistent stored state is fail-closed; an absent lookup is the only `UNATTACHED` result.
- The in-memory repository has a test-only record seeding seam that models pending, inactive, cutoff, and inconsistent state without bypassing request authentication or handler authorization.
- Username and role are already copied to the lookup and household Membership during first-parent bootstrap. The directory reads username from Membership and makes no per-member Cognito call.
- The first-parent bootstrap lookup shape may lack the later `createdAt` metadata. Preserve read compatibility for that known legacy shape; new lookup writes include it, and no data migration is required for its absence alone.
- Profiles are self-only, versioned records. The canonical profile palette is shared from `shared/profilePalette.ts` and re-exported through household constants.

### Request and error boundary

- Handlers authenticate with `lambdas/shared/auth.ts`, then use `handleObservedRequest` and shared response helpers. Keep request IDs and coarse outcomes for success and failure.
- User-facing API copy and stable external identifiers belong in `src/i18n/en.yml` and the shared message/response catalogs. Raw AWS errors and internal consistency diagnostics never reach users.
- Logs and metrics must exclude credentials, codes, tokens, emails, usernames, `sub`, household/member IDs, household/profile values, and raw bodies.
- Authorization must precede domain reads that could reveal private data and must precede every future Cognito administration call.

## Remaining work

Tasks 2.4–2.5 own the remaining Cognito configuration. They configure the source-controlled static invitation template and built-in delivery, retain the old verified recovery email until replacement verification, and restrict browser email writes. No SES custom sender is planned. The first application vertical slice should follow only after that infrastructure contract is complete.

Task 2.5 has one external dependency: the pinned `family-paas` app-client module must expose an
explicit `write_attributes` input so Todone can set it to `[]`. The reviewed request is
`docs/architecture/family-paas-write-attributes-change-request.md`; do not fork or replace the
separately owned module locally. The current root Terraform contains the pool-side invitation and
staged-email settings, but task 2.5 remains incomplete until the module change, in-place plan, and
browser regression evidence are available.

## Suggested file-level plan

1. Implement and validate tasks 2.4–2.5 without apply.
2. Choose one complete child or pending-parent provisioning flow and wire authorization before adapter access.
3. Assign only privileged family-account mutation Lambdas to `family_account_admin_role_arn`; ordinary Lambdas retain the non-Cognito runtime role.

Prefer a small explicit API such as “resolve active membership,” “require active parent,” and operation-specific same-household target predicates over a generic policy engine. Keep authorization control flow explicit; do not encode security decisions in terse conditional expressions.

## Questions and review points

No product-owner decision is currently required to start tasks 2.4–2.5. If implementation exposes a materially different choice, pause and update the OpenSpec contracts before coding it.

Review these points carefully:

- Future handlers must authorize caller and target before resolving or invoking the adapter.
- Only privileged mutation Lambdas may use the family-account role; do not move session, Membership, profile, or directory handlers onto it.
- Adapter errors contain only a stable operation and safe failure kind. Never retain or log the AWS exception, metadata, username, email, password, or Cognito `sub`.
- `AdminUpdateUserAttributes` is shared deliberately by pending-email replacement and post-challenge email verification. Do not add a broader attribute-management operation.

## Verification and release boundary

Run at minimum:

```sh
npm run format:check
npm run lint:check
npm run typecheck
npm run test:unit
npm run test:integration
npm run build
npm run build:lambdas
npx openspec validate manage-family-accounts --strict
git diff --check
```

Use `npm run verify-local` as the aggregate non-browser check. Browser and accessibility suites are required only if this slice changes route/UI behavior; ideally it should not. Add focused security-negative tests for every authorization path changed.

For tasks 2.2–2.3, `terraform validate` passed and the saved targeted plan at
`/tmp/todone-family-admin.tfplan` showed four additions, zero destruction, and zero replacement:
the dedicated role, basic logging attachment, five-action pool-scoped Cognito policy, and
Todone-table-only policy. Because the real sensitive registration-gate variable was intentionally
unavailable, the plan used a non-secret placeholder and also displayed an unrelated pre-signup
Lambda in-place update from the existing artifact/config drift. Do not apply that saved plan; a
release owner must produce a full plan with the real secret input and reviewed artifact hashes.

Do not deploy, apply Terraform, alter production infrastructure, create real Cognito users, or run a production smoke without explicit human authorization. Infrastructure tasks 2.4–2.5 remain a separately reviewed later slice within the `family-paas` boundary.

## Files to load before starting

Load these in order.

### Instructions and active change

- `AGENTS.md`
- `docs/operations/next-agent-handoff.md`
- `openspec/changes/manage-family-accounts/proposal.md`
- `openspec/changes/manage-family-accounts/design.md`
- `openspec/changes/manage-family-accounts/tasks.md`
- `openspec/changes/manage-family-accounts/specs/family-account-management/spec.md`

### Cross-cutting contracts

- `docs/product/brief.md`
- `docs/architecture/api-conventions.md`
- `docs/architecture/data-model-and-access-patterns.md`
- `docs/architecture/system-context.md`
- `docs/security/authorization-matrix.md`
- `docs/security/threat-model.md`
- `docs/ux/global-user-flows.md`
- `docs/ux/interaction-states.md`
- `docs/ux/responsive-accessibility.md`
- `docs/testing/strategy.md`

### Existing identity, domain, persistence, and request code

- `shared/profilePalette.ts`
- `lambdas/shared/auth.ts`
- `lambdas/shared/request.ts`
- `lambdas/shared/responses.ts`
- `lambdas/shared/messages.ts`
- `lambdas/households/constants.ts`
- `lambdas/households/model.ts`
- `lambdas/households/keys.ts`
- `lambdas/households/familyValidation.ts`
- `lambdas/households/authorization.ts`
- `lambdas/households/repository.ts`
- `lambdas/households/runtime.ts`
- `lambdas/households/current.ts`
- `lambdas/households/profile.ts`
- `lambdas/households/directory.ts`
- `lambdas/households/create.ts`

### Existing tests that define the current boundary

- `src/test/lambdas/authorization.test.ts`
- `src/test/lambdas/credentialCutoff.test.ts`
- `src/test/lambdas/familyValidation.test.ts`
- `src/test/lambdas/householdValidation.test.ts`
- `src/test/lambdas/directory.test.ts`
- `src/test/integration/households.test.ts`

Load `src/components/ProductionBootstrap.vue`, router files, CSS, and browser tests only if a proposed backend change unexpectedly affects a public payload or route. UI work is not expected in this slice.
