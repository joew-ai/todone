## Context

Daily recurrence has established template/occurrence, timezone, generation, and history behavior. This change adds schedule fields while retaining those invariants.

## Goals / Non-Goals

**Goals:** weekly selected-day and monthly selected-date schedules with predictable short-month behavior.

**Non-Goals:** arbitrary intervals, multiple days per schedule, exception calendars, or editable past occurrences.

## Decisions

- Add `frequency`, `weekday`, and `dayOfMonth` schedule fields with frequency-specific validation.
- Calculate next eligible local dates using the household IANA timezone and Monday-start ISO weeks.
- Clamp an unavailable monthly date to the final day rather than silently skipping the month.
- Reuse template/date conditional occurrence uniqueness and history state transitions from daily rounds.

## Risks / Trade-offs

- Monthly clamping means a “31st” schedule occurs on different numerical days; it is more predictable than missing a month and is explicitly visible in the UI.
- Frequency-specific edge cases increase test surface, especially around timezone and calendar boundaries.
