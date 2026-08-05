## ADDED Requirements

### Requirement: Parent Todo Editing
A parent SHALL be able to edit the title, date-only due value, and assignee of an active Todo. The system SHALL validate each field and prevent edits to another household's Todo.

#### Scenario: Parent reassigns active Todo
- **WHEN** a parent assigns an active Todo to another active household member
- **THEN** the new assignee sees it in their active list and the former assignee no longer does

### Requirement: Parent Archive and Restore
A parent SHALL be able to archive an active or complete Todo and restore an archived Todo. Archived Todos SHALL be absent from active lists and SHALL NOT be completable by children.

#### Scenario: Parent archives active Todo
- **WHEN** a parent archives an active Todo
- **THEN** it moves to history and the assignee cannot complete it

### Requirement: Role-Scoped History
Parents SHALL be able to view household Todo history. A child SHALL be able to view only their own completed and archived Todo history in read-only form.

#### Scenario: Child opens history
- **WHEN** a child opens history
- **THEN** completed and archived Todos assigned to that child are displayed without lifecycle controls

### Requirement: Explicit Parent Deletion
Only a parent SHALL be able to permanently delete a Todo, including a historical Todo. The application SHALL require explicit confirmation and SHALL explain that deletion removes the record from history.

#### Scenario: Parent cancels deletion
- **WHEN** a parent dismisses the deletion confirmation
- **THEN** the Todo remains unchanged

### Requirement: Lifecycle Conflict Safety
Lifecycle writes SHALL use conflict detection and SHALL return current state when a Todo changed elsewhere. The application SHALL provide refresh or retry recovery without silently discarding a confirmed transition.

#### Scenario: Concurrent archive and completion
- **WHEN** a parent archives a Todo while a child completes an earlier version
- **THEN** at most one transition succeeds and the other caller receives current state with recovery guidance
