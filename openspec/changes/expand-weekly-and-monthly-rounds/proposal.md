## Why

Daily rounds validate the recurrence model, but many family responsibilities happen weekly or monthly. Extending the established round model should preserve the same non-intrusive current-list and historical-accountability behavior.

## What Changes

- Add weekly and monthly recurrence schedules to the daily recurrence template model.
- Define household-local week start, selected weekday, monthly day, and short-month behavior.
- Preserve immutable occurrence, rollover, and history semantics across frequencies.

## Capabilities

### New Capabilities
- `weekly-monthly-recurring-rounds`: Weekly and monthly scheduled Todo occurrences.

### Modified Capabilities

- `daily-recurring-rounds`: Generalizes recurrence template behavior beyond daily frequency.

## Impact

- Post-MVP; depends on proven daily recurrence implementation.
- Adds schedule validation and frequency-aware occurrence generation.
- Excludes arbitrary cron expressions, recurrence exceptions, ordered routines, and notifications.
