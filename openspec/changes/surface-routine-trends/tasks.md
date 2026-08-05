## 1. Trend Query and Authorization

- [ ] 1.1 Add terminal-occurrence range query and outcome aggregation for one child and template; completion: completed, missed, and skipped totals match historical source records.
- [ ] 1.2 Enforce parent-only and household-scoped trend access with bounded date range validation; completion: children and cross-household callers receive no summary data.

## 2. Parent Trend Experience

- [ ] 2.1 Implement parent filters for child, routine, and supported date range; completion: loading, invalid-range, empty, failure, retry, and cancellation states are available.
- [ ] 2.2 Implement neutral accessible outcome presentation with textual equivalents; completion: no points, streaks, ranks, sibling comparisons, or color-only meaning exists.

## 3. Verification

- [ ] 3.1 Add unit and integration tests for aggregation accuracy, stopped templates, range bounds, and authorization; completion: terminal outcomes are counted exactly once.
- [ ] 3.2 Add Playwright and accessibility tests for parent trends, empty range, and keyboard filter operation; completion: configured browser tests pass.
- [ ] 3.3 Add minimal health logging for aggregation failures without routine titles or family data; completion: operational errors are diagnosable without private content.
- [ ] 3.4 Run format, lint, typecheck, unit tests, integration tests, build, Playwright, and accessibility checks; completion: all required checks pass.
