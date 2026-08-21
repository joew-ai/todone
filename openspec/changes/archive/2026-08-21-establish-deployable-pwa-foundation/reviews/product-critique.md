# Product Critique: `establish-deployable-pwa-foundation`

**Reviewer role:** Independent product/architecture/security review (pre-implementation)
**Artifacts reviewed:** `proposal.md`, `design.md`, `specs/deployable-pwa-foundation/spec.md`, `tasks.md`
**Reference docs reviewed:** `docs/product/brief.md` (only populated product doc); `docs/ux/`, `docs/architecture/`, `docs/adr/`, `docs/security/`, `docs/testing/` were all **empty**. Sibling change `bootstrap-household-membership` was read to check for scope overlap/dependency correctness.

---

## Verdict: READY WITH REVISIONS

The scoping instinct (separate infra/identity risk from household/Todo product behavior) is sound and matches the product brief's constraints (AWS `family-paas`, free/cheap infra, thorough security). However, two issues are consequential enough to resolve before implementation starts: an undefined cross-repository blast radius for modifying shared `family-paas` infrastructure, and a real ambiguity about whether a sign-in UI is built in this change or the next one. Several other gaps (no deployed smoke-test task despite a "deployed PWA" success criterion, no brute-force/lockout consideration, undefined viewport breakpoints, no ADRs) should also be closed before an implementation agent starts making its own calls.

---

## Blocking Findings

### B1. Undefined blast radius for modifying shared `family-paas` Cognito modules
**Rejected by Product Owner**
> PO Notes: The authentication build in to `family-paas` is not used anywhere. The structure is there, but it's unused. We can flip how family-paas does it without any concern. As far as how to organize this work, part of this changeset should be producing a change spec to be passed off to an other agent working in the family-paas repo. Use your context about family-paas to inform that change spec, but mostly focus on _this_ app's requirements and let the other agent figure out the technicals.

- **Location:** `proposal.md` → Impact ("Affected systems: ... `family-paas` shared Cognito infrastructure **and modules**"); `design.md` → Context ("`family-paas` provides Terraform modules ... Its current shared Cognito pool is unused and email-oriented, so it will be replaced rather than adapted"); `tasks.md` 2.1–2.3.
- **Evidence:** The proposal explicitly lists `family-paas` **modules** (not just a deployed resource) as affected. `family-paas` is a separate repository (`github.com/josephwegner/family-paas`) already consumed by at least one other application (`weather`, per the brief and design context). Nothing in `design.md` or `tasks.md` states whether: (a) the shared Cognito Terraform *module* is being changed in a way that affects other consumers (e.g., `weather`), (b) a new, Todone-specific module/variant is being created instead, or (c) how a change to a shared, cross-repo module gets reviewed/versioned/rolled back independent of this repo's Terraform plan.
- **Impact:** If the module itself changes behavior for existing consumers, this could silently break `weather`'s authentication (which the design says is "email-oriented" and therefore incompatible with the new username-only design). That is a destructive, hard-to-detect failure mode for a system outside this change's own test suite. Conversely, if a new/forked module is intended, that is an architecture decision that should be stated, not left implicit.
- **Recommendation:** Add an explicit decision to `design.md`: either (1) fork/parameterize the Cognito module so `weather` is provably unaffected, with a task to verify `weather`'s pool/config is untouched, or (2) confirm this is a net-new dedicated pool resource with no shared module code change, and correct the "and modules" wording in the proposal. Add a task to verify the other consumer's continuity (e.g., a Terraform plan on `weather`'s stack showing no diff), or explicitly document that verifying `weather` is out of scope and why that is acceptable.
- **Verification needed:** Confirm with the repo owner whether `family-paas` module source is being edited, and whether other consumers exist and were checked for impact.

### B2. Sign-in UI ownership and scope is ambiguous and possibly duplicated across two changes
**Approved by Product Owner**
> PO Notes: I am fine with a throwaway login form for this first pass. Do not spend much time with it, since it will be thrown away when we integrate Cognito.

- **Location:** `specs/deployable-pwa-foundation/spec.md` → "Username-Based Authentication Foundation" and "Protected API Boundary" requirements (no UI/login-screen requirement stated); `design.md` → Testing strategy ("Playwright covers sign-in and protected-route access"); `tasks.md` 2.2 ("username/password sign-in succeeds without an email attribute") and 3.4 ("Playwright ... coverage for sign-in and shell keyboard behavior"); compare to `changes/bootstrap-household-membership/proposal.md` → "What Changes" ("Add username registration, sign-in, sign-out, and session restoration").
- **Evidence:** This change's own spec never states a requirement for a rendered sign-in screen — its scenarios are entirely about the Cognito pool and the API boundary. Yet `design.md` and `tasks.md` both assume a sign-in UI exists and is Playwright-tested here. The very next change in sequence, `bootstrap-household-membership`, lists "Add username registration, sign-in, sign-out, and session restoration" as new work, with an explicit `Depends on: establish-deployable-pwa-foundation`.
- **Impact:** Two plausible readings exist, and they lead to very different implementations:
  1. This change builds a throwaway/minimal login form purely to prove the JWT plumbing, which `bootstrap-household-membership` later replaces or extends — undocumented duplicate work and possible UI churn for users testing this change.
  2. This change has no UI at all, and "Playwright covers sign-in" actually means calling Cognito directly (e.g., via SDK/API in a test harness) rather than through a rendered form — in which case the wording in `design.md`/`tasks.md` is materially misleading about what the shell contains.
  There is also no story for how a test account get provisioned for this change's Playwright run, since self-registration is explicitly deferred to `bootstrap-household-membership`. An implementation agent must invent this decision either way.
- **Recommendation:** Pick one reading explicitly in `design.md` and reflect it consistently: either (a) state that this change includes a minimal, intentionally temporary sign-in form solely to validate the auth boundary, and describe how it relates to/gets superseded by `bootstrap-household-membership`'s full sign-in flow, or (b) state that no UI login form exists yet, that "sign-in" verification is done via direct Cognito API calls in tests, and that the shell itself has no auth-gated route in this change. Also add an explicit task/decision for how a verification-only test account is created (e.g., `aws cognito-idp admin-create-user` as part of a setup script, or a Terraform-managed test fixture), since self-service registration does not exist yet.
- **Verification needed:** Confirm intended UI scope with the author before task execution; update spec.md if a UI requirement is truly intended here.

---

## Important Findings

### I1. Proposal's "deployed" success criterion has no corresponding verification task
**Approved by Product Owner**

- **Location:** `proposal.md` → Impact ("Success criteria: a deployed PWA can authenticate against the new pool, call a protected endpoint, and pass all required local quality checks."); `tasks.md` 3.5 ("Run format, lint, typecheck, unit tests, integration tests, production build, Playwright, accessibility checks, and Terraform plan").
- **Evidence:** Task 3.5, the final verification gate, stops at `Terraform plan` — it does not include `terraform apply` to a real environment nor a post-deploy smoke test (e.g., hitting the live CloudFront/API Gateway URL, signing in, and calling the protected endpoint against deployed infrastructure). All other tasks describe provisioning steps (2.1–2.4) but the plan never closes the loop with an end-to-end deployed check.
- **Impact:** The change could be marked "done" per its own tasks while never having proven the actual, stated success criterion (a working deployed PWA). This is exactly the kind of behavior that "cannot be objectively verified" without an explicit task forcing it.
- **Recommendation:** Add an explicit task (e.g., 3.6) requiring a deployed smoke test: sign in against the live pool, call the live protected endpoint, and record the result, before this change can be considered complete.

### I2. No brute-force/account-lockout consideration for username/password sign-in with no recovery channel
**Rejected by Product Owner**
> PO Notes: I am fine with the default security from Cognito.

- **Location:** `specs/deployable-pwa-foundation/spec.md` → "Username-Based Authentication Foundation"; `design.md` → Decisions/Risks (no mention); `docs/product/brief.md` → "No telemetry... Application should be built in a thoroughly secure fashion" and "Email notifications (users will not even have an email address assigned)".
- **Evidence:** The brief explicitly removes email as a recovery channel, and this change removes email/phone as sign-up requirements entirely. Nothing in the spec, design, or tasks addresses Cognito's advanced security / adaptive authentication, standard throttling defaults, or an explicit decision to accept the default behavior for a public-facing password endpoint.
- **Impact:** Since password resets are entirely manual (parent-driven, per the brief) and there is no email-based account recovery, an account lockout or credential-stuffing scenario has no self-service recovery path at all. This is a real, foreseeable attack surface for a public-facing PWA, even at family scale.
- **Recommendation:** Add a short explicit decision to `design.md`'s Risks/Trade-offs: state whether default Cognito throttling is accepted as sufficient at this stage, or whether adaptive/advanced security features are enabled, and note that account lockout recovery is a manual, parent-mediated process (consistent with the brief's password-reset model).

### I3. No ADRs exist for the foundational architecture decisions this change makes
**Approved by Product Owner**
> PO Notes: !!!Implementation cannot begin without architecture documents!!!

- **Location:** `docs/adr/` is empty; `AGENTS.md` → "Read the relevant specification and ADRs" (required workflow step 1); `design.md` → Decisions (Cognito pool replacement, DynamoDB table choice, manual Terraform deploys).
- **Evidence:** This change makes several consequential, hard-to-reverse architecture calls (replace a shared identity pool, choose DynamoDB with a `pk`/`sk` model over a relational store, manual-only deploys) with rationale captured only inline in `design.md`. The repository convention (per `AGENTS.md` and the `docs/adr/` directory's existence) implies these decisions should be recorded as ADRs for future traceability, especially since this is the first change to establish them.
- **Impact:** Without ADRs, later changes/reviewers have no durable record of *why* DynamoDB was chosen over alternatives, or why the shared pool was replaced rather than reconfigured — increasing the risk that a future contributor silently reverses or contradicts these decisions.
- **Recommendation:** Add a task to author at least one ADR (e.g., "Use dedicated DynamoDB table with PITR" and "Replace shared Cognito pool with username-only pool") before or during implementation, referencing this change.

### I4. Viewport breakpoints referenced in requirements are not numerically defined anywhere
**Accepted by Product Owner**

- **Location:** `specs/deployable-pwa-foundation/spec.md` → "Accessible Responsive Application Shell" ("compact, medium, and wide viewports"); `docs/ux/` is empty.
- **Evidence:** The requirement and its scenario reference three named breakpoints, but no document in the repository defines their pixel/CSS boundaries. `tasks.md` 1.1 completion criterion repeats the same undefined terms ("the shell runs locally at compact, medium, and wide viewport sizes").
- **Impact:** This is untestable as written — a Playwright test can't assert "wide viewport" without a concrete width, and different implementers could pick different values, producing inconsistent results across this and later UI-heavy changes.
- **Recommendation:** Define concrete breakpoint values (e.g., in `design.md` or a new `docs/ux/breakpoints.md`) before task 1.1/3.4 are implemented, and reuse them consistently in future changes.

### I5. PITR restore drill is only required to be documented, never exercised or verified
**Rejected by Product Owner**

- **Location:** `design.md` → Reliability and observability ("Document a point-in-time recovery restore drill... requires deliberate data verification before cutover."); `tasks.md` 3.2 (documentation-only completion criterion).
- **Evidence:** The requirement and task ask only for a written runbook, not for the drill to actually be run once against a real or throwaway restore.
- **Impact:** An untested restore runbook is a common source of failed recovery when it's actually needed — the "restore procedure" itself becomes an unverified assumption that this change otherwise tries hard to avoid (e.g., it insists on automated verification everywhere else).
- **Recommendation:** Add a task to actually perform one PITR restore into a scratch table as a one-time validation of the documented steps, even if this is a manual, recorded exercise rather than an automated test.

### I6. "Safe session metadata" and "minimal health metrics" are undefined, leaving shape decisions to the implementer
**Approved by Product Owner**

- **Location:** `specs/deployable-pwa-foundation/spec.md` → "Identity is exposed to the protected API" scenario ("returns only the authenticated subject and safe session metadata"); `design.md` → Reliability and observability ("Track API error count and latency, authorization denials, and later recurrence failures").
- **Evidence:** Neither the exact fields of "safe session metadata" nor the exact set of "minimal health metrics" are enumerated. Separately, "later recurrence failures" references a not-yet-built feature (Todo recurrence, from `docs/product/brief.md`'s MVP list and a separate future change), which is scope creep into this infrastructure-only change.
- **Impact:** Different implementers could return different response shapes from the current-session probe (token expiry? issued-at? nothing at all?), which later changes may need to consume — an undocumented contract. The recurrence-metrics mention adds premature complexity referencing a feature this change explicitly declares out of scope.
- **Recommendation:** Enumerate the exact fields returned by the current-session probe (e.g., `sub`, token expiry) in the spec's scenario. Remove the "later recurrence failures" phrase from `design.md`, or move it to a follow-on change's design doc where recurrence is actually being built.

---

## Optional Improvements

- Consider stating explicitly whether the current-session probe is a permanent diagnostic endpoint or a temporary scaffold slated for removal once `bootstrap-household-membership` ships a real session endpoint — this avoids ambiguity about dead-code cleanup later.
- The "Infrastructure inspection" scenario in "Recoverable Dedicated Data Store" is manually phrased ("WHEN the deployed data store is inspected"); consider rephrasing as an automated post-deploy check (e.g., AWS CLI assertion in CI) so it aligns with the change's otherwise strong bias toward automated verification.
- State explicitly whether this establishes a single production environment or a dev/staging split — the brief's "free/cheap infra" constraint suggests a single environment is intentional, but saying so avoids future ambiguity.
    - PO Notes: This will be a prod environment only. No staging.

---

## Missing Decisions or Scenarios

1. Whether `family-paas` shared module *source* is being modified (affecting other consumers like `weather`) or whether Todone gets a dedicated/forked module — and how that cross-repo coordination happens (B1).
2. Whether a sign-in UI is built in this change or deferred entirely to `bootstrap-household-membership`, and how a verification-only test account gets created without self-registration (B2).
3. Concrete numeric viewport breakpoints for "compact, medium, wide" (I4).
4. Whether Cognito's default throttling/adaptive security is accepted as sufficient given no email-based account recovery (I2).
5. Whether the deployed end-to-end success criterion is actually exercised as part of this change's completion gate (I1).

---

## Traceability Gaps

- `proposal.md` Impact section commits to modifying `family-paas` **modules**, but no task in `tasks.md` addresses cross-repo module work, versioning, or verifying other consumers are unaffected.
- `design.md`/`tasks.md` assume a testable sign-in UI; `specs/deployable-pwa-foundation/spec.md` contains no requirement describing a login screen, its states, or its failure/validation behavior — yet `bootstrap-household-membership` separately claims to "add" sign-in, creating overlapping ownership.
- `proposal.md`'s stated success criterion ("a deployed PWA can authenticate... call a protected endpoint") has no corresponding task that verifies it against a real deployment; `tasks.md` 3.5 stops at `terraform plan`.
- No ADR exists for the Cognito-pool-replacement or DynamoDB-table decisions, despite `AGENTS.md`'s workflow requiring ADRs be read/maintained and `docs/adr/` being the designated location.

---

## Recommended Next Action

Before starting implementation, resolve B1 and B2 with the change author: (1) state explicitly whether `family-paas` module source changes affect other consumers and how that's verified, and (2) decide and document whether this change includes a real (even if minimal) sign-in UI or defers all UI sign-in work to `bootstrap-household-membership`, including how a test account is provisioned for this change's own verification. Update `design.md` and `tasks.md` to reflect both decisions, then proceed with implementation.
