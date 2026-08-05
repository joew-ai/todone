## 1. Lifecycle Persistence and APIs

- [ ] 1.1 Extend Todo persistence with archived status, versioning, audit metadata, and history query projections; completion: active and historical queries return correct non-overlapping sets.
- [ ] 1.2 Implement parent edit, archive, restore, and confirmed deletion APIs with conditional writes; completion: stale requests return current state without unintended overwrite.
- [ ] 1.3 Implement role-scoped history APIs; completion: children receive only read-only own history and parents receive household history.

## 2. Lifecycle and History UI

- [ ] 2.1 Add accessible parent edit, archive, restore, and deletion-confirmation controls; completion: cancellation leaves data unchanged and errors offer recovery.
- [ ] 2.2 Add parent and child history views with appropriate read-only controls; completion: empty, loading, error, retry, and responsive states are present.

## 3. Verification

- [ ] 3.1 Add unit and integration tests for all state transitions, permanent deletion, conflict handling, and role boundaries; completion: archive-versus-completion races and child mutations are denied or resolved safely.
- [ ] 3.2 Add Playwright and accessibility tests for archival, restore, confirmation cancellation, and child history; completion: keyboard and screen-reader flows pass.
- [ ] 3.3 Run all required quality checks; completion: format, lint, typecheck, unit, integration, build, Playwright, and accessibility checks pass.
