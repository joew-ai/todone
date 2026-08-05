## Why

Todone proves its core value only when a parent can assign a clear responsibility and a child can independently complete it. This is the first end-to-end household coordination loop.

## What Changes

- Allow parents to create a Todo with title, optional date-only due value, and exactly one household assignee.
- Show children only their own active Todos and parents each household member's active list.
- Allow the assignee to complete and undo; allow any parent to complete and reopen.
- Record completion actor and time, with accessible profile-color identity signals.

## Capabilities

### New Capabilities
- `family-todo-completion`: Single-assignee Todo creation, visibility, completion, undo, and parent oversight.

### Modified Capabilities

- None.

## Impact

- Depends on household membership and family accounts.
- Adds active Todo records and a parent/child workflow, but excludes archive/history, labels, recurrence, unassigned work, and multiple assignees.
- Success: a parent assigns one Todo, the child completes it independently, and the parent sees the persisted result.
