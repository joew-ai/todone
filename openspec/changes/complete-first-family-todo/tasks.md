## 1. Todo Domain and API

- [ ] 1.1 Add typed active/complete Todo model, validation, date-only due values, and single-household-assignee persistence; completion: invalid title or assignment requests are rejected.
- [ ] 1.2 Add parent Todo creation and role-scoped active-list APIs; completion: children query only their own active Todos and parents query each member.
- [ ] 1.3 Add conditional completion with actor/timestamp metadata; completion: duplicate and stale requests yield one correct completed state and no reversal API exists in this slice.
- [ ] 1.4 Add household-timezone overdue derivation; completion: active Todos become overdue only after their due date ends locally and remain active.
- [ ] 1.5 Extend the child-removal cascade to active and completed Todo records; completion: no Todo retains an assignment or identity reference to a fully removed child.

## 2. Parent and Child Experience

- [ ] 2.1 Implement parent Todo creation with scalar assignee selection and live name-plus-color identity; completion: validation, cancel, saving/disabled, success, failure, and retry states are usable by keyboard without losing input.
- [ ] 2.2 Implement child active list and completion feedback; completion: empty, loading, submitting, success, failure, retry, and reduced-motion states are rendered.
- [ ] 2.3 Implement parent member active-list view and restrained overdue presentation; completion: a parent can inspect current due status without accessing another household, while completed records remain deferred to lifecycle/history.
- [ ] 2.4 Resolve current member profiles for Todo identity; completion: changing a member's display name or color updates existing Todo presentation without rewriting Todos.

## 3. Verification

- [ ] 3.1 Add unit and integration tests for scalar-assignee validation, creation failures, role authorization, overdue timezone boundaries, idempotency, already-completed stale clients, live profile identity, child-removal cascade, and cross-child denial; completion: all state transitions and negative cases pass.
- [ ] 3.2 Add Playwright and accessibility coverage for parent assignment and child keyboard completion at iPhone, iPad, and laptop viewports; completion: the critical workflow and overdue warning pass across configured browsers.
- [ ] 3.3 Run format, lint, typecheck, unit tests, integration tests, build, Playwright, and accessibility checks; completion: all required checks pass.
