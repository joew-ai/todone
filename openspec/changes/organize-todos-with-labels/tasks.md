## 1. Label Domain and API

- [ ] 1.1 Add normalized household label and optional Todo label-reference models; completion: label validation prevents empty and cross-household assignment.
- [ ] 1.2 Add parent label create-or-select and household suggestion APIs; completion: matching labels are returned only for the caller's household.
- [ ] 1.3 Add role-scoped active and history filtering APIs; completion: filters narrow an authorized result set and cannot expose sibling or other-household data.

## 2. Label Experience

- [ ] 2.1 Extend parent Todo create/edit with accessible label suggestion and explicit inline creation; completion: loading, no-match, validation, cancellation, failure, and retry states work by keyboard.
- [ ] 2.2 Add active and history label filters for parents and children; completion: clear-filter state restores the appropriate authorized default list.

## 3. Verification

- [ ] 3.1 Add unit and integration tests for normalization, create-or-select idempotency, filters, and tenant/role denial; completion: labels cannot cross households or broaden a child query.
- [ ] 3.2 Add Playwright and accessibility tests for label selection, no-match creation, filters, and clear filters; completion: configured browser tests pass.
- [ ] 3.3 Run format, lint, typecheck, unit tests, integration tests, build, Playwright, and accessibility checks; completion: all required checks pass.
