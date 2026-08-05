## ADDED Requirements

### Requirement: Username Session Lifecycle
The application SHALL allow username/password registration, sign-in, session restoration, and sign-out. It SHALL display loading, invalid-credential, network-failure, retry, and signed-out states without exposing credential values.

#### Scenario: Failed sign-in
- **WHEN** credentials are invalid
- **THEN** the user remains signed out, receives an understandable error, and can retry

### Requirement: Mandatory Household Bootstrap
An authenticated user without a membership SHALL be routed to household creation and SHALL NOT access application content until creation succeeds. Successful creation SHALL create a Household and a parent Membership atomically from the user perspective.

#### Scenario: First account creates household
- **WHEN** a newly registered user submits valid household details
- **THEN** the user becomes a parent member and enters the empty household experience

#### Scenario: Creation fails
- **WHEN** household creation fails
- **THEN** no partially usable household is presented and the user can retry safely

### Requirement: Household Timezone
Each Household SHALL have an IANA timezone selected from a browser-provided default and confirmed by the first parent. Later date-based behavior SHALL interpret dates in this timezone.

#### Scenario: Invalid timezone
- **WHEN** a user submits an invalid timezone
- **THEN** creation is rejected with field-level validation guidance

### Requirement: Tenant Isolation
Every household-scoped API operation SHALL derive the caller identity from the verified JWT and SHALL verify Membership server-side. The application SHALL NOT trust a client-supplied household identifier for authorization.

#### Scenario: Cross-household request
- **WHEN** a member submits an identifier belonging to another household
- **THEN** the request is denied without disclosing the other household's data

### Requirement: Accessible Bootstrap Experience
Registration, sign-in, and household creation SHALL be keyboard operable, labelled for screen readers, responsive, and provide announced validation and submission outcomes.

#### Scenario: Screen-reader validation
- **WHEN** a required household name is omitted
- **THEN** focus and an accessible error message identify the field that requires correction
