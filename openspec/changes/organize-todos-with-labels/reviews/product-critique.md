# Product Critique — `organize-todos-with-labels`

Reviewer role: independent product/architecture reviewer. Pre-implementation review; no code inspected, no files edited other than this report.

Artifacts reviewed:
- `proposal.md`, `design.md`, `tasks.md`
- `specs/todo-label-organization/spec.md`
- `docs/product/brief.md`
- Prior approved changes for cross-reference: `manage-todo-lifecycle-and-history` (`todo-lifecycle-history` spec), `complete-first-family-todo` (`family-todo-completion` spec), `expand-weekly-and-monthly-rounds` (for repo-wide "Modified Capabilities" conventions)

No `docs/ux/`, `docs/architecture/`, `docs/adr/`, `docs/security/`, or `docs/testing/` directories exist in this repository yet, so this review is grounded in `docs/product/brief.md` and the sibling OpenSpec change artifacts, which currently function as the closest thing to canonical specs/ADRs.

---

## Verdict

**NOT READY**

The overall shape of the change is sound and appropriately scoped (single optional label, inline creation, role-scoped filtering, explicit non-goals). However, one requirement is ambiguous in a way that contradicts an existing, already-approved business invariant (history immutability in `todo-lifecycle-history`), and several testable behaviors implied by `tasks.md` are not backed by requirements/scenarios in `spec.md`. These are narrow, resolvable-in-place issues — not a structural rework — but they must be resolved in the artifacts (not left to the implementing agent) before work begins, per the Blocking finding below.

---

## Blocking findings

### 1. Undefined interaction between label editing and Todo lifecycle state (active vs. completed/archived)
**Approved by Product Owner**
> PO Notes: Archived todos cannot be changed - not the label, nor any other field.

- **Location:** `specs/todo-label-organization/spec.md`, "Household-Scoped Todo Labels" requirement (lines 3–4); compare with `manage-todo-lifecycle-and-history/specs/todo-lifecycle-history/spec.md`, "Parent Todo Editing" requirement (line 4).
- **Evidence:** This change's requirement states a parent "SHALL be able to assign zero or one household-scoped label to a Todo while creating **or editing** it," with no lifecycle-state qualifier. The already-approved `todo-lifecycle-history` spec explicitly scopes ordinary field edits to *active* Todos only: "A parent SHALL be able to edit the title, date-only due value, and assignee **of an active Todo**." Labels are a new editable field not covered by that enumeration, and this change does not state whether label assignment follows the same active-only restriction, or is exempt from it.
- **Impact:** Without a stated rule, an implementer must invent one. If labels are freely editable on completed/archived Todos, that quietly weakens the history-immutability posture the lifecycle spec establishes elsewhere (e.g., "Explicit Parent Deletion" requires confirmation specifically because history records are meant to be stable/accountable). If labels are restricted to active-only, that should be stated so the accessible-controls and filtering requirements are tested against the correct set of edit affordances (e.g., should history views even show a label edit control?).
- **Recommended resolution:** Add an explicit sentence to the "Household-Scoped Todo Labels" requirement stating whether label assignment/edit is permitted only on active Todos (consistent with other editable fields) or is intentionally allowed post-completion/archival (with a scenario showing why). Add a scenario for the chosen behavior.
- **Verification needed:** A test asserting the chosen behavior (either "label edit is rejected on a completed/archived Todo" or "label edit succeeds on a completed/archived Todo and appears in history") does not currently exist and cannot be authored until the decision is made.

---

## Important findings

### 2. `tasks.md` invents "create-or-select idempotency" behavior with no backing requirement/scenario
**Approved by Product Owner**
> PO Notes: Duplicate labels within the same household should be rejected with an informative error message

- **Location:** `tasks.md` line 14 ("Add unit and integration tests for normalization, create-or-select idempotency, filters, and tenant/role denial"); compare `specs/todo-label-organization/spec.md`, which has no requirement describing what happens when a parent "creates" a label whose normalized name already matches an existing household label.
- **Evidence:** The design's "Decisions" section (line 14) says labels are created only through the Todo create/edit flow, and the "Risks" section (line 22) acknowledges near-duplicate labels are a known, only-partially-mitigated risk. Nothing in `spec.md` states that submitting a "new" label matching an existing normalized name reuses the existing label record rather than creating a duplicate or erroring.
- **Impact:** This is exactly the kind of behavior an implementer would otherwise have to invent unilaterally — it directly affects data integrity (duplicate label proliferation) and is explicitly called out as a task completion criterion despite having no corresponding testable requirement to trace it back to.
- **Recommended resolution:** Add a requirement/scenario to `spec.md`, e.g. "Scenario: Parent submits a label matching an existing normalized name — WHEN a parent submits label text that normalizes to an existing household label — THEN the existing label is reused and no duplicate is created."
- **Verification needed:** A test explicitly asserting single-record reuse on normalized-name collision.

### 3. "Normalized name" is undefined
**Approved by Product Owner**
> PO Notes: trim leading/trailing whitespace, max 40 characters

- **Location:** `specs/todo-label-organization/spec.md` line 4 ("SHALL have a non-empty normalized name"); `design.md` line 15 ("Query label suggestions by normalized prefix").
- **Evidence:** Neither artifact defines what normalization means: case folding, whitespace trimming/collapsing, diacritics, maximum length, or disallowed characters. "Prefix" matching is asserted in `design.md` but never appears as a testable scenario in `spec.md` (the one matching scenario just says "text matching an existing household label," which is compatible with prefix, substring, or fuzzy matching).
- **Impact:** Suggestion matching behavior and duplicate-detection behavior both depend on this definition. Two different implementers could reasonably build materially different (and differently testable) behavior from this text.
- **Recommended resolution:** State the normalization rule (e.g., "trim leading/trailing whitespace, collapse internal whitespace, case-fold for comparison, max 40 characters") and add a scenario naming prefix matching explicitly as the suggestion algorithm.
- **Verification needed:** Unit tests for normalization edge cases (whitespace-only input, case variants, over-length input) do not currently have a spec anchor.

### 4. No requirement/scenario for clearing a label from a Todo
**Approved by Product Owner**

- **Location:** `specs/todo-label-organization/spec.md`, "Household-Scoped Todo Labels" requirement (line 3, "zero or one household-scoped label").
- **Evidence:** The requirement text permits "zero" labels, implying removability, but there is no scenario walking through a parent removing an already-assigned label (as distinct from never assigning one). All three scenarios under this requirement cover creation and cross-household rejection only.
- **Impact:** "Set to none" is a distinct, testable user action (different UI affordance, different validation path) from "never set." Without a scenario, this path is easy to omit or leave inconsistently implemented (e.g., the suggestion/creation UI may not offer a clear "no label" option).
- **Recommended resolution:** Add a scenario, e.g. "Scenario: Parent clears an assigned label — WHEN a parent removes the label from a Todo during editing — THEN the Todo has no label and no longer appears under any label filter."

### 5. Label filtering and enumeration risk for children not scenario-tested
**Approved by Product Owner**
> PO Notes: The "only labels already visible" should be a client-side only filtering feature. The API response should include all labels, and any additional data that the client will need in order to do the filtering. The child should be able to still see labels not applied to their todos, but the ones already in use for them should be "featured" above the fold.

- **Location:** `specs/todo-label-organization/spec.md`, "Role-Scoped Label Filtering" requirement (lines 21–22) and its one scenario (lines 24–26); `design.md` line 16 ("a filter never broadens a child's data scope").
- **Evidence:** The requirement restricts a child's filter *options* to "labels already visible on their own Todos," but there is no scenario for what happens if a child submits a filter request for a label ID that exists in the household but is not visible on their own Todos (e.g., a sibling's label, guessed or replayed from another session). `design.md` states the intent (never broaden scope) but the spec has no scenario proving the API fails closed (empty result, not an error that discloses whether the label exists elsewhere).
- **Impact:** This is precisely the class of authorization edge case (direct API access bypassing UI-imposed option lists) that this review is asked to scrutinize. The stated design intent is correct, but intent without a scenario is not verifiable and, per the repo's own conventions (see `family-todo-completion`'s "Child requests sibling list" scenario, which tests exactly this class of case for active-list visibility), this capability should have an equivalent.
- **Recommended resolution:** Add a scenario, e.g. "Scenario: Child filters by a label not on their own Todos — WHEN a child submits a filter for a label ID not visible on their own Todos — THEN the result is an empty, authorized list, and the API does not disclose whether the label exists elsewhere in the household."

### 6. Unclear rationale for storing a label "name snapshot" on the Todo when no rename capability exists
**Approved by Product Owner**
> PO Notes: label name snapshot is not required.

- **Location:** `design.md` line 13 ("Store a normalized label record per household and a label ID/name snapshot on each Todo"); Non-Goals (line 9) exclude "label administration pages" but do not exclude renaming, and no requirement anywhere describes a rename flow.
- **Evidence:** A denormalized name snapshot is a mechanism typically justified by a rename-drift concern (i.e., "the Todo shows the name as it was at assignment time, independent of later renames"). No rename capability exists in this change, and none is documented as deferred-but-planned.
- **Impact:** Absent a rename feature, the snapshot is either (a) dead complexity that must still be kept in sync forever for no functional benefit, or (b) a silent hint that renaming is planned later without the reconciliation behavior (what happens to existing Todos' snapshots when a label is renamed) being decided now. Per review priority "excessive or premature complexity," this should be justified or removed.
- **Recommended resolution:** Either state explicitly that the snapshot exists to support a specific, named future capability (and note it as an accepted trade-off), or remove the snapshot and query by label ID with a join, deferring the denormalization decision until a rename feature is actually proposed.

---

## Optional improvements

- `specs/todo-label-organization/spec.md`, "Accessible Label Controls" (lines 28–29): the required state list (loading, no-match, error, clear-filter, retry) omits an explicit "success" (label selected/created confirmation) and "disabled" state (e.g., control disabled while the Todo save is in flight), both of which `AGENTS.md`'s UI expectations call out generally. Consider adding these explicitly for completeness, even if trivial.
- `design.md` Non-Goals (line 9) could explicitly state whether the label filter UI supports selecting multiple labels at once (union/OR) or is strictly single-select, to remove any residual ambiguity for the filtering UI builder.
- Consider explicitly stating in `design.md` whether label suggestions are case-sensitive in display (e.g., "Bedtime" vs. "bedtime") even if normalized for matching/dedup — this affects what a parent sees in the suggestion list versus what gets stored.
    - PO Notes: filter should not be case sensitive

---

## Missing decisions or scenarios

1. Whether label assignment/edit is permitted on completed/archived Todos (Blocking Finding 1).
2. Exact normalization rule for label names (trim/case-fold/length/character rules) (Important Finding 3).
3. Whether "creating" a label whose normalized name collides with an existing label reuses the existing record (idempotent) rather than erroring or duplicating (Important Finding 2).
4. Explicit scenario for removing an assigned label back to "none" (Important Finding 4).
5. Explicit fail-closed scenario for a child attempting to filter by a label not visible on their own Todos (Important Finding 5).
6. Rationale (or removal) of the label name snapshot on Todo records absent any rename capability (Important Finding 6).

---

## Traceability gaps

- `tasks.md` line 14 references "create-or-select idempotency" as a test target with no corresponding requirement/scenario in `specs/todo-label-organization/spec.md` (see Important Finding 2).
- `proposal.md` lists `todo-lifecycle-history` as a **Modified Capability** ("Adds label visibility and filtering to existing Todo views," line 18), but no delta spec file exists for `todo-lifecycle-history` in this change — all label-filtering requirements instead live entirely under the new `todo-label-organization` capability. This mirrors an existing repo pattern (e.g., `expand-weekly-and-monthly-rounds` similarly declares a "Modified Capability" with no corresponding delta spec file), so it is not unique to this change, but it means the specific claim "adds label visibility to existing Todo views" has no spec artifact to verify against within `todo-lifecycle-history` itself. Recommend flagging this as a standing repo-wide convention gap independent of this change, or add a minimal delta note under `todo-lifecycle-history` referencing the new capability.
- The "Household-Scoped Todo Labels" requirement permits "zero" labels but has no scenario proving removal (see Important Finding 4) — a requirement clause without matching scenario coverage.

---

## Recommended scope for this change

Keep the scope as proposed (single optional label, inline suggestion/creation, role-scoped active/history filtering, explicit non-goals for multi-label, nested labels, colors, and admin pages). This is an appropriately small, reversible slice consistent with the product brief's "single label, auto-suggested" MVP capability. Do not expand scope to add label rename, deletion, or multi-select filtering in this change — resolve the six items above via targeted edits to `spec.md` and `design.md`, not by growing the feature surface.

## Recommended next action

Revise `specs/todo-label-organization/spec.md` to close Blocking Finding 1 (active-vs-historical label editability) and Important Findings 2–5 (idempotent create-or-select, normalization definition, label-removal scenario, child fail-closed filter scenario), then re-run this review before starting implementation.
