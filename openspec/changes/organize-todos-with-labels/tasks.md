## 1. Label Domain and API

- [ ] 1.1 Add household label records with trimmed maximum-40-character display name, case-folded uniqueness key, and optional Todo label ID; completion: empty, over-length, duplicate, and cross-household values are rejected without name snapshots.
- [ ] 1.2 Add explicit parent label creation, existing-label selection, case-insensitive prefix suggestion, and clear-label APIs; completion: duplicate creation errors rather than silently reusing a label.
- [ ] 1.3 Enforce label mutation on active and completed Todos and denial on archived Todos; completion: clearing and completed relabeling work without changing completion metadata.
- [ ] 1.4 Add role-scoped active/history filtering and child label-option metadata; completion: all household labels are available, own-used labels can be featured, and filters cannot expose sibling or other-household Todos.

## 2. Label Experience

- [ ] 2.1 Extend parent Todo create/edit and completed history with accessible label suggestion, explicit inline creation, selection, and clearing; completion: loading, no-match, disabled, success, validation, cancellation, failure, and retry states work by keyboard.
- [ ] 2.2 Add single-select active/history filters for parents and children, featuring a child's own-used labels above remaining household labels; completion: clear-filter restores the authorized default list and sibling-only filters return empty.

## 3. Verification

- [ ] 3.1 Add unit and integration tests for trimming, display-case preservation, case-folded duplicate rejection, max length, prefix suggestions, clear-label, active/completed/archive rules, filters, and tenant/role denial; completion: labels cannot cross households or broaden a child query.
- [ ] 3.2 Add Playwright and accessibility tests for label selection, no-match creation, filters, and clear filters; completion: configured browser tests pass.
- [ ] 3.3 Run format, lint, typecheck, unit tests, integration tests, build, Playwright, and accessibility checks; completion: all required checks pass.
