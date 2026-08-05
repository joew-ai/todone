## Why

The initial completion loop needs controlled correction and durable history. Parents must be able to fix, archive, restore, and deliberately delete work without children completing old items merely to remove them from view.

## What Changes

- Add parent editing, archive, restore, and deletion for Todos.
- Add completed and archived history for parents and read-only own-history for children.
- Preserve historical identity and resolve concurrent lifecycle actions safely.

## Capabilities

### New Capabilities
- `todo-lifecycle-history`: Parent-controlled Todo lifecycle and role-scoped historical records.

### Modified Capabilities

- `family-todo-completion`: Extends Todo state and visibility after completion.

## Impact

- Depends on the first family Todo loop.
- Adds `ARCHIVED` and deletion behavior but keeps recurrence outcomes out of scope.
- Explicit parent deletion is irreversible; archive is the normal reversible removal mechanism.
