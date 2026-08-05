## ADDED Requirements

### Requirement: Parent Creates a Single-Assignee Todo
A parent SHALL be able to create a Todo with a non-empty title, zero or one date-only due value, and exactly one active household assignee supplied as one scalar assignee identifier. The system SHALL reject missing, cross-household, and removed assignees. The creation experience SHALL provide validation, cancellation, saving/disabled, success, failure, and retry states and SHALL NOT clear entered values after a recoverable failure.

#### Scenario: Parent assigns child Todo
- **WHEN** a parent submits a valid Todo assigned to a child
- **THEN** the Todo is persisted as active and appears in that child's active list

#### Scenario: Invalid assignment
- **WHEN** a parent submits an assignee outside the household
- **THEN** the request is denied and no Todo is created

#### Scenario: Parent cancels creation
- **WHEN** a parent cancels before the Todo is successfully saved
- **THEN** no Todo is created and the parent returns to the previous view

#### Scenario: Todo creation fails
- **WHEN** a valid creation request fails transiently
- **THEN** the form preserves entered values, reports an accessible error, and permits retry

### Requirement: Role-Scoped Active Todo Visibility
A child SHALL see only their own active Todos. A parent SHALL be able to view active Todos for every household member. A client MUST NOT obtain broader visibility by changing request parameters.

#### Scenario: Child loads active list
- **WHEN** a child opens their active list
- **THEN** only Todos assigned to that child are returned

#### Scenario: Child requests sibling list
- **WHEN** a child requests another child's active Todos
- **THEN** the API denies the request without disclosing sibling data

### Requirement: Completion
The assignee and any parent SHALL be able to complete an active Todo. Completion SHALL record the actor and timestamp. A completed Todo SHALL leave the child's active list, and reversal SHALL remain unavailable until the lifecycle/history capability provides a reachable completed-Todo surface.

#### Scenario: Child completes assigned Todo
- **WHEN** an assignee completes an active Todo
- **THEN** it becomes complete with that child as the completion actor, leaves all active lists, and remains persisted for the later parent and child history capability

#### Scenario: Child completes another person's Todo
- **WHEN** a child attempts to complete a Todo assigned to someone else
- **THEN** the API denies the request

### Requirement: Reliable Completion Feedback
The active list SHALL show loading, empty, submitting, success, failure, retry, and already-changed states. It SHALL NOT show a Todo as completed until the server confirms the write. Duplicate completion submissions SHALL create one completion outcome.

#### Scenario: Completion write fails
- **WHEN** a completion request fails
- **THEN** the Todo remains active, an understandable error is announced, and retry is available

#### Scenario: Todo was already completed elsewhere
- **WHEN** a stale client submits completion after another authorized user completed the Todo
- **THEN** no duplicate outcome is created and the client receives the current completed state with an accessible already-changed message

### Requirement: Household-Local Overdue Status
An active Todo with a due date SHALL become overdue after the end of that calendar date in the Household's IANA timezone. Overdue SHALL be a derived presentation state rather than a stored lifecycle state. The UI SHALL communicate overdue status with visible text or an accessible label plus a restrained red warning indicator, and SHALL NOT rely on color alone.

#### Scenario: Due date has ended
- **WHEN** the household-local calendar date advances beyond an active Todo's due date
- **THEN** parent and assignee views identify that Todo as overdue without changing its active lifecycle state

### Requirement: Accessible Member Identity and Todo Controls
Todo controls SHALL be keyboard operable and screen-reader labelled with title, due status, assignee where relevant, and completion state. Member profile color SHALL be paired with a visible name and SHALL resolve from the member's current profile rather than a Todo-level identity snapshot. Completion feedback SHALL honor reduced-motion preferences.

#### Scenario: Keyboard completion
- **WHEN** an assignee activates completion with the keyboard
- **THEN** the completion result is announced and focus remains usable

#### Scenario: Member changes profile identity
- **WHEN** an assigned member updates their display name or profile color
- **THEN** existing Todos display the member's current name and color without rewriting Todo records

### Requirement: Todo Removal Cascade
The Todo capability SHALL extend full child-account removal to delete every active or completed Todo assigned to that child. Deletion SHALL occur before the child's globally unique username is released for reuse, and no Todo SHALL retain the removed child's `sub` or profile identity.

#### Scenario: Parent removes child with assigned Todos
- **WHEN** a parent confirms full removal of a child who has active or completed Todos
- **THEN** those Todos are deleted as part of the account-removal cascade and cannot be read after removal succeeds
