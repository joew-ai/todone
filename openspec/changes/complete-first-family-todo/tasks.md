## 1. Todo Domain and API

- [ ] 1.1 Add typed active/complete Todo model, validation, date-only due values, and single-household-assignee persistence; completion: invalid title or assignment requests are rejected.
- [ ] 1.2 Add parent Todo creation and role-scoped active-list APIs; completion: children query only their own active Todos and parents query each member.
- [ ] 1.3 Add conditional completion with actor/timestamp metadata; completion: duplicate and stale requests yield one correct completed state and no reversal API exists in this slice.
- [ ] 1.4 Add household-timezone overdue derivation; completion: active Todos become overdue only after their due date ends locally and remain active.
- [ ] 1.5 Extend the child-removal cascade to active and completed Todo records; completion: no Todo retains an assignment or identity reference to a fully removed child.

## 2. Parent and Child Experience

- [ ] 2.1 Produce and review compact-first parent creation/member-list and child active-list reference states using `visual-design-foundation`, including realistic long content, empty/loading/error, overdue, submitting, confirmed celebration/removal, failure, and already-changed behavior; completion: accepted component anatomy and materially different medium/wide composition are recorded before final styling.
- [ ] 2.2 Implement parent Todo creation with scalar assignee selection and live name-plus-color identity; completion: validation, cancel, saving/disabled, success, failure, and retry states are usable by keyboard without losing input.
- [ ] 2.3 Implement child active list and server-confirmed completion feedback; completion: empty, loading, submitting, success, failure, retry, and already-changed states are rendered, confirmed pop/abstract-particle/completed/removal feedback finishes within a few seconds, and reduced motion reaches the same result without non-essential animation.
- [ ] 2.4 Implement parent member active-list view and restrained overdue presentation; completion: a parent can inspect current due status without accessing another household, while completed records remain deferred to lifecycle/history.
- [ ] 2.5 Resolve current member profiles for Todo identity; completion: changing a member's display name or color updates existing Todo presentation without rewriting Todos.

## 3. Verification

- [ ] 3.1 Add unit and integration tests for scalar-assignee validation, creation failures, role authorization, overdue timezone boundaries, idempotency, already-completed stale clients, live profile identity, child-removal cascade, and cross-child denial; completion: all state transitions and negative cases pass.
- [ ] 3.2 Add Playwright and accessibility coverage for parent assignment and child keyboard completion at iPhone, iPad, and laptop viewports; completion: the critical workflow, overdue warning, failed-write non-celebration, bounded confirmed removal, useful focus, and reduced-motion outcome pass across configured browsers.
- [ ] 3.3 Capture and manually review populated/empty/error parent and child screens plus the completion sequence at compact, medium, wide, 320-pixel reflow, and 200-percent zoom; completion: visual hierarchy matches the accepted references, long content remains usable, motion is brief/local, and no status or identity relies on color or animation alone.
- [ ] 3.4 Run format, lint, typecheck, unit tests, integration tests, build, Playwright, and accessibility checks; completion: all required checks pass.
