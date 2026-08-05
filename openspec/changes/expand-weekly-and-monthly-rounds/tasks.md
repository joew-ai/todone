## 1. Schedule Model and Generation

- [ ] 1.1 Extend recurrence template validation for weekly weekday and monthly day-of-month schedules; completion: invalid or irrelevant schedule fields are rejected.
- [ ] 1.2 Extend timezone-aware generator and rollover logic for weekly and monthly rounds; completion: selected-day and short-month occurrences are idempotent and historical rollover is correct.

## 2. Parent and Child Experience

- [ ] 2.1 Add accessible weekly and monthly schedule controls to routine management; completion: controls explain selected weekday/day behavior and validate by keyboard.
- [ ] 2.2 Extend current and history presentation with weekly/monthly context; completion: old rounds remain absent from active lists and read-only for children.

## 3. Verification

- [ ] 3.1 Add unit and integration coverage for Monday-start weeks, month lengths, leap years, daylight-saving boundaries, skip, and history access; completion: schedule edge cases are deterministic.
- [ ] 3.2 Add Playwright and accessibility coverage for frequency creation and historical views; completion: configured browsers pass.
- [ ] 3.3 Run format, lint, typecheck, unit tests, integration tests, build, Playwright, and accessibility checks; completion: all required checks pass.
