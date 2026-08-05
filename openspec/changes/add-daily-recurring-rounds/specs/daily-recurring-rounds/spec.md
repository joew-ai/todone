## ADDED Requirements

### Requirement: Daily Recurrence Template
A parent SHALL be able to create, edit, stop, and assign a daily recurrence template that produces one single-assignee Todo occurrence per household-local calendar day. Stopping a template SHALL prevent future occurrences and SHALL preserve existing history.

#### Scenario: Parent creates daily template
- **WHEN** a parent creates a valid daily template for a child
- **THEN** the current household-local day has one active occurrence for that child

### Requirement: Non-Intrusive Round Rollover
At the end of a household-local day, an incomplete active occurrence SHALL become `MISSED` and a completed occurrence SHALL become `COMPLETED`. The next day's occurrence SHALL be independently available. Prior-day occurrences SHALL NOT appear in the default active list.

#### Scenario: Missed daily occurrence
- **WHEN** a daily occurrence remains incomplete after its local day ends
- **THEN** it is visible only in history as missed and the next day's occurrence can appear in the active list

### Requirement: Parent Skip and Child History Protection
A parent SHALL be able to archive a current daily occurrence as `SKIPPED`. Children SHALL be able to view their own completed, missed, and skipped occurrence history but SHALL NOT complete, undo, or otherwise change a prior round.

#### Scenario: Parent skips current occurrence
- **WHEN** a parent archives a current occurrence
- **THEN** it is recorded as skipped and is removed from the child's active list

### Requirement: Idempotent Occurrence Generation
The system SHALL create at most one occurrence per template and household-local date. Repeated generation attempts, retries, and concurrent requests SHALL return the same occurrence rather than duplicates.

#### Scenario: Generator retries
- **WHEN** generation runs more than once for the same template and date
- **THEN** only one occurrence exists

### Requirement: Accessible Routine Views
Routine and history views SHALL identify the recurrence title, date, state, and assignee using visible text and accessible labels. They SHALL provide loading, empty, generation-failure, retry, and reduced-motion feedback states.

#### Scenario: Generation failure
- **WHEN** current occurrences cannot be generated
- **THEN** the parent receives a recoverable error and the UI does not claim that current routine work is complete
