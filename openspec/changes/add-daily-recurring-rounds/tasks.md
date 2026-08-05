## 1. Recurrence Domain and Generation

- [ ] 1.1 Add daily template and date-keyed occurrence persistence models with terminal completed, missed, and skipped outcomes; completion: one-off Todos remain behaviorally unchanged.
- [ ] 1.2 Implement parent template create/edit/stop APIs and idempotent current-day generation; completion: repeated requests create exactly one occurrence per template/date.
- [ ] 1.3 Implement timezone-aware daily rollover and scheduled generation with lazy reconciliation fallback; completion: missed prior rounds do not block current work.

## 2. Routine Experience and History

- [ ] 2.1 Add parent daily routine management and current-occurrence skip controls; completion: stopped templates preserve history and skips remove only current work.
- [ ] 2.2 Extend child active and read-only history views for recurrence state; completion: previous rounds are absent from default active lists and cannot be altered by children.
- [ ] 2.3 Add generation failure, retry, loading, empty, and accessible state feedback; completion: the UI never falsely reports missing routine generation as completion.

## 3. Verification and Operations

- [ ] 3.1 Add unit and integration tests for timezone boundaries, daylight-saving dates, idempotency, missed/skip transitions, and authorization; completion: duplicate occurrence and retroactive child completion cases fail safely.
- [ ] 3.2 Add scheduled-job health metrics, privacy-safe logs, and alert/runbook documentation; completion: missed generation is observable and recoverable.
- [ ] 3.3 Add Playwright and accessibility coverage for current versus historical routine views; completion: keyboard and screen-reader interactions pass.
- [ ] 3.4 Run all required quality checks; completion: format, lint, typecheck, unit, integration, build, Playwright, and accessibility checks pass.
