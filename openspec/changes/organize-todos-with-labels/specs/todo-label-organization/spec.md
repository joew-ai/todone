## ADDED Requirements

### Requirement: Household-Scoped Todo Labels
A parent SHALL be able to assign zero or one household-scoped label while creating a Todo or editing an active or completed Todo. A parent SHALL be able to clear an assigned label. Archived Todos SHALL reject all label changes. A label display name SHALL trim leading and trailing whitespace, remain non-empty, preserve entered capitalization, and contain no more than 40 characters. A separate case-folded comparison key SHALL enforce case-insensitive uniqueness within the owning household.

#### Scenario: Parent creates label through Todo editing
- **WHEN** a parent enters a valid new label while editing a Todo
- **THEN** the label is available for later Todo assignment in that household

#### Scenario: Cross-household label
- **WHEN** a parent submits a label identifier from another household
- **THEN** the API rejects the assignment without disclosing that label

#### Scenario: Parent labels completed Todo
- **WHEN** a parent assigns or changes the label on a completed but unarchived Todo
- **THEN** the completed Todo displays the selected label in history without changing completion metadata

#### Scenario: Parent labels archived Todo
- **WHEN** a parent attempts to assign, change, or clear the label on an archived Todo
- **THEN** the request is rejected and the archived Todo remains unchanged

#### Scenario: Parent clears label
- **WHEN** a parent removes an assigned label from an active or completed Todo
- **THEN** the Todo has no label and no longer appears in that label's filtered results

#### Scenario: Duplicate normalized label
- **WHEN** a parent creates a label whose trimmed case-folded name matches an existing household label
- **THEN** creation is rejected with an informative field-level error and the existing label remains available for explicit selection

### Requirement: Label Suggestion
When a parent edits a Todo label, the application SHALL suggest existing labels whose case-folded display names start with the case-folded trimmed input and SHALL provide an explicit option to create a new valid label. The interface SHALL distinguish selection from creation.

#### Scenario: Matching label exists
- **WHEN** a parent enters text matching an existing household label
- **THEN** the existing label is offered as a selectable suggestion

### Requirement: Role-Scoped Label Filtering
Parents SHALL be able to filter household active and history views by one label at a time. Children SHALL receive all household labels as client-side filter options, with labels used on their own Todos featured before the remaining labels. A child's selected label SHALL only filter their already-authorized active or history result set and SHALL never expose a sibling's Todo.

#### Scenario: Child filters own list
- **WHEN** a child selects a visible label filter
- **THEN** only that child's matching Todos are shown

#### Scenario: Child selects label used only by sibling
- **WHEN** a child selects a household label that is not assigned to any of their own Todos
- **THEN** the child sees an empty authorized result and receives no sibling Todo data

### Requirement: Accessible Label Controls
Label suggestion and filtering controls SHALL be keyboard operable, screen-reader labelled, and understandable without relying on color. The application SHALL provide loading, no-match, disabled-while-saving, success, error, clear-filter, and retry states.

#### Scenario: No label matches
- **WHEN** a parent enters text without a matching label
- **THEN** the UI announces that no match exists and presents the allowed create action
