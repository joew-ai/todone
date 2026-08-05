# Product Critique: `complete-first-family-todo`

Reviewer: Independent product/architecture review (pre-implementation)
Scope: `proposal.md`, `specs/family-todo-completion/spec.md`, `design.md`, `tasks.md`, cross-checked against `docs/product/brief.md` and sibling change proposals (`bootstrap-household-membership`, `manage-family-accounts`, `manage-todo-lifecycle-and-history`).

Note on source material: `docs/ux/`, `docs/architecture/`, `docs/adr/`, `docs/security/`, and `docs/testing/` referenced by `AGENTS.md` do not yet exist in this repository. The only canonical product document is `docs/product/brief.md`. This absence is treated as a traceability gap (see below), not attributed to this change's authors, since no ADRs or architecture docs exist for *any* change in this repo yet.

---

## Verdict

**READY WITH REVISIONS**

The slice is well-scoped, faithful to the brief's three primary journeys, and its authorization/isolation requirements are unusually rigorous for a first vertical slice. However, two product decisions are missing or contradictory in a way that an implementation agent cannot resolve without guessing, and several supporting requirements are referenced but never actually specified. These must be resolved before implementation begins on the affected paths; the rest of the change can proceed.

---

## Blocking findings

### B1. Child "undo" capability contradicts child visibility restriction
**Accepted by Product Owner**
> PO Notes: to clear the ambiguity here, I am fine with children not seeing completed todos for now, and thus not being able to "undo" the completion. We can add that in `manage-todo-lifecycle-and-history`.

- **Location:** `specs/family-todo-completion/spec.md` — "Role-Scoped Active Todo Visibility" (line 14) vs. "Completion and Reversal" (line 25-26); `design.md` sequence diagram comment "API-->>C: Confirm and offer undo" (line 25).
- **Evidence:** The spec states a child "SHALL see only their own active Todos" — full stop, no mention of a completed-item view. The same spec separately requires "The completing child SHALL be able to undo their own completion." History/completed views are explicitly deferred to `manage-todo-lifecycle-and-history` (not part of this change). `design.md` implies an ephemeral "offer undo" moment tied to the completion response, but this is a design aside, not a spec requirement, and it is never connected to the visibility rule.
- **Impact:** This is core to primary journey 3 in the brief ("check off my todos ... for my parents to be informed"). As written, there is no defined place or time window in which a child can invoke undo, because the moment a Todo is marked complete it structurally leaves the child's only visible surface (the active list). An implementation agent must invent either (a) a transient toast/undo-window UX, (b) a temporary "just completed" affordance that keeps the item visible in the active list for some period, or (c) a partial history view — none of which is currently approved. Each choice has materially different UX, latency, and accessibility implications (e.g., a toast that disappears before a screen-reader or motor-impaired user can act on it would violate the accessibility requirement in the same spec).
- **Recommended resolution:** Add an explicit requirement and scenario describing where/how/how-long a child can undo a completion (e.g., "the just-completed Todo remains visible with an undo control until the child navigates away or N seconds elapse" — or an alternative mechanism). This should be a first-class scenario, not left to the design doc's diagram caption.
- **Verification needed:** A Playwright/accessibility scenario must exist that exercises this undo path start-to-finish once specified; today no task can be written to test it because the behavior isn't defined.

### B2. Identity snapshot vs. live display name/color is a silent, unapproved product decision
**Accepted by Product Owner**
> PO Notes: Member names and colors should NOT be idempotent on todo. If a user updates their display settings, their todos should reflect that change. It should be inherited from the assigned member.

- **Location:** `design.md` — Decisions (line 30, 34: "assignee snapshot", "retain display-name/color snapshots needed for stable rendering") vs. `specs/family-todo-completion/spec.md` — "Accessible Member Identity and Todo Controls" (line 43-44) and `manage-family-accounts/specs/family-account-management/spec.md` — "Profile Identity" ("Each member SHALL have a **mutable** display name...").
- **Impact:** `manage-family-accounts` explicitly makes display name mutable. `design.md` unilaterally decides to freeze a name/color snapshot on the Todo at creation time "for stable rendering," with no requirement or scenario in this spec authorizing that trade-off. This is directly user-visible: if a parent renames a child (e.g., typo fix, nickname change) after Todos exist, those existing Todos would silently keep showing the stale name/color under the snapshot approach, while any live-join approach would show the current name. Which behavior is correct is a product decision (staleness vs. consistency vs. rename-safety), not an engineering implementation detail, and it directly touches the "Accessible Member Identity" requirement that pairs color with a visible name.
- **Recommended resolution:** Proposal or spec must state explicitly whether displayed identity on a Todo is a point-in-time snapshot or a live lookup, and (if snapshot) whether/how a rename retroactively updates existing Todos. This decision should be made by the product owner, not defaulted in `design.md`.
- **Verification needed:** A scenario such as "Parent renames a child after Todo assignment" with a defined expected outcome.

---

## Important findings

### I1. No defined behavior for existing Todos when the assignee is later removed
**Accepted by Product Owner**
> PO Notes: For now, you should be able to _change_ the assignee, not _remove_ them. Removal may become relevant in future versions with unassigned todos.

- **Location:** `specs/family-todo-completion/spec.md` — "Parent Creates a Single-Assignee Todo" (line 4) only covers rejection of a "removed" assignee **at creation time**; nothing addresses a member removed **after** assignment. `manage-family-accounts/specs/family-account-management/spec.md` — "Child Account Removal" states removed children lose access, but says nothing about their in-flight Todos.
- **Impact:** Proposal's own Impact section says this change "Depends on household membership and family accounts," so this interaction is squarely in scope for consideration even if the actual removal capability ships later. Without a decision, a removed child's active Todos become orphaned records with an undefined display/ownership story (do they vanish from the parent's per-member view? remain visible but uncompletable forever? get auto-archived?). This is a real edge case for a household tool where child accounts can be removed and re-added.
- **Recommended resolution:** Either explicitly declare this out of scope with a stated fallback (e.g., "removed member's active Todos remain visible to parents but are not completable; cleanup is handled in `manage-todo-lifecycle-and-history`") or add a requirement/scenario here.

### I2. "Due status" / overdue behavior is referenced but never specified
**Accepted by Product Owner**
> PO Notes: Todos with a due date are considered overdue after end-of-day of the day they are due, within the timezone set for the household. Visually, these are marked with some sort of red warning indicator (not too disruptive, though).

- **Location:** `design.md` (line 31: "overdue is a date-derived presentation state, not a stored terminal status") and `specs/family-todo-completion/spec.md` — "Accessible Member Identity and Todo Controls" (line 44: screen readers must announce "due status").
- **Impact:** The spec assumes "due status" is a meaningful, announced UI concept (implying at least "overdue" vs "not overdue" vs "no due date"), and design.md confirms overdue is computed rather than stored, but no requirement defines: what counts as overdue (household timezone boundary from `bootstrap-household-membership`? end of day? which timezone if member timezone ever diverges?), how it is visually/aurally communicated, or whether it affects sort order. This is exactly the kind of "date-derived" logic that needs an explicit, testable rule before an agent can implement or test it.
- **Recommended resolution:** Add a requirement (even a minimal one) defining overdue computation (tie to household IANA timezone from `bootstrap-household-membership`) and its accessible presentation.

### I3. Ambiguous input contract for assignee validation ("reject ... multiple assignees")
**Accepted by Product Owner**
> PO Notes: Tasks only get a single assignee for now. We may add multi-assignment in the future

- **Location:** `specs/family-todo-completion/spec.md` — "Parent Creates a Single-Assignee Todo" (line 4): "The system SHALL reject missing, cross-household, removed, **and multiple** assignees."
- **Impact:** The same requirement states a Todo has "exactly one active household assignee," and the API is elsewhere described as taking a single assignee field. If the API only ever accepts a single assignee value, "multiple assignees" is not a validation case that can structurally occur, and the requirement is untestable as written. If instead the client can submit an array (in anticipation of future multi-assignee support per the brief), that is an API-shape decision that should be stated explicitly, since it affects request/response contracts an implementing agent must build now.
- **Recommended resolution:** Clarify the assignee field's input shape (single scalar vs. array) and adjust the requirement/scenario accordingly.

### I4. Creation-flow feedback states are assigned to tasks but never specified
**Accepted by Product Owner**

- **Location:** `tasks.md` — Task 2.1: "validation, cancel, save, and retry states are usable by keyboard" vs. `specs/family-todo-completion/spec.md` — "Reliable Completion Feedback" (line 36-37), which only governs the **active list / completion** flow ("loading, empty, submitting, success, failure, retry, and already-changed states"), not the Todo-creation form.
- **Impact:** Tasks are inventing UI states (cancel, save, network failure during creation) that have no backing requirement or scenario. Per the review brief for this task, "tasks must not silently invent behavior." An implementing agent has no spec to verify creation-flow error/loading/cancel behavior against.
- **Recommended resolution:** Either add a requirement/scenario in the spec covering the creation form's own loading/failure/cancel states, or narrow Task 2.1's completion criteria to match what the spec actually requires.

### I5. "Already-changed" state has no scenario or explicit test coverage
**Accepted by Product Owner**

- **Location:** `specs/family-todo-completion/spec.md` — "Reliable Completion Feedback" (line 37) lists "already-changed" as a required UI state, but no scenario in this requirement (or elsewhere) demonstrates it; `tasks.md` Task 3.1 only broadly mentions "idempotency" without naming the stale-write/already-changed UI case.
- **Impact:** This is exactly the conflict case `design.md` calls out ("Conditional writes ... return the current state for double taps or stale clients"), which is a meaningful concurrency/race scenario (e.g., parent and child act on the same Todo near-simultaneously). Without a scenario, "already-changed" cannot be objectively verified, per review priority #5/#9 (missing failure/concurrency behavior).
- **Recommended resolution:** Add a scenario, e.g., "Stale client attempts completion after parent already completed the Todo," with the expected UI outcome.

### I6. No architecture/ADR record backs the DynamoDB and snapshot decisions in `design.md`
**Accepted by Product Owner**
> PO NOtes: Consisntent architecture docs must be created before spec can be implemented.

- **Location:** `design.md` — Decisions section (active-item index, conditional writes, version field, snapshots) with no corresponding entry in `docs/adr/` or `docs/architecture/` (neither directory exists in the repo).
- **Impact:** `AGENTS.md` establishes ADRs and architecture docs as the source of truth engineers must read before editing, and requires "Undocumented product or architecture decisions" to be flagged. Because no ADR exists anywhere in this repo yet, this specific design's storage/indexing/versioning choices (and the snapshot decision flagged in B2) are unreviewable against any approved architectural precedent, and there is nothing for a future change to cite or diverge from consistently.
- **Recommended resolution:** Not blocking for this specific change (the whole repo lacks these docs), but worth raising as a program-level gap: consider capturing the Dynamo access-pattern and identity-snapshot decisions in an ADR now, since they will constrain every subsequent Todo-related change (`manage-todo-lifecycle-and-history`, labels, recurrence).

---

## Optional improvements

- Clarify whether "undo" (child, immediate) and "reopen" (parent, any time) are the same underlying state transition/API or intentionally distinct, for consistency between `tasks.md` Task 1.3 and the spec's two separate verbs.
    - Approved by PO. They are the same thing.
- Cross-reference `manage-family-accounts`' "Profile Identity" requirement explicitly from this spec's "Accessible Member Identity" requirement, rather than restating similar language independently — reduces risk of the two specs drifting.
- Task 3.2 mentions "phone, tablet, and laptop layouts" with no defined breakpoints anywhere in the repo (no `docs/ux/`). Not blocking here, but will need a canonical source before Playwright viewport configs are chosen.

---

## Missing decisions or scenarios

1. Where/when/how long a child can undo a completion, given they cannot see completed Todos (B1).
2. Whether identity display (name/color) on a Todo is a snapshot or a live lookup, and rename-propagation behavior (B2).
3. What happens to a removed member's existing active Todos (I1).
4. Definition of "overdue"/due status computation and timezone linkage (I2).
5. Assignee field input shape: scalar vs. array (I3).
6. Whether/how the creation form's own loading, failure, and cancel states are specified (I4).
7. A concrete "already-changed"/stale-write scenario (I5).

---

## Traceability gaps

- `tasks.md` Task 2.1 references creation-flow UI states ("cancel," "save," "retry") not present in any requirement of `specs/family-todo-completion/spec.md` (I4).
- `specs/family-todo-completion/spec.md`'s "already-changed" state (Reliable Completion Feedback) has no scenario and no named test in `tasks.md` (I5).
- `design.md`'s identity-snapshot decision and overdue-presentation decision are architecture/product choices with no corresponding spec requirement, scenario, or ADR (B2, I2, I6).
- This change's Impact statement acknowledges a dependency on `manage-family-accounts` (removal capability), but no requirement in this spec addresses the interaction between removal and existing Todos (I1).

---

## Recommended next action

Resolve B1 and B2 with the product owner first — both affect the core "child completes and can undo" journey and the visible identity model, and both currently require an implementation agent to invent behavior. Once those two decisions are recorded as explicit requirements/scenarios in `specs/family-todo-completion/spec.md`, address I1–I5 as spec edits (lower effort, mostly additive scenarios), then re-run this review against the updated spec before starting `tasks.md`.
