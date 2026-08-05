## 1. Lifecycle Persistence and APIs

- [ ] 1.1 Extend Todo persistence with archived status, `preArchiveStatus`, versioning, restricted full deletion snapshots, and history query projections; completion: active and historical queries are non-overlapping and audit snapshots are absent from product APIs.
- [ ] 1.2 Implement exact active-edit validation and conditional parent edit, archive, state-preserving restore, and confirmed product-deletion APIs; completion: completed/archived metadata edits fail and stale requests cannot overwrite current state.
- [ ] 1.3 Implement role-scoped history plus one conditional completed-to-active operation for child undo and parent reopen; completion: children access only own history and undo only their own completion, while parents may reopen any household completion.
- [ ] 1.4 Integrate full child-account removal with purge of associated Todos, history, and restricted audit snapshots; completion: no removed-child data remains after successful account deletion.

## 2. Lifecycle and History UI

- [ ] 2.1 Add accessible parent edit, archive, restore, reopen, and deletion-confirmation controls; completion: controls appear only in allowed states, cancellation leaves data unchanged, and errors offer recovery.
- [ ] 2.2 Add the first parent-visible completion history and child history using live profile identity, with child undo only on eligible own completions; completion: a parent can verify actor/time and empty, loading, error, retry, already-changed, and responsive states are present.

## 3. Verification

- [ ] 3.1 Add unit and integration tests for active-edit rules, pre-archive restore, archived mutation denial, undo/reopen authorization, product deletion and audit isolation, account-removal purge, edit-vs-edit conflicts, lifecycle races, and role boundaries; completion: all accepted transitions and negative cases pass.
- [ ] 3.2 Add Playwright and accessibility tests for archival, active/completed restore, child undo, parent reopen, deletion confirmation/cancellation, and child history; completion: keyboard and screen-reader flows pass at all responsive targets.
- [ ] 3.3 Run all required quality checks; completion: format, lint, typecheck, unit, integration, build, Playwright, and accessibility checks pass.
