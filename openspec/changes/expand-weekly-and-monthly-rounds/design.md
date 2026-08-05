## Context

Daily recurrence has established template/generated-Todo, timezone, server generation, lifecycle, and history behavior. This change adds weekly and monthly cadence fields only after the daily model is implemented, verified, deployed through its approved process, and accepted.

## Goals / Non-Goals

**Goals:** Sunday-start weekly and calendar-month schedules with first-of-period generation, selected due dates, predictable short-month behavior, and cadence-specific idempotency.

**Non-Goals:** arbitrary intervals, multiple days per schedule, exception calendars, elapsed-period backfill, or editable missed/skipped history.

## Decisions

- Add `frequency`, `weekday`, and `dayOfMonth` schedule fields with frequency-specific validation.
- Calculate weekly periods as household-local Sunday through Saturday. Use the Sunday start date as the weekly round key, generate Sunday morning, and set the selected weekday as due date.
- Calculate monthly periods by household-local year/month. Generate on the first morning, set the configured day as due date, and clamp an unavailable day independently to that month's final day.
- Newly created templates wait for the next boundary. Edits, cadence changes, and removal affect future generation only and never rewrite an already-generated Todo.
- Reuse daily recurrence lifecycle, tenant isolation, current-only reconciliation, accessibility, failure, and history behavior. Do not backfill elapsed weekly/monthly periods.
- Inherit Archive-as-`SKIPPED`, due-date edit and completed-reopen rollover detachment, and chronological `MISSED` text/restrained warning behavior without adding a trends surface.
- Keep server generation independent of login and use conditional writes on template plus period key.

## Risks / Trade-offs

- Monthly clamping means a “31st” schedule occurs on different numerical days; it is more predictable than missing a month and is explicitly visible in the UI.
- Frequency-specific edge cases increase test surface, especially around timezone and calendar boundaries.

## Migration Plan

- Treat existing templates without a frequency field as `daily` before introducing weekly/monthly creation or cadence editing.
- Deploy read/write compatibility for frequency and cadence fields first, then enable the new scheduler paths, then enable UI controls.
- Rollback disables weekly/monthly creation and scheduling while preserving existing generated Todos and daily behavior. Templates already using a non-daily cadence remain readable and may be removed, but no new rounds are generated until the feature is restored.
