## ADDED Requirements

### Requirement: Weekly Recurrence Schedule
A parent SHALL be able to configure a weekly recurrence template for one selected due weekday in the household timezone. A weekly round SHALL run Sunday through Saturday. The server SHALL generate its ordinary Todo on Sunday morning and set its due date to the selected weekday in that round. A template created during an already-started week SHALL begin at the next Sunday boundary.

#### Scenario: Weekly occurrence begins
- **WHEN** the household-local Sunday begins for an eligible weekly template
- **THEN** one active generated Todo is available with a due date on that round's selected weekday

#### Scenario: Weekly template created mid-week
- **WHEN** a parent creates a weekly template after the current Sunday boundary
- **THEN** no Todo is created for the current week and generation begins at the next Sunday boundary

### Requirement: Monthly Recurrence Schedule
A parent SHALL be able to configure a monthly recurrence template for one due-day number from 1 through 31. The server SHALL generate its ordinary Todo on the morning of the first household-local calendar day and set the due date to the configured day, clamped to that month's final day when necessary. A template created during an already-started month SHALL begin at the next first-of-month boundary.

#### Scenario: Thirty-first on a short month
- **WHEN** a template is scheduled for the 31st and the month has 30 days
- **THEN** the Todo is generated on the 1st with a due date on the 30th

#### Scenario: Monthly clamp does not drift
- **WHEN** a template configured for the 31st produces a clamped February Todo and later reaches March
- **THEN** the March Todo is due on the 31st because clamping is recalculated independently each month

#### Scenario: Monthly template created mid-month
- **WHEN** a parent creates a monthly template after the current month's first-day boundary
- **THEN** no Todo is created for the current month and generation begins on the next first day

### Requirement: Cadence-Specific Idempotency
The system SHALL create at most one generated Todo per template and cadence period. A weekly round key SHALL be the household-local Sunday start date. A monthly round key SHALL be the household-local year and month. Repeated and concurrent generation for the same key SHALL return the same Todo.

#### Scenario: Weekly generator retries during one week
- **WHEN** weekly generation runs more than once for the same template and Sunday round key
- **THEN** only one generated Todo exists for that week

#### Scenario: Monthly generator retries during one month
- **WHEN** monthly generation runs more than once for the same template and year-month round key
- **THEN** only one generated Todo exists for that month

### Requirement: Future-Only Template Changes
A parent SHALL be able to edit title, assignee, label, selected due field, and cadence between daily, weekly, and monthly, or remove the template. Edits and removal SHALL affect only generation after the edit/removal time. Already-generated Todos SHALL remain unchanged. A cadence change SHALL become eligible at the next boundary of the new cadence.

#### Scenario: Parent changes weekly template to monthly
- **WHEN** a parent changes a weekly template to monthly after the current weekly Todo exists
- **THEN** the weekly Todo remains unchanged and the first monthly Todo is eligible at the next first-of-month boundary

### Requirement: Frequency-Specific Round Rollover
At a weekly or monthly round end, incomplete generated Todos SHALL become missed and completed or skipped generated Todos SHALL retain their outcomes. Previous weekly and monthly rounds SHALL NOT appear in default active lists.

#### Scenario: Weekly round expires
- **WHEN** a weekly occurrence remains incomplete when its household-local week ends
- **THEN** it is historical missed work and the next Sunday boundary can create the next generated Todo

### Requirement: Weekly and Monthly Reconciliation
Weekly and monthly generation SHALL run server-side without user login. If generation misses period boundaries, reconciliation SHALL create only the current period's generated Todo and SHALL NOT backfill fully elapsed periods.

#### Scenario: Monthly generation resumes after missing a month
- **WHEN** server-side generation resumes during the current month after an earlier month was entirely missed
- **THEN** the current month's Todo is reconciled and the elapsed month remains absent from history

### Requirement: Consistent Role and History Rules
Weekly and monthly generated Todos SHALL preserve daily recurrence's ordinary Todo editing/deletion, Archive-as-irreversible-skip, due-date and completed-reopen rollover detachment, parent missed correction, child own-history, chronological missed warning, tenant isolation, generation failure/retry/loading, and reduced-motion rules.

#### Scenario: Child views monthly history
- **WHEN** a child opens history after a monthly round expires
- **THEN** the child can view their outcome but cannot alter it

#### Scenario: Parent reopens prior weekly completion
- **WHEN** a parent reopens a completed Todo from a prior weekly round
- **THEN** it returns to the default active list detached from weekly rollover while preserving its template and Sunday round-key metadata

### Requirement: Daily Recurrence Prerequisite
Implementation of weekly and monthly recurrence SHALL NOT begin until daily recurrence is implemented, all required local verification passes, its approved deployment smoke process is complete, and the daily model is accepted as the working recurrence baseline.

#### Scenario: Daily recurrence gate is incomplete
- **WHEN** any prerequisite daily recurrence completion evidence is missing
- **THEN** weekly/monthly implementation remains blocked
