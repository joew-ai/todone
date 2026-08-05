# Product Critique: `add-daily-recurring-rounds`

Reviewer scope: `proposal.md`, `design.md`, `tasks.md`, `specs/daily-recurring-rounds/spec.md`, cross-referenced against `docs/product/brief.md` and the prior/sibling OpenSpec changes this one depends on or is depended on by (`bootstrap-household-membership`, `complete-first-family-todo`, `manage-todo-lifecycle-and-history`, `organize-todos-with-labels`, `expand-weekly-and-monthly-rounds`, `surface-routine-trends`). No `docs/ux/`, `docs/architecture/`, `docs/adr/`, `docs/security/`, or `docs/testing/` directories exist in this repository yet — only `docs/product/brief.md`. Canonical behavior for dependencies was therefore taken from the referenced OpenSpec change specs, which is the only durable source available.

This is a pre-implementation review. No code exists; no implementation was inspected.

## Verdict

**NOT READY**

The change has a clear, well-scoped intent and mostly strong scenario coverage, but it modifies a capability (`todo-lifecycle-history`) without providing the spec delta that defines how the new terminal states interact with that capability's existing state model, editing rules, and deletion rules. That gap is not cosmetic — it directly determines the occurrence data model, and an implementation agent cannot resolve it without inventing product behavior. Several recovery and failure journeys (skip-mistake undo, multi-day outage backfill, template-edit-vs-in-flight-occurrence) are also unresolved in a way that will force undocumented decisions during implementation.

---

## Blocking findings

### B1. Undefined relationship between new recurrence states and the existing Todo lifecycle model that this change explicitly modifies

- **Location:** `proposal.md` "Modified Capabilities" (`todo-lifecycle-history`); `specs/daily-recurring-rounds/spec.md` "Non-Intrusive Round Rollover" and "Parent Skip and Child History Protection"; compare `manage-todo-lifecycle-and-history/specs/todo-lifecycle-history/spec.md`.
- **Evidence:**
  - The proposal declares `todo-lifecycle-history` a **Modified Capability** ("Adds recurrence-specific terminal outcomes to history"), but this change contains no spec delta file for `todo-lifecycle-history` — only a new `daily-recurring-rounds` capability. There is nothing in this change (or the base spec) that says whether `MISSED` and `SKIPPED` are new top-level Todo states, or a reason-coded variant of the existing `ARCHIVED` state.
  - The base capability's "Role-Scoped History" requirement says a child "SHALL be able to view only their own completed and archived Todo history." This change requires children to view "completed, missed, and skipped" history — a state vocabulary the base requirement never anticipated.
  - `design.md` states occurrences are "immutable date-keyed Todo occurrences," but the base capability it modifies grants parents the ability to edit (title/date/assignee) and permanently delete *any* Todo, including historical ones ("Explicit Parent Deletion" — "Only a parent SHALL be able to permanently delete a Todo, including a historical Todo"). Nothing in this change says whether occurrences are exempt from parent editing/deletion, or whether "immutable" only means children/the generator cannot mutate them while parents retain the general lifecycle powers.
- **Impact:** An implementation agent must decide, without product sign-off, whether occurrences are a new persistence type, a Todo subtype, or reuse the existing `Todo` table with new enum values — and whether parents can edit/delete history that this feature calls "immutable." Different choices produce materially different data models, migration paths, and user-facing capabilities (e.g., can a parent delete an embarrassing missed-occurrence record forever, contradicting the feature's stated purpose of "non-intrusive historical rounds"?).
- **Recommendation:** Add the missing spec delta for `todo-lifecycle-history` (or fold an explicit reconciliation section into this change) stating: (a) whether `MISSED`/`SKIPPED` are new terminal states or `ARCHIVED` variants, (b) whether the general "Parent Todo Editing" and "Explicit Parent Deletion" requirements still apply to occurrences, and if not, what replaces them for correcting/removing a recurrence occurrence.
- **Verification needed:** Confirm with the product owner whether occurrence deletion/editing by parents is intended, and update both specs so the state model is singular and traceable.

---

## Important findings

### I1. No recovery path for a mistaken parent skip
**Accepted by Product Owner**

- **Location:** `specs/daily-recurring-rounds/spec.md` "Parent Skip and Child History Protection"; `design.md` state diagram (`CurrentActive --> HistoricalSkipped: parent skips`, terminal, no return edge).
- **Evidence:** The spec and diagram show skip as a one-way transition straight to history. The sibling capability `family-todo-completion` explicitly built in symmetric recovery ("the completing child SHALL be able to undo their own completion, and a parent SHALL be able to reopen any household completion"). No equivalent exists here: a parent who skips the wrong child's occurrence, or skips by accident, has no documented way to restore it to active.
- **Impact:** This is a real, foreseeable action-mistake (fat-finger on a touch device, wrong child selected) with no recovery journey — a core review priority (#5, #9). Users will hit a dead end and may resort to deleting/recreating templates, contaminating history.
- **Recommendation:** Either explicitly state skip is permanently irreversible (and justify why, given completion elsewhere is reversible) or add a scenario allowing a parent to restore a same-day skipped occurrence to active, mirroring the existing "reopen" pattern.
- **Verification needed:** Product decision on whether skip should be reversible; if yes, add scenario and state-diagram edge.

### I2. Multi-day generation gap / outage backfill behavior is unspecified
**Rejected by Product Owner**
> PO Notes: this suggests that recurring occurrences are only genereated when a user logs in to the family. This should not be the case. Recurring occurrences should be created server-side, even if no family logs in.

- **Location:** `design.md` "Decisions" ("Generate current-day occurrences via scheduled invocation with a lazy read-time reconciliation fallback") and "Risks/Trade-offs" ("Scheduled execution may fail or run late"); `specs/daily-recurring-rounds/spec.md` "Idempotent Occurrence Generation" (only covers same-day duplicate generation).
- **Evidence:** The idempotency requirement only guarantees "at most one occurrence per template and household-local date" for repeated attempts on the *same* date. Nothing states what happens if the scheduled job (and every read) misses several consecutive days — e.g., a multi-day outage or a household that doesn't open the app for a week. Are the skipped days silently absent from history forever, or does reconciliation backfill several `MISSED` occurrences retroactively when the app is next opened?
- **Impact:** This is exactly the kind of failure/recovery scenario the review is required to check (#5, #9). The two plausible outcomes ("silent history gap" vs "retroactive backfill of missed days") have different privacy and correctness implications (e.g., `surface-routine-trends`, a dependent change, aggregates "completed/missed/skipped" counts — a silent gap versus backfill changes those totals).
- **Recommendation:** Add an explicit scenario: "When generation has not run for N prior calendar days, the system SHALL/SHALL NOT backfill missed occurrences for those days," with a stated behavior.
- **Verification needed:** Confirm intended behavior with product owner; this also affects `surface-routine-trends` accuracy claims.

### I3. Effect of editing a template on an already-generated current-day occurrence is undefined
**Accepted by PO**
> PO Notes: The decision here will be to leave the current day's already-generated content there. The parent can SKIP it if really  necessary.

- **Location:** `specs/daily-recurring-rounds/spec.md` "Daily Recurrence Template" ("A parent SHALL be able to create, edit, stop, and assign a daily recurrence template..."); `design.md` ("A recurrence template owns immutable date-keyed Todo occurrences").
- **Evidence:** The spec grants template editing (presumably title/assignee) but never states whether editing a template changes today's already-generated occurrence, or only future occurrences. "Immutable" occurrences suggest edits apply only going forward, but this is inferred, not stated, and there is no scenario covering it.
- **Impact:** A parent reassigning a chore to a different child mid-day will get inconsistent results depending on which behavior an implementer picks — either the currently active occurrence silently changes assignee (surprising to the original assignee, who may have already started/completed it) or it doesn't (parent expects immediate effect and is confused when the child still sees the old assignee).
- **Recommendation:** Add a scenario: "WHEN a parent edits a template with an existing current occurrence THEN [today's occurrence is/is not affected; changes apply starting tomorrow]."
- **Verification needed:** Product decision, then scenario addition.

### I4. Fate of a template's current-day occurrence upon "stop" is only defined in tasks.md, not in the spec
**Accepted by Product Owner**

- **Location:** `tasks.md` 2.1 ("stopped templates preserve history and skips remove only current work") vs `specs/daily-recurring-rounds/spec.md` "Daily Recurrence Template" ("Stopping a template SHALL prevent future occurrences and SHALL preserve existing history") and the `design.md` state diagram (no "stop" transition shown at all).
- **Evidence:** The task's completion criterion implies that stopping a template leaves any current-day active occurrence untouched (it still rolls over naturally to completed/missed) — only an explicit skip removes current work. This is a real, testable product decision, but it exists nowhere in `spec.md` as a requirement or scenario, and the state diagram in `design.md` doesn't model a "stop" transition at all.
- **Impact:** This is precisely the "tasks silently inventing behavior not present in the spec" failure mode the review is required to catch (#11). A different implementer reading only `spec.md` could reasonably conclude stopping a template should also archive/remove the current occurrence (since "stop" and "skip" are described similarly in the proposal: "Allow parents to archive a current occurrence as skipped" is one action; "stop" a template is described as a separate action, but the interaction between the two is never stated in the spec).
- **Recommendation:** Add a scenario to `spec.md` under "Daily Recurrence Template" or "Non-Intrusive Round Rollover" making explicit: "WHEN a parent stops a template that has a current active occurrence THEN that occurrence remains active/is skipped/[decision] until it rolls over."
- **Verification needed:** Confirm this is the intended behavior, then move it into the spec as a first-class scenario.

### I5. Visibility scope of the parent's skip "reason" metadata to the child is unstated
**Accepted by Product Owner**
> PO Notes: This suggests a misdefined piece of the spec. Parents should not entere reasons at all when they skip. It's just a new state.

- **Location:** `design.md` "Decisions" ("Parent skip transitions only current active occurrences and retains reason/state metadata"); `specs/daily-recurring-rounds/spec.md` "Parent Skip and Child History Protection" ("Children SHALL be able to view their own completed, missed, and skipped occurrence history").
- **Evidence:** The design commits to retaining a skip "reason," but the spec never states whether that reason field is included in what the child can view in their own history, or is parent-only. A parent might record something like "sick" (benign) or a private note about family circumstances not intended for the child's eyes.
- **Impact:** This is a privacy/permissions gap (review priority #6) — the review must treat "children can view their history" and "reason metadata is retained" as two separate visibility questions, and the spec currently conflates them by silence.
- **Recommendation:** Add an explicit statement: is the skip reason parent-only, or included in the child's read-only history view? If included, what data-entry guidance/limits exist to keep it appropriate for the child audience?
- **Verification needed:** Product decision, then explicit scenario/field-visibility statement.

### I6. Concurrency/conflict-safety for round transitions is not addressed, despite the sibling capability establishing the pattern
**Rejected by Product Owner**

- **Location:** `manage-todo-lifecycle-and-history/specs/todo-lifecycle-history/spec.md` "Lifecycle Conflict Safety" (established pattern: conflicting writes must be detected, one wins, the other gets current state + recovery guidance) vs `specs/daily-recurring-rounds/spec.md`, which has no equivalent requirement for occurrence-state races.
- **Evidence:** `design.md` states rollover happens "via scheduled invocation with a lazy read-time reconciliation fallback," and completion/skip are separate mutating actions. A child completing an occurrence at the same moment the day-boundary rollover marks it `MISSED`, or a parent skipping while a child is mid-completion, are foreseeable races this change never addresses (only occurrence *generation* idempotency is covered).
- **Impact:** Without a stated conflict rule, an implementation could silently let a completion "win" after the round has already been marked missed (or vice versa), producing state a user did not expect and cannot explain, undermining the feature's stated goal of trustworthy, non-intrusive history.
- **Recommendation:** Extend the idempotency/conflict-safety requirement to cover state-transition races (completion vs. rollover, completion vs. skip), following the precedent already set in `todo-lifecycle-history`.
- **Verification needed:** Add scenario(s) and confirm the intended "who wins" rule (e.g., completion recorded before local-day-end always wins even if rollover runs late).

### I7. Cross-household isolation for templates has no explicit scenario, unlike sibling capabilities
**Accepted by Product Owner**

- **Location:** `specs/daily-recurring-rounds/spec.md` (no cross-household scenario) vs `organize-todos-with-labels/specs/todo-label-organization/spec.md` ("Cross-household label" scenario) and `bootstrap-household-membership`'s general "Tenant Isolation" requirement.
- **Evidence:** The general Tenant Isolation requirement ("Every household-scoped API operation SHALL... verify Membership server-side... SHALL NOT trust a client-supplied household identifier") likely covers templates and occurrences by inheritance, but this change introduces new identifiers (template ID, occurrence ID) and new parent-only mutating endpoints (create/edit/stop/skip) without a scenario confirming isolation for them specifically, as every other capability in this codebase has done for its own new identifiers.
- **Impact:** Security review priority (#6/#7). Omission is not proof of a vulnerability, but it is an inconsistency with the established spec convention, and `tasks.md` 3.1 only generically references "authorization" tests without naming the cross-household case.
- **Recommendation:** Add an explicit scenario, e.g., "WHEN a parent submits a template or occurrence identifier belonging to another household THEN the request is denied without disclosing that record."
- **Verification needed:** Confirm the general isolation requirement is intended to cover this without restatement, or add the explicit scenario.

### I8. Retroactive parent correction of a missed occurrence is a plausible user need left unaddressed
**Accepted by Product Owner**

- **Location:** `design.md` "Non-Goals" ("retroactive child completion"); `specs/daily-recurring-rounds/spec.md` (silent on parent-side retroactive correction).
- **Evidence:** The design explicitly excludes *child* retroactive completion but says nothing about whether a *parent* can mark a missed occurrence complete after the fact (e.g., "I forgot to check it off, but she did brush her teeth"). The base "Completion and Reversal" requirement lets a parent "reopen any household completion," but reopening a `COMPLETED` Todo is different from converting a `MISSED` occurrence into `COMPLETED`.
- **Impact:** This is a believable, everyday correction parents will want and currently has no defined answer — leaving it to be invented during implementation.
- **Recommendation:** State explicitly whether parents can convert a `MISSED` occurrence to `COMPLETED` (or vice versa) after the fact, and if not, document that as an intentional non-goal alongside the child-retroactive-completion exclusion.
- **Verification needed:** Product decision.

---

## Optional improvements

- `tasks.md` 3.2 ("scheduled-job health metrics, privacy-safe logs, and alert/runbook documentation") introduces operational/SRE scope with no corresponding requirement in `spec.md`. Given the brief's constraint to favor free/cheap infrastructure and a 5-user household, consider whether full alerting/runbook tooling is proportionate for this feature, or whether "lazy reconciliation" alone (already specified) is sufficient mitigation for MVP of this slice. Not blocking, but worth a proportionality check before building it.
    - Accepted by Product Owner. Do not overcomplicate the ops here. Certainly do not provision any resources that would cause expenses.
- `tasks.md` 1.1's completion criterion ("one-off Todos remain behaviorally unchanged") is somewhat subjective; consider naming the specific existing test suite(s) that must continue passing as the objective proof.
    - Accepted by Product Owner
- Consider whether the state diagram in `design.md` should show the "stop" transition explicitly (see I4) rather than leaving it implicit.

## Missing decisions or scenarios

1. Whether `MISSED`/`SKIPPED` are new Todo states or `ARCHIVED` variants, and whether general parent edit/delete powers apply to occurrences (B1).
2. Whether a parent can undo a mistaken skip (I1).
3. Whether missed-day generation gaps are backfilled or silently absent from history (I2).
4. Whether editing a template affects an already-generated current occurrence (I3).
5. Whether stopping a template affects its current-day occurrence, or only future generation (I4).
6. Whether the skip "reason" field is visible to the child in their history view (I5).
7. The conflict rule when completion and rollover (or completion and skip) race (I6).
8. Whether parents can retroactively convert a missed occurrence to completed (I8).

## Traceability gaps

- Proposal commits to a Modified Capability (`todo-lifecycle-history`) with no accompanying spec delta in this change (B1).
- `tasks.md` 2.1 and 3.2 encode product behavior (stop-vs-skip semantics; operational alerting) that is not present as a requirement or scenario in `specs/daily-recurring-rounds/spec.md` (I4; Optional).
- `design.md`'s state diagram has no "stop" transition, leaving that path (referenced in `tasks.md`) undocumented at the design level as well as the spec level.
- No `docs/adr/`, `docs/architecture/`, `docs/security/`, `docs/ux/`, or `docs/testing/` exist in this repository to cross-check against; all cross-referencing here relied on prior OpenSpec changes' specs as the de facto canon. This is a repository-wide gap, not unique to this change, but it means this change cannot currently be checked against any independently-approved architecture, security, or UX standard beyond sibling specs.

## Recommended scope for this change

Keep the proposal's scope as-is (daily-only, single-assignee, no ordering/notifications/points) — it is appropriately minimal and consistent with the roadmap already laid out in `expand-weekly-and-monthly-rounds` and `surface-routine-trends`. Do not expand scope. Instead, resolve the eight missing decisions above by adding scenarios/spec text; several (I1, I3, I4, I5, I8) are answerable with a single sentence each and do not require new capabilities.

## Recommended next action

Resolve B1 first: decide and document how `MISSED`/`SKIPPED` occurrence states relate to the existing Todo lifecycle model (new states vs. `ARCHIVED` variant) and whether general parent edit/delete powers apply to occurrences — then add the missing `todo-lifecycle-history` spec delta before any implementation task in section 1 of `tasks.md` begins, since the persistence model (task 1.1) depends directly on this decision.
