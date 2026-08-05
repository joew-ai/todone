# Product Critique: expand-weekly-and-monthly-rounds

**Review type:** Pre-implementation, product/spec correctness
**Reviewer scope:** proposal.md, design.md, tasks.md, specs/weekly-monthly-recurring-rounds/spec.md, plus the prerequisite `add-daily-recurring-rounds` artifacts, `surface-routine-trends` (dependent), and `docs/product/brief.md`.

## Repository context relevant to this review

- No `src/` (or equivalent) directory exists anywhere in the repository. No feature in this project has been implemented yet.
- `openspec/specs/` (the canonical, archived spec baseline) is empty. `add-daily-recurring-rounds` — the capability this change explicitly depends on and modifies — has not been archived, and its tasks are all unchecked.
- `docs/ux/`, `docs/architecture/`, `docs/adr/`, `docs/security/`, and `docs/testing/` referenced by `AGENTS.md` as sources of truth do not exist in this repository. Only `docs/product/brief.md` exists. This limits how much of the change can be cross-checked against approved architecture/security/ADR decisions — there are none recorded yet.

These facts don't invalidate the change, but they matter for sequencing (see Important findings) and for what "modified capability" means when the capability being modified has no approved baseline.

---

## Blocking findings

### B1. Occurrence idempotency/uniqueness key for weekly and monthly rounds is undefined
**Appproved by Product Owner**

- **Location:** `specs/weekly-monthly-recurring-rounds/spec.md` (all requirements); `design.md` Decisions; `tasks.md` 1.2
- **Evidence:** The daily spec (`add-daily-recurring-rounds/specs/.../spec.md`) has an explicit requirement: *"Idempotent Occurrence Generation... at most one occurrence per template and household-local date."* The new spec has no equivalent ADDED requirement. `design.md` only says to "reuse template/date conditional occurrence uniqueness... from daily rounds," and `tasks.md` 1.2 asserts occurrences must be "idempotent" without saying what the dedup key is for a weekly or monthly cadence.
- **Impact:** Daily's key (template ID + calendar date) is 1:1 with "one occurrence per day." Weekly/monthly need 1 occurrence per *week* or *month*, not per day. Reusing the daily key verbatim would either produce duplicate occurrences if generation runs on multiple days within the same week/month, or silently no-op in ways nobody has specified. This is a core correctness invariant carried over from daily rounds, and it is not adapted — it is left for the implementing agent to invent.
- **Recommended resolution:** Add an explicit requirement (or extend the existing one via the "Modified Capabilities" section) defining the occurrence key for weekly (e.g., template ID + ISO year/week or template ID + the concrete occurrence date for that week's selected weekday) and monthly (template ID + year/month, independent of clamped day number). State this as a SHALL with a scenario covering repeated/concurrent generation within the same week/month.
- **Verification needed:** Confirm the chosen key scheme is testable and matches task 3.1's "deterministic" edge-case coverage (month lengths, leap years, DST).

### B2. Mid-cycle template mutation (edit of frequency/weekday/day-of-month) is unspecified
**Approved by Product Owner**
> PO Notes: I actually do not like that someone can "stop" a template. It should be create/edit/remove. If you remove it, historical tasks remain, but non future tasks are scheduled.

- **Location:** `specs/weekly-monthly-recurring-rounds/spec.md` — "Weekly Recurrence Schedule" / "Monthly Recurrence Schedule" requirements; `design.md` Non-Goals
- **Evidence:** The daily spec explicitly grants parents create/edit/stop, and states stopping "SHALL prevent future occurrences and SHALL preserve existing history." The new spec only says a parent "SHALL be able to configure" a weekly/monthly template — it never states what "configure" (i.e., edit) does to an already-generated *current* occurrence, and it never restates stop semantics for the new frequencies. `design.md`'s Non-Goals list ("editable past occurrences") only addresses *history*, not the live/current occurrence.
- **Impact:** A parent editing the selected weekday (e.g., Monday → Wednesday) or day-of-month (e.g., 5 → 20) mid-week/mid-month, or changing frequency (daily → weekly), is a realistic action with no defined outcome: does the visible current occurrence disappear, get re-keyed, remain until the round boundary, or become orphaned? Without this, an implementing agent must invent behavior that directly affects data integrity and what a child sees in their active list.
- **Recommended resolution:** Add a requirement/scenario for editing an active template with a current occurrence in flight, and confirm whether "stop" for weekly/monthly preserves history identically to daily (reusing the daily wording explicitly rather than only referencing it in design.md).
- **Verification needed:** A scenario an implementing agent can literally test: "parent changes weekday of a template with an active current occurrence."

---

## Important findings

### I1. Sequencing dependency is asserted but not enforced or currently true
**Approved by Product Owner**

- **Location:** `proposal.md` Impact: *"Post-MVP; depends on proven daily recurrence implementation."*
- **Evidence:** `add-daily-recurring-rounds` has not been archived and no code exists implementing it. "Proven" implies production validation, which cannot yet have happened.
- **Impact:** If this change proceeds to implementation before daily rounds are built and validated, the stated dependency is violated with no gate to catch it. The whole rationale in `proposal.md` ("Daily rounds validate the recurrence model... extending the established model") depends on that validation actually occurring first.
- **Recommended resolution:** Either add an explicit task/checkpoint ("do not start section 1 until add-daily-recurring-rounds is archived and deployed") or clarify that "proven" means "spec-approved," not "production-validated."

### I2. No migration/rollback plan, unlike the precedent change
**Approved by Product Owner**

- **Location:** `design.md` (entire file — no "Migration Plan" section)
- **Evidence:** `add-daily-recurring-rounds/design.md` has an explicit Migration Plan section (introduce templates/keys without breaking one-off Todos, staged rollout, safe rollback). This change adds new schema fields (`frequency`, `weekday`, `dayOfMonth`) to the same template model and has no equivalent section.
- **Impact:** Adding required fields to an existing entity typically needs a stated default for existing rows (e.g., implicit `frequency: daily`), a rollout order, and a rollback story. Per `AGENTS.md` review priorities, migration/rollback is a required consideration; its absence here — where the precedent artifact modeled it well — is a regression in rigor.
- **Recommended resolution:** Add a Migration Plan section mirroring the daily change: default existing templates to `frequency: daily`, sequence field addition before enabling weekly/monthly creation UI, and confirm rollback leaves existing daily behavior untouched.

### I3. Idempotent-generation and accessible-state requirements are inherited by reference only, not restated
**Approved by Prodcut Owner**

- **Location:** `specs/weekly-monthly-recurring-rounds/spec.md` — "Consistent Role and History Rules"; compare to daily's "Accessible Routine Views" requirement
- **Evidence:** The daily spec has a full requirement for loading/empty/generation-failure/retry/reduced-motion states. The new spec's closest analog only covers "parent skip, parent management, child own-history, and no-retroactive-child-completion" — it does not mention failure/loading/retry states for the new frequencies at all, even though `tasks.md` 2.2 only promises "old rounds remain absent... and read-only," not failure-state parity.
- **Impact:** An implementing agent following the letter of the new spec could ship weekly/monthly config UI without generation-failure/retry feedback, since nothing requires it here and the daily requirement is not textually extended to this capability.
- **Recommended resolution:** Either explicitly extend the daily "Accessible Routine Views" requirement to weekly/monthly in this spec's Modified Capabilities delta, or add a scenario here confirming failure/loading/retry/reduced-motion states apply uniformly regardless of frequency.

### I4. Monthly-specific rollover scenario is missing
**Approved by Product Owner**
> PO Notes: Weekly tasks should be created on Sunday morning. Monthly tasks should be created on the morning of the 1st of the month.

- **Location:** `specs/weekly-monthly-recurring-rounds/spec.md` — "Frequency-Specific Round Rollover"
- **Evidence:** The requirement covers both weekly and monthly, but the only scenario given ("Weekly round expires") is weekly-only. Monthly has a materially different edge case: clamped short-month occurrences (30th standing in for a 31st schedule) interacting with rollover and the *next* month's calculation.
- **Impact:** Without a monthly-specific scenario, it's untested/unstated whether the clamp is independently recalculated each month (schedule stays "day 31," clamps again if needed) versus drifting to "day 30" permanently. `design.md`'s risk note implies the former but the spec itself never commits to it as testable behavior.
- **Recommended resolution:** Add a scenario, e.g.: "WHEN a template scheduled for day 31 completes a clamped February occurrence THEN the March occurrence is created on the 31st (not carried forward as the 28th/30th)."

### I5. First-occurrence timing on template creation is not specified for weekly/monthly
**Approved by Product Owner**
> PO Notes: Same-day and Same-week creation of a template should NOT generate occurences for that day/week. Occurences are ONLY created in the morning of when the new time range begins.

- **Location:** `specs/weekly-monthly-recurring-rounds/spec.md` — "Weekly Recurrence Schedule" scenario: *"WHEN the selected household-local weekday begins THEN one active occurrence is available."*
- **Evidence:** The daily spec has an explicit "Parent creates daily template" scenario proving same-day occurrence creation. No equivalent scenario exists here for "parent creates a weekly template today, and today is (or is not) the selected weekday."
- **Impact:** It's ambiguous whether creating a weekly template on the selected weekday itself produces an immediate occurrence (matching daily's UX) or waits until the next scheduled generation pass — a real difference in perceived responsiveness for parents setting up routines.
- **Recommended resolution:** Add a creation-time scenario analogous to daily's, covering both "created on selected day" and "created on a non-selected day" cases.

---

## Optional improvements

- `specs/.../spec.md` "Weekly Recurrence Schedule" bakes a speculative future feature into current wording ("unless a future household setting changes it"). Consider phrasing this as a stated assumption/non-goal in `design.md` instead of embedding an unbuilt feature reference inside a SHALL statement.
- Consider adding an explicit scenario for switching frequency on an existing template (e.g., daily → weekly), even if the answer is "not supported in this change" — currently silent rather than explicitly excluded.
- The repo lacks `docs/ux/`, `docs/architecture/`, `docs/adr/`, and `docs/security/` referenced by `AGENTS.md`. Not a defect of this change, but future changes (including this one) would benefit from at least one ADR capturing the timezone/week-start/date-key decisions being made ad hoc in `design.md` across two recurrence changes now.

---

## Missing decisions or scenarios

1. Occurrence uniqueness/dedup key definition for weekly and monthly generation (B1).
2. Behavior when a parent edits weekday/day-of-month/frequency on a template with a live current occurrence (B2).
3. Whether "stop" for weekly/monthly templates preserves history identically to daily (implied, not stated).
4. Whether generation-failure/retry/loading/reduced-motion states extend to weekly/monthly UI paths (I3).
5. Monthly clamp-and-rollover behavior across consecutive months (I4).
6. First-occurrence timing on template creation for weekly/monthly (I5).
7. Migration/default value strategy for new schema fields on existing template records (I2).

---

## Traceability gaps

- `tasks.md` 1.2 requires "idempotent" generation for weekly/monthly, but no ADDED requirement in this spec states an idempotency guarantee for these frequencies — the task invents scope not backed by a spec requirement.
- `tasks.md` 2.2 promises history/active-list behavior but not failure/loading states; the daily precedent's equivalent task (2.3) explicitly covered failure/retry/loading — this change's task list silently narrows that guarantee without a corresponding spec change explaining why.
- `proposal.md` states a dependency on "proven daily recurrence implementation" that is not currently satisfied and is not gated anywhere in `tasks.md`.
- `design.md` omits a Migration Plan section present in the precedent change for a structurally similar schema change.

---

## Verdict: **NOT READY**

Two blocking ambiguities (occurrence identity/idempotency for non-daily cadences, and mid-cycle template edit behavior) are core correctness and data-integrity questions, not implementation details — an agent cannot execute this plan without silently inventing product behavior on both. Several Important findings compound this by leaving inherited invariants (accessible failure states, migration/rollback, monthly rollover edge cases) referenced rather than specified.

## Unresolved product decisions

- Occurrence dedup key for weekly and monthly rounds.
- Effect of editing an active template's schedule fields on the current in-flight occurrence.
- Whether daily's accessible failure/loading/retry states are guaranteed for weekly/monthly UI.
- Whether the monthly day-of-month clamp recalculates independently each month or drifts.
- Whether creating a template on its own scheduled day produces an immediate occurrence.
- Default/migration handling for new schema fields on pre-existing template records.
- Whether this change should begin before `add-daily-recurring-rounds` is actually implemented and validated, given the proposal's own stated dependency.

## Recommended scope for this change

Keep the frequency/schedule scope as proposed (weekly single-weekday, monthly single-day-with-clamp; no cron, no exceptions, no multi-day schedules) — this matches the product brief and avoids premature complexity. Before implementation, add the missing requirements/scenarios above to the spec (not just design.md prose) so the plan is self-contained and testable without inference.

## Recommended next action

Revise `specs/weekly-monthly-recurring-rounds/spec.md` to add explicit requirements/scenarios for B1 (occurrence uniqueness key) and B2 (mid-cycle template edit behavior), then re-run this critique before any implementation task begins.
