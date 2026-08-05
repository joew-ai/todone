## ADDED Requirements

### Requirement: Weekly Recurrence Schedule
A parent SHALL be able to configure a weekly recurrence template for one selected weekday in the household timezone. The household week SHALL begin on Monday unless a future household setting changes it.

#### Scenario: Weekly occurrence begins
- **WHEN** the selected household-local weekday begins
- **THEN** one active occurrence is available for the template assignee

### Requirement: Monthly Recurrence Schedule
A parent SHALL be able to configure a monthly recurrence template for one day number from 1 through 31. For months without that day number, the occurrence SHALL be created on the last calendar day of that month.

#### Scenario: Thirty-first on a short month
- **WHEN** a template is scheduled for the 31st and the month has 30 days
- **THEN** one occurrence is created on the 30th

### Requirement: Frequency-Specific Round Rollover
At a weekly or monthly round end, incomplete occurrences SHALL become missed and completed occurrences SHALL become completed history. Previous weekly and monthly rounds SHALL NOT appear in default active lists.

#### Scenario: Weekly round expires
- **WHEN** a weekly occurrence remains incomplete when its household-local week ends
- **THEN** it is historical missed work and the next selected weekday can create a new occurrence

### Requirement: Consistent Role and History Rules
Weekly and monthly occurrences SHALL preserve the parent skip, parent management, child own-history, and no-retroactive-child-completion rules established for daily rounds.

#### Scenario: Child views monthly history
- **WHEN** a child opens history after a monthly round expires
- **THEN** the child can view their outcome but cannot alter it
