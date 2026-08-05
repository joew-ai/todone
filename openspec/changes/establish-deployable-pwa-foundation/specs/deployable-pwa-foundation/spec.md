## ADDED Requirements

### Requirement: Username-Based Authentication Foundation
The platform SHALL provide a Cognito user pool that accepts case-insensitive username and password sign-in without requiring an email address or phone number. The application SHALL use the Cognito `sub` claim as the stable user identity and SHALL NOT use a username as a mutable ownership key.

#### Scenario: User signs in with no email attribute
- **WHEN** an account has only a username and password
- **THEN** the account can authenticate and receive a valid application session

#### Scenario: Identity is exposed to the protected API
- **WHEN** an authenticated user calls the current-session endpoint
- **THEN** the endpoint returns only the authenticated subject and safe session metadata

### Requirement: Protected API Boundary
The API SHALL reject requests without a valid JWT before application handlers execute. The frontend SHALL send its access token only to configured API requests and SHALL NOT cache protected API responses in the service worker.

#### Scenario: Missing token
- **WHEN** a caller requests the protected endpoint without a token
- **THEN** the API responds with an authentication failure and no session data

### Requirement: Recoverable Dedicated Data Store
Todone SHALL use a dedicated on-demand DynamoDB table with point-in-time recovery enabled. The runtime role SHALL have access only to the Todone table and explicitly required Cognito administration actions.

#### Scenario: Infrastructure inspection
- **WHEN** the deployed data store is inspected
- **THEN** it is separate from shared application data and has point-in-time recovery enabled

### Requirement: Accessible Responsive Application Shell
The PWA SHALL render a responsive application shell on compact, medium, and wide viewports. Interactive controls SHALL be keyboard operable, visibly focused, labelled for screen readers, and usable at 200 percent browser zoom. The shell SHALL honor reduced-motion preferences.

#### Scenario: Keyboard navigation
- **WHEN** a keyboard-only user navigates the shell
- **THEN** focus order is logical and every interactive control has a visible focus indication

### Requirement: Observable and Safe Operations
The deployment SHALL produce structured logs and minimal health metrics without emitting credentials, JWTs, names, Todo titles, or other private family data. The project SHALL document deploy, rollback, backup, and restore responsibilities.

#### Scenario: Protected endpoint failure
- **WHEN** a protected endpoint fails unexpectedly
- **THEN** logs contain a request identifier, route, and outcome without private request content
