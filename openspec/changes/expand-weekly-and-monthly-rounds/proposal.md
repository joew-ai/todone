## Why

Daily rounds validate the recurrence model, but many family responsibilities happen weekly or monthly. Extending the established round model should preserve the same non-intrusive current-list and historical-accountability behavior.

## What Changes

- Add weekly and monthly recurrence schedules to the daily recurrence template model.
- Define Sunday-through-Saturday weekly rounds generated Sunday morning with a selected due weekday.
- Define calendar-month rounds generated on the first morning with a selected due day clamped independently for short months.
- Begin newly created weekly/monthly templates at the next period boundary, permit future-only cadence edits, and preserve already-generated Todos.
- Use cadence-specific round identity and retain the daily generated-Todo lifecycle, history, isolation, and accessibility behavior.
- Inherit Archive-as-irreversible-skip, due-edit/completed-reopen rollover detachment, and chronological missed-history warning behavior for every cadence.

## Capabilities

### New Capabilities
- `weekly-monthly-recurring-rounds`: Weekly and monthly scheduled Todo occurrences.

### Modified Capabilities

- None. This capability extends the established template model without changing the prerequisite daily recurrence requirements.

## Impact

- Post-MVP; implementation MUST wait until daily recurrence is implemented, locally verified, deployed through its approved process, and accepted as the working recurrence baseline.
- Adds schedule validation and frequency-aware occurrence generation.
- Excludes arbitrary cron expressions, recurrence exceptions, ordered routines, and notifications.
