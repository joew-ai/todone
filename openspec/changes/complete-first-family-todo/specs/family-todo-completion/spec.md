## ADDED Requirements

### Requirement: Parent Creates a Single-Assignee Todo
A parent SHALL be able to create a Todo with a non-empty title, zero or one date-only due value, and exactly one active household assignee. The system SHALL reject missing, cross-household, removed, and multiple assignees.

#### Scenario: Parent assigns child Todo
- **WHEN** a parent submits a valid Todo assigned to a child
- **THEN** the Todo is persisted as active and appears in that child's active list

#### Scenario: Invalid assignment
- **WHEN** a parent submits an assignee outside the household
- **THEN** the request is denied and no Todo is created

### Requirement: Role-Scoped Active Todo Visibility
A child SHALL see only their own active Todos. A parent SHALL be able to view active Todos for every household member. A client MUST NOT obtain broader visibility by changing request parameters.

#### Scenario: Child loads active list
- **WHEN** a child opens their active list
- **THEN** only Todos assigned to that child are returned

#### Scenario: Child requests sibling list
- **WHEN** a child requests another child's active Todos
- **THEN** the API denies the request without disclosing sibling data

### Requirement: Completion and Reversal
The assignee and any parent SHALL be able to complete an active Todo. The completing child SHALL be able to undo their own completion, and a parent SHALL be able to reopen any household completion. Completion SHALL record the actor and timestamp.

#### Scenario: Child completes assigned Todo
- **WHEN** an assignee completes an active Todo
- **THEN** it becomes complete with that child as the completion actor and is visible to parents

#### Scenario: Child completes another person's Todo
- **WHEN** a child attempts to complete a Todo assigned to someone else
- **THEN** the API denies the request

### Requirement: Reliable Completion Feedback
The active list SHALL show loading, empty, submitting, success, failure, retry, and already-changed states. It SHALL NOT show a Todo as completed until the server confirms the write. Duplicate completion submissions SHALL create one completion outcome.

#### Scenario: Completion write fails
- **WHEN** a completion request fails
- **THEN** the Todo remains active, an understandable error is announced, and retry is available

### Requirement: Accessible Member Identity and Todo Controls
Todo controls SHALL be keyboard operable and screen-reader labelled with title, due status, assignee where relevant, and completion state. Member profile color SHALL be paired with a visible name. Completion feedback SHALL honor reduced-motion preferences.

#### Scenario: Keyboard completion
- **WHEN** an assignee activates completion with the keyboard
- **THEN** the completion result is announced and focus remains usable
