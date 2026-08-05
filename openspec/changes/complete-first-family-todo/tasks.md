## 1. Todo Domain and API

- [ ] 1.1 Add typed active/complete Todo model, validation, date-only due values, and single-household-assignee persistence; completion: invalid title or assignment requests are rejected.
- [ ] 1.2 Add parent Todo creation and role-scoped active-list APIs; completion: children query only their own active Todos and parents query each member.
- [ ] 1.3 Add conditional complete, undo, and parent reopen APIs with actor/timestamp metadata; completion: duplicate and stale requests yield one correct state.

## 2. Parent and Child Experience

- [ ] 2.1 Implement parent Todo creation with accessible assignee selection and name-plus-color identity; completion: validation, cancel, save, and retry states are usable by keyboard.
- [ ] 2.2 Implement child active list and completion feedback; completion: empty, loading, submitting, success, failure, retry, and reduced-motion states are rendered.
- [ ] 2.3 Implement parent member active-list view and completion attribution; completion: parent can verify a child's completion without accessing another household.

## 3. Verification

- [ ] 3.1 Add unit and integration tests for validation, role authorization, idempotency, undo, reopen, and cross-child denial; completion: all state transitions and negative cases pass.
- [ ] 3.2 Add Playwright and accessibility coverage for parent assignment and child keyboard completion on phone, tablet, and laptop layouts; completion: critical workflow passes across configured browsers.
- [ ] 3.3 Run format, lint, typecheck, unit tests, integration tests, build, Playwright, and accessibility checks; completion: all required checks pass.
