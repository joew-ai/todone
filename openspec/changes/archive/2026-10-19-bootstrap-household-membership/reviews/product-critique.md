# Product Critique — `bootstrap-household-membership`

**Review type:** Pre-implementation product/architecture critique
**Artifacts reviewed:** `proposal.md`, `design.md`, `tasks.md`, `specs/household-membership/spec.md`
**Reference material reviewed:** `docs/product/brief.md`, `establish-deployable-pwa-foundation` (dependency: proposal, design, spec, tasks), `manage-family-accounts` (downstream consumer: proposal, spec)
**Note:** `docs/ux/`, `docs/architecture/`, `docs/adr/`, `docs/security/`, and `docs/testing/` referenced by `AGENTS.md` do not yet exist in this repository. `docs/product/` contains only `brief.md`. All product and architectural reasoning below is therefore traced against the brief and the OpenSpec change graph, not a canonical spec corpus.

---

## Verdict

**NOT READY**

The change has a coherent, appropriately-scoped narrative (first-parent bootstrap, mandatory household, server-enforced isolation) and correctly defers invitations, family account management, roles administration, and Todos. However, it leaves two foundational data-model/business-invariant decisions undocumented (membership role representation, and server-side enforcement of "exactly one household per user"), omits a required registration failure state (duplicate username), and leaves the post-bootstrap landing experience undefined in a way that blocks objective verification. These are the kind of decisions that are expensive to reverse once the DynamoDB schema and API contracts are implemented, so they should be resolved in the spec/design before task 2.1 begins.

---

## Blocking findings

### B1. No documented schema/decision for Membership `role`, despite the spec requiring one to exist
**Approved by Product Owner**

- **Location:** `design.md` § Decisions ("Persist Household, Membership, and user-to-household lookup items…"); `specs/household-membership/spec.md` § Mandatory Household Bootstrap ("Successful creation SHALL create a Household and a parent Membership atomically…", scenario "the user becomes a parent member").
- **Evidence:** The spec requires the created Membership to represent the user as a "parent," but `design.md` never states that Membership has a `role` attribute, what its type/values are, or how the persistence model represents it. The downstream `manage-family-accounts` proposal states it "Adds member roles and lifecycle behavior" to `household-membership`, and its own spec assumes a Membership already has an "immutable selected role" (`family-account-management/spec.md`, Peer Parent Protection / Parent-Provisioned Members), but that change contains no `specs/household-membership/` delta defining the migration. Nothing in this change's design or tasks decides whether `role` is persisted now (with only one legal value, `parent`) or invented ad hoc later.
- **Impact:** This is a DynamoDB single-table design where `pk`/`sk` shapes and attribute presence are hard to change without a migration. If the implementing agent guesses the shape now (or omits `role` entirely because "it's always parent right now"), `manage-family-accounts` will need a backfill/migration for every existing Membership item, contradicting the "prefer boring, reversible architecture" principle and creating avoidable rework.
- **Recommended resolution:** Add an explicit design decision: Membership carries a `role` attribute from creation (e.g., `role: "parent"`), with the enum and immutability constraint stated now, even though only one value is exercised in this change.
- **Verification needed:** Confirm the persistence model in `design.md`/`tasks.md` 2.1 explicitly names the Membership schema fields, including `role`.

### B2. "Exactly one household per user" is a stated success criterion with no server-side enforcement requirement
**Approved by Product Owner**

- **Location:** `proposal.md` § Impact ("Success: a new username can create exactly one household and cannot access another household."); `specs/household-membership/spec.md` § Mandatory Household Bootstrap.
- **Evidence:** The only bootstrap requirement is scoped to "an authenticated user *without* a membership." No requirement or scenario addresses what happens when an authenticated user who *already has* a membership calls the bootstrap/create-household endpoint directly (bypassing the UI gate, which only controls navigation, not the API). Task 2.2's completion criterion ("valid first users become parent members and invalid timezone/name input is rejected") likewise does not mention rejecting a second bootstrap call from an existing member.
- **Impact:** The UI gate is not an authorization boundary. Without an explicit server-side rule, a member could call the household-creation API a second time and either create a second orphan household, silently no-op, or error unpredictably — any of which an implementer could pick without violating the letter of the spec, yet one of which breaks the proposal's own success criterion.
- **Recommended resolution:** Add a requirement/scenario: "WHEN an authenticated user with an existing membership calls household creation, THEN the request is rejected without creating a second household," and reflect it in task 2.2's completion criterion.
- **Verification needed:** Add an integration test asserting a second bootstrap call by an already-a-member user is rejected (this is a natural fit for task 3.1's "no client-supplied household ID can authorize access" test set, but that framing doesn't cover this specific case).

---

## Important findings

### I1. Registration failure states omit "username already taken"
**Approved by Product Owner**

- **Location:** `specs/household-membership/spec.md` § Username Session Lifecycle.
- **Evidence:** The requirement lists "loading, invalid-credential, network-failure, retry, and signed-out states" and the only scenario is "Failed sign-in." Registration is a distinct operation with its own most-common failure mode — a taken username — and it is never named as a state or scenario.
- **Impact:** Task 1.1 ("registration… with loading, error, retry, and accessible validation states") is generic enough that an implementer could satisfy it with any error copy, but nothing forces the accessible, field-level, non-disclosing treatment this failure mode needs (e.g., should the message reveal the username is taken, which is a very low-sensitivity leak for a single-family app, or stay generic?).
- **Recommended resolution:** Add a scenario under Username Session Lifecycle (or a new "Registration Conflict" requirement) specifying the duplicate-username outcome and its accessible presentation.
- **Verification needed:** Playwright/unit coverage for duplicate-username registration attempt.

### I2. Post-bootstrap "empty household experience" is undefined
**Approved by Product Owner**
> PO Notes: If a user is logged in and not a member of any household, they are presented a form to create a new household. This kicks off the onboarding flow (create household, invite users, create todos)

- **Location:** `specs/household-membership/spec.md` § Mandatory Household Bootstrap, scenario "First account creates household" ("…enters the empty household experience"); `tasks.md` 3.2 ("register-to-household flow").
- **Evidence:** No requirement, design note, or task defines what the user sees after successful bootstrap. Todos are explicitly out of scope for this change, so the landing surface is presumably a placeholder, but that placeholder is never named.
- **Impact:** This is the terminal state of the change's primary user journey and the assertion target for the Playwright "register-to-household" test (task 3.2). Without a defined outcome, "enters the empty household experience" is not objectively verifiable — an implementer can render literally anything and claim compliance.
- **Recommended resolution:** Add a minimal, explicit statement of the landing state (e.g., "displays the household name and confirms membership; no Todo content is shown") so it is testable.
- **Verification needed:** Playwright assertion tied to a named, spec-approved landing state.

### I3. Public self-registration on a personal/family app has no abuse boundary, and the decision to allow it isn't stated as a decision
**Approved by Product Owner**
> PO Notes: I like the idea of having some invite code. It could even be a stable passcode that I can share with friends/family.

- **Location:** `proposal.md` § What Changes ("Add username registration…"); `design.md` § Risks/Trade-offs ("Self-registration can create isolated unused households; this does not cross tenant boundaries and is acceptable at family scale."); `docs/product/brief.md` § Target users ("Who is explicitly not part of the initial audience? The rest of the world…").
- **Evidence:** `establish-deployable-pwa-foundation` deploys this app to a public CloudFront/API Gateway endpoint. This change makes registration open to any caller who reaches that endpoint, with no invite code, allow-list, or admin-provisioned-only mode. The design's risk note addresses tenant *isolation* but not exposure/abuse (arbitrary internet users creating Cognito users and DynamoDB items on a personal deployment).
- **Impact:** This isn't a data-isolation vulnerability (the isolation requirement holds), but it does contradict the brief's stated audience boundary and creates an unbounded, ungated account-creation surface on a public URL for what is meant to be a private family tool. Cost is negligible per the design's own reasoning, but unwanted accounts, moderation, or later confusion ("why do I have 40 households in this table") are realistic operational annoyances that a personal-scale deployment should not have to discover after the fact.
- **Recommended resolution:** Either (a) explicitly decide open self-registration is acceptable for this deployment model and say so as a decision (not just a buried risk note), or (b) require a shared setup/invite secret to gate the *first* registration, closing registration afterward or requiring the same secret for any subsequent self-registration until `manage-family-accounts` takes over provisioning.
- **Verification needed:** None until the decision is made; then add a scenario/test for whatever gating mechanism (or lack thereof) is chosen.

### I4. Scope boundary with `establish-deployable-pwa-foundation` around "sign-in" is ambiguous
**Approved by Product Owner**
> PO Notes: This change should replace the barebones sign-in form that was previously created. The old form should be removed and cleaned up.

- **Location:** `proposal.md` § What Changes ("Add username registration, sign-in, sign-out, and session restoration."); `establish-deployable-pwa-foundation/tasks.md` 2.2 ("username/password sign-in succeeds without an email attribute") and 3.4 ("Playwright and accessibility coverage for sign-in and shell keyboard behavior").
- **Evidence:** The foundation change already implements and tests a sign-in flow (task 2.2, 3.4) as part of proving the Cognito pool works. This change also claims to "add" sign-in. Neither `design.md` nor `proposal.md` in this change states what is new here versus what already exists from the foundation (e.g., is the foundation's sign-in a minimal probe with no accessible states, and this change is the "real" full-state UI replacing it?).
- **Impact:** Without a stated boundary, an implementing agent may duplicate work, silently replace foundation work in a way that regresses foundation's own Playwright coverage, or under-build this change's sign-in on the (possibly false) assumption it's mostly done.
- **Recommended resolution:** Add a sentence to `design.md` Context or `proposal.md` Impact clarifying the relationship (e.g., "supersedes the foundation's minimal sign-in probe with full state coverage").
- **Verification needed:** Confirm foundation's existing sign-in Playwright coverage still passes or is intentionally superseded, not silently broken.

### I5. No account-recovery path exists anywhere in the roadmap for the first parent's own credentials
**Rejected by Product Owner**

- **Location:** `specs/household-membership/spec.md` § Username Session Lifecycle; `manage-family-accounts/proposal.md` § Impact ("Does not add invitations, parent removal/demotion, role changes…"); `docs/product/brief.md` § MVP capabilities ("passwords are entered by parents… One parent cannot update another parent's password").
- **Evidence:** `manage-family-accounts` explicitly forbids a parent resetting another parent's password (Peer Parent Protection), and this change defines no self-service reset (consistent with "no email address," per the brief). No change in the visible roadmap owns first-parent password recovery.
- **Impact:** If the sole parent (or either parent, once two exist) forgets their password, there is currently no specified path back into the account short of manual Cognito administration outside the product. For a real, single-household deployment this is a plausible and consequential failure mode, not a theoretical one.
- **Recommended resolution:** Not necessarily in scope for *this* change, but should be recorded as an explicit deferred decision (e.g., in `design.md` Non-Goals with a forward pointer) rather than left unaddressed by every change in the graph.
- **Verification needed:** None for this change; flag for product backlog/decision log.

---

## Optional improvements

- `tasks.md` 1.1 says accessibility/keyboard journeys must work "at compact and wide breakpoints," while the foundation's shell requirement (`establish-deployable-pwa-foundation/spec.md`) covers "compact, medium, and wide." Align the breakpoint list for consistency.
    - Approved by PO. We are covering three breakpoints (Laptop, iPad, iPhone)
- `specs/household-membership/spec.md` § Household Timezone doesn't state a fallback if the browser cannot supply a timezone default (e.g., permissions-restricted environments); worth a one-line fallback note (e.g., default to UTC and require explicit confirmation).
    - Approved by PO. User should be able to select an option, even if the browser provides a default.
- Consider explicitly noting in `design.md` whether Cognito requires an email/phone verification step for registration given "email and phone are optional" in the foundation pool config; if verification is structurally impossible without contact info (likely), state that as a resolved question rather than leaving it implicit.
    - No phone or email verification are required at this time.

---

## Missing decisions or scenarios

1. Membership `role` schema and enum (B1).
2. Server-side rejection of a second household-creation attempt by an existing member (B2).
3. Duplicate-username registration handling (I1).
4. Defined post-bootstrap landing state/content (I2).
5. Whether public self-registration is intentionally open on a personal deployment, and if not, what gates it (I3).
6. Boundary between foundation's existing sign-in implementation/tests and this change's sign-in work (I4).
7. Long-term ownership of first-parent account recovery (I5) — not required for this change, but currently unowned anywhere in the roadmap.

---

## Traceability gaps

- `manage-family-accounts/proposal.md` declares it "Modifies" the `household-membership` capability but ships no `specs/household-membership/` delta file — the role/lifecycle behavior it assumes is neither defined here nor formally added there. This change should not merge/implement its Membership schema without first deciding the shape that the next change will extend (see B1).
- `proposal.md`'s success statement ("create exactly one household") is not backed by a corresponding requirement/scenario in `specs/household-membership/spec.md` (see B2) — a proposal commitment with no traceable spec obligation.
- `tasks.md` 3.2 ("register-to-household…") cannot be objectively graded against `specs/household-membership/spec.md` because the terminal state of that journey ("empty household experience") is not defined anywhere (see I2).

---

## Recommended scope

Keep the change's scope as-is (first-parent bootstrap, mandatory household, timezone capture, tenant isolation, session lifecycle). Do not pull in invitations, roles administration, or Todos — those are correctly deferred. The fix here is precision, not scope expansion: resolve B1, B2, I1, and I2 in `design.md`/`specs/household-membership/spec.md` before task 2.1 (persistence models) begins, since B1/B2 shape the data model and API contract that everything else in this change and `manage-family-accounts` builds on.

## Recommended next action

Revise `design.md` and `specs/household-membership/spec.md` to close B1 and B2 (Membership role schema; server-side single-household enforcement), and add the missing duplicate-username scenario (I1) and a defined post-bootstrap landing state (I2), then re-run this review before starting task 2.1.
