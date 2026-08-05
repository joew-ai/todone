## ADDED Requirements

### Requirement: Parent-Only Routine Summary
A parent SHALL be able to view completed, missed, and skipped occurrence counts for a selected child and recurrence template over a selected supported date range. Children SHALL NOT access routine trend summaries.

#### Scenario: Parent views one child's routine trend
- **WHEN** a parent selects a child, routine, and supported date range
- **THEN** the application displays that routine's completed, missed, and skipped counts

#### Scenario: Child requests trends
- **WHEN** a child requests a routine trend endpoint
- **THEN** the API denies access without returning summary data

### Requirement: Non-Gamified Presentation
Routine summaries SHALL describe outcomes neutrally and SHALL NOT calculate or display points, streaks, ranks, leaderboards, sibling comparisons, or punitive language.

#### Scenario: Missed outcomes are present
- **WHEN** a selected period includes missed occurrences
- **THEN** the view reports the missed count without rank, score, or judgmental label

### Requirement: Accurate Historical Aggregation
Summaries SHALL include only terminal recurrence occurrences in the requested household-local date range and SHALL distinguish completed, missed, and skipped outcomes. Stopped templates SHALL remain reportable for their historical occurrences.

#### Scenario: Stopped routine history
- **WHEN** a parent selects a stopped template with prior occurrences
- **THEN** its historical outcomes are included in the summary

### Requirement: Accessible and Recoverable Trend View
The trend view SHALL provide loading, empty, invalid-range, error, retry, and responsive states. Outcome labels and quantities SHALL be available to screen readers and shall not rely only on charts or color.

#### Scenario: No outcomes in range
- **WHEN** the selected range contains no terminal occurrences
- **THEN** the application displays an accessible empty state rather than a misleading zero-performance judgment
