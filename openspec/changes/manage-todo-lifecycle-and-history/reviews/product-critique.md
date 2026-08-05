# Product Critique — `manage-todo-lifecycle-and-history`

**Reviewer role:** Independent product/architecture/security reviewer (pre-implementation)
**Artifacts reviewed:** `proposal.md`, `design.md`, `tasks.md`, `specs/todo-lifecycle-history/spec.md`
**Reference artifacts reviewed:** `docs/product/brief.md`; predecessor changes `bootstrap-household-membership`, `manage-family-accounts`, `complete-first-family-todo`; downstream changes `organize-todos-with-labels`, `add-daily-recurring-rounds`, `surface-routine-trends`

**Note on repository evidence:** `AGENTS.md` names `docs/ux/`, `docs/architecture/`, `docs/adr/`, `docs/security/`, and `docs/testing/` as sources of truth. None of these directories exist in the repository — only `docs/product/brief.md` is present. This review is therefore grounded in the product brief and the OpenSpec change history, which is the only available canonical context. This absence is called out under Traceability Gaps, not treated as a defect of this specific change.

---

## Verdict

**READY WITH REVISIONS**

The change is well-scoped, correctly sequenced after `complete-first-family-todo`, and its non-goals are sensible (no recurrence, no child editing, no labels, no bulk ops). However, the state model has one genuine ambiguity that will produce incorrect behavior if an implementer guesses wrong (restore target state), one requirement that is not testable as written (edit field validation), and one privacy/visibility rule that is under-specified for a newly-introduced capability (reassignment history attribution). These should be resolved in the spec before implementation begins; they do not require re-scoping the change.

---

## Blocking findings

### 1. Restore target state is undefined for previously-Complete Todos
**Approved by Product Owner**
> PO Notes: Restoring should return it to its previous state - whether that was active or completed or overdue.

- **Location:** `design.md` § Decisions (mermaid state diagram); `specs/todo-lifecycle-history/spec.md` § Requirement: Parent Archive and Restore
- **Evidence:** The state diagram only defines `Archived --> Active: parent restores`. There is no `Archived --> Complete` transition, even though the same diagram allows `Complete --> Archived: parent archives`. The spec requirement text says only "restore an archived Todo" without naming the resulting state, and the one scenario provided ("Parent archives active Todo") does not exercise the complete→archive→restore path at all.
- **Impact:** If a parent archives a Todo that a child had already completed (e.g., to hide it from history temporarily, or by accident) and then restores it, the diagram says it becomes `Active`. That resurrects a finished chore as an incomplete task in the child's active list — the child would see a chore they already did as newly assigned again. This directly undermines the product's stated value ("children should not have to re-complete work to get it off their list") and is a real, foreseeable path (archive is described as "the normal reversible removal mechanism," which parents will use on completed items, not just active ones).
- **Recommended resolution:** Either (a) restore SHALL return a Todo to the state it held immediately before archiving (requires persisting pre-archive status), or (b) explicitly decide restore always yields `Active` and document why that is acceptable, including whether completion metadata (actor/timestamp) is discarded or retained. Add a scenario exercising "parent restores a previously-completed Todo" with the agreed-upon outcome.
- **Verification needed:** Confirm with the product owner (Joseph) whether restore should be state-preserving. Add the missing scenario and an explicit field (e.g., `preArchiveStatus`) to the design if state-preserving restore is chosen.

### 2. Whether archived Todos are completable by parents is unspecified
**Approved by Product Owner**
> Archived Todos must be restored before they can be completed

- **Location:** `specs/todo-lifecycle-history/spec.md` § Requirement: Parent Archive and Restore
- **Evidence:** "Archived Todos SHALL be absent from active lists and SHALL NOT be completable by children." The requirement is scoped to children only. `complete-first-family-todo`'s existing spec grants parents blanket authority to complete "any active Todo," and nothing in this change revokes that authority for archived Todos.
- **Impact:** Taken literally, a parent could complete an archived Todo via a stale UI or direct API call, producing a Todo that is simultaneously `Archived` and carries fresh completion metadata — a state the mermaid diagram does not model and the history view has no defined rendering for. This is a business-invariant gap, not a cosmetic one: it affects what "archived" means and what history can be trusted to show.
- **Recommended resolution:** State explicitly that archived Todos SHALL NOT be completable by anyone (parent or child) while archived, and that only `restore` can return a Todo to a completable state. Add a denial scenario for parent-attempts-to-complete-archived-Todo.
- **Verification needed:** Confirm this closes the gap in the state diagram (no `Archived --> Complete` edge already implies this, but the prose should say so directly since it currently only restricts children).

---

## Important findings

### 3. "SHALL validate each field" is not a testable requirement
**Approved by Product Owner**
> PO Notes: Title requires non-empty, no max length. Due date is date only, it can be cleared, and it can be set in the past (which would immediately make it overdue). Assignee must be an active household member.

- **Location:** `specs/todo-lifecycle-history/spec.md` § Requirement: Parent Todo Editing
- **Evidence:** "The system SHALL validate each field and prevent edits to another household's Todo." No validation rule is stated for title (non-empty? max length?), due date (must it be date-only? can it be cleared? can it be set in the past?), or assignee (must be an active household member, as required at creation time in `complete-first-family-todo`).
- **Impact:** An implementation agent has no documented rule to implement or test against; two implementers could produce materially different (and equally "spec-compliant") behavior — e.g., one allowing a past due date, another rejecting it. This is exactly the kind of untestable requirement the review is meant to catch before coding starts.
- **Recommended resolution:** Restate the validation rules explicitly, ideally by cross-referencing (not silently duplicating) the creation-time rules from `family-todo-completion`: non-empty title, date-only due value (or absence), assignee must be an active member of the same household. Add a scenario for "parent reassigns to a removed or cross-household member" mirroring the existing creation-time denial scenario.
- **Verification needed:** Confirm the rule set with product owner if it should differ from creation-time rules (e.g., can due date be cleared on edit even though it's optional at creation — presumably yes, but say so).

### 4. No path to correct a completed Todo's title/due date/assignee
**Rejected by Product Owner**

- **Location:** `specs/todo-lifecycle-history/spec.md` § Requirement: Parent Todo Editing; `design.md` § Goals ("parent lifecycle control")
- **Evidence:** Editing is scoped to "an active Todo" only. Once a Todo is `Complete`, the only lifecycle actions available are archive, restore (to `Active`, see Finding 1), and delete. There is no `Complete --> edit` path.
- **Impact:** The proposal's own motivation is "Parents must be able to fix... work." A very ordinary case — a parent notices a typo or wrong due date after a child has already checked the item off — has no correction path except delete-and-recreate, which destroys the completion record and actor/timestamp history the rest of this change is built to preserve. This seems to contradict the change's stated purpose more than a deliberate non-goal would.
- **Recommended resolution:** Either explicitly extend editing to `Complete` Todos (most consistent with the stated goal), or add this to `design.md`'s Non-Goals list with a one-line rationale (e.g., "editing completed Todos is deferred; use archive+recreate") so it reads as a decision rather than an oversight.
- **Verification needed:** Product owner confirms intended scope for post-completion correction.

### 5. Reassignment interacts with history/privacy in an unspecified way
**Approved by Product Owner**
> PO Notes: "Ownership" in this case changes when a task is reassigned. It immediately disappears for the previous assignee, and immediately appears for the new assignee, regardless of current state (active, completed, overdue, etc.).

- **Location:** `specs/todo-lifecycle-history/spec.md` § Requirement: Parent Todo Editing (reassignment scenario) and § Requirement: Role-Scoped History
- **Evidence:** Editing now permits changing the assignee of an active Todo. History requires "A child SHALL be able to view only their own completed and archived Todo history." Nothing states which assignee (original, final, or all-time) determines "their own" once a Todo has been reassigned during its active life.
- **Impact:** This is a new privacy/ownership question introduced specifically by this change (the prior slice had no editing, so assignment was immutable and this ambiguity didn't exist). Example: Todo assigned to Child A, reassigned to Child B before completion, then completed by B. Should Child A ever see any trace of it in their history? The reasonable inference is "no — history reflects final/current assignee only," but that is an inference, not a documented decision, and it affects both the data model (does the system retain prior assignees at all?) and a concrete authorization boundary.
- **Recommended resolution:** Add an explicit sentence: history visibility is determined by the assignee at time of completion/archive (or state the chosen alternative), and confirm whether prior-assignee data is retained anywhere a child could access it.
- **Verification needed:** Add a scenario: "child who was previously (but is no longer) assigned to a Todo does not see it in their history after reassignment and completion by another member."

### 6. Design commits edits to conflict detection; spec's conflict requirement is scoped to state transitions only
**Accepted by Product Owner**

- **Location:** `design.md` § Decisions ("Store versioned conditional writes for edit, archive, restore, delete, completion, undo, and reopen.") vs. `specs/todo-lifecycle-history/spec.md` § Requirement: Lifecycle Conflict Safety
- **Evidence:** The spec's only scenario is "Concurrent archive and completion." The requirement title and prose ("Lifecycle writes SHALL use conflict detection... when a Todo changed elsewhere") is ambiguous about whether a plain field edit (not a state transition) counts as a "lifecycle write."
- **Impact:** Two parents editing the same Todo concurrently (e.g., one changes the due date, the other changes the assignee) is a plausible real scenario for a multi-parent household and is exactly the kind of race this change exists to make safe. If the requirement doesn't clearly cover it, an implementer may reasonably build last-write-wins for plain edits while building conditional writes only for state transitions — inconsistent with `design.md`'s intent.
- **Recommended resolution:** Broaden the requirement wording or add a second scenario explicitly covering concurrent edit-vs-edit (or edit-vs-delete) conflicts, so the spec and design agree on scope.
- **Verification needed:** Confirm task 3.1's "all state transitions" language is meant to include plain edits in test coverage, not just archive/complete/delete/restore.

### 7. No behavior defined for a child's already-open active list when a parent archives/deletes the displayed Todo
**Rejected by Product Owner**

- **Location:** `specs/todo-lifecycle-history/spec.md` (no requirement addresses this); `design.md` § Risks/Trade-offs (mentions "explicit refresh messaging" only for the caller performing a conflicting write, not the passive viewer)
- **Evidence:** The conflict-safety requirement covers the case where the *caller's own* write races another write. It does not address a child who is passively viewing their active list when a parent archives or deletes that same Todo from elsewhere, with no write attempted by the child.
- **Impact:** Depending on how the client is built, the child could see a Todo that no longer exists server-side and attempt to complete it, hitting an undefined error path, or could simply have a stale list until next reload — user experience is undefined either way. Given the app's synchronous, non-real-time architecture established in prior changes, "stale until refresh" is a reasonable and consistent answer, but it should be stated rather than left implicit.
- **Recommended resolution:** State explicitly (even briefly) that the app does not push live updates; a child acting on a stale Todo receives a "no longer available" style response consistent with the existing "already-changed" state from `family-todo-completion`, rather than a hard error.
- **Verification needed:** Confirm this matches the general real-time consistency posture already accepted in `complete-first-family-todo` (which required server-confirmed writes but not live push).

---

## Optional improvements

- **Deletion confirmation copy applies to non-historical Todos too.** The requirement says confirmation must "explain that deletion removes the record from history," but deletion is also permitted on Active/Complete Todos that haven't reached a history view yet. Consider wording that covers both ("this Todo, and any record of its completion, will be permanently removed") to avoid confusing copy for the active-Todo deletion path.
    - Rejected by Product Owner
- **`design.md` Non-Goals list could be more complete.** It names recurrence, child editing, labels, bulk operations, and retention expiry, but doesn't explicitly restate the still-standing exclusions inherited from `complete-first-family-todo` (multiple assignees, unassigned Todos). Restating them costs one line and removes any doubt for an implementer skimming only this change.
    - Approved by Product Owner
- **Mermaid diagram doesn't show the deletion-confirmation gate.** Not a defect (the spec requirement covers it), but adding a note or dashed transition would make the diagram a complete reference on its own.

---

## Missing decisions or scenarios

1. Target state after restoring a previously-completed, then-archived Todo (Blocking Finding 1).
2. Whether parents (not just children) are blocked from completing archived Todos (Blocking Finding 2).
3. Concrete field-level validation rules for parent edits (Important Finding 3).
4. Whether completed Todos can ever be corrected without delete+recreate (Important Finding 4).
5. History attribution rule after mid-lifecycle reassignment (Important Finding 5).
6. Whether plain concurrent edits get the same conflict-detection guarantee as state transitions (Important Finding 6).
7. Expected client behavior when a passively-viewed Todo is archived/deleted elsewhere (Important Finding 7).

None of these require expanding the change's scope — they are clarifications within the already-approved boundaries (parent lifecycle control, role-scoped history, conflict safety).

---

## Traceability gaps

- **Repository-wide:** `AGENTS.md` designates `docs/ux/`, `docs/architecture/`, `docs/adr/`, `docs/security/`, and `docs/testing/` as sources of truth for this kind of review, but none of these directories exist yet — only `docs/product/brief.md` is present. This change (and every prior change) has been authored and would be reviewed without any ADRs to check its DynamoDB/versioned-conditional-write decisions against, and without a documented test strategy to check task 3's verification claims against. This is a standing gap across the repository, not unique to this change, but it means several of this review's findings (e.g., Finding 6/7) can only be resolved by product/engineering judgment rather than by checking against an existing decision record.
- **Proposal → Design:** The proposal states "archive is the normal reversible removal mechanism" for deletion framing, but the design's state diagram allows direct `Active --> Deleted` and `Complete --> Deleted` without requiring archive first. This isn't necessarily wrong (confirmation dialogs provide the safety net either way), but the proposal's framing implies archive-first as the norm, and the design doesn't reinforce or contradict that framing for the UI — worth confirming the UI doesn't need to nudge parents toward archive before offering delete.
- **Spec → Tasks:** Task 1.1's completion criterion ("active and historical queries return correct non-overlapping sets") doesn't have a corresponding spec scenario stating what "historical" includes (completed + archived, per Role-Scoped History) versus what "active" excludes — implicitly correct, but the task's testable claim isn't traceable to an explicit scenario the way task 3.1/3.2 are traceable to named requirements.

---

## Recommended next action

Resolve the two Blocking findings (restore target state, and whether archived Todos are completable by parents) directly in `specs/todo-lifecycle-history/spec.md` — these are state-model decisions that must be nailed down before any persistence or API work begins, since they affect the schema (whether pre-archive status must be stored) and the core state diagram in `design.md`. Once those two are resolved, the Important findings can be folded into the same spec-editing pass before implementation starts.
