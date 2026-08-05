## ADDED Requirements

### Requirement: Household-Scoped Todo Labels
A parent SHALL be able to assign zero or one household-scoped label to a Todo while creating or editing it. A label SHALL be available only within its owning household and SHALL have a non-empty normalized name.

#### Scenario: Parent creates label through Todo editing
- **WHEN** a parent enters a valid new label while editing a Todo
- **THEN** the label is available for later Todo assignment in that household

#### Scenario: Cross-household label
- **WHEN** a parent submits a label identifier from another household
- **THEN** the API rejects the assignment without disclosing that label

### Requirement: Label Suggestion
When a parent edits a Todo label, the application SHALL suggest matching existing labels from that household and SHALL provide an explicit option to create a new valid label. The interface SHALL distinguish selection from creation.

#### Scenario: Matching label exists
- **WHEN** a parent enters text matching an existing household label
- **THEN** the existing label is offered as a selectable suggestion

### Requirement: Role-Scoped Label Filtering
Parents SHALL be able to filter household active and history views by label. Children SHALL be able to filter only their own active and historical views by labels already visible on their own Todos.

#### Scenario: Child filters own list
- **WHEN** a child selects a visible label filter
- **THEN** only that child's matching Todos are shown

### Requirement: Accessible Label Controls
Label suggestion and filtering controls SHALL be keyboard operable, screen-reader labelled, and understandable without relying on color. The application SHALL provide loading, no-match, error, clear-filter, and retry states.

#### Scenario: No label matches
- **WHEN** a parent enters text without a matching label
- **THEN** the UI announces that no match exists and presents the allowed create action
