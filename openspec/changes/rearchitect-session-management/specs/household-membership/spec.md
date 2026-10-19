# Household Membership Delta

## MODIFIED Requirements

### Requirement: Username Session Lifecycle
The application SHALL replace and remove the foundation's temporary sign-in probe. It SHALL provide production username/password sign-in, shared-browser session restoration, sign-out, and a first-parent registration flow. Usernames SHALL be immutable, case-insensitive, and globally unique across the user pool, while display names remain separate mutable application profile data. Cognito session persistence, renewal, and cross-tab sign-out SHALL follow the browser-session-management capability; the previous sessionStorage-only restriction is replaced by its narrowly scoped shared-browser auth-storage contract. The flow SHALL display loading, invalid-credential, duplicate-username, invalid-registration-gate, registration-closed, network-failure, retry, and signed-out states without exposing credential values.

#### Scenario: Failed sign-in
- **WHEN** credentials are invalid
- **THEN** the user remains signed out, receives an understandable error, and can retry

#### Scenario: Duplicate username registration
- **WHEN** first-parent registration submits a username that case-insensitively matches an existing username
- **THEN** registration is rejected with an accessible field-level conflict and no duplicate identity is created

#### Scenario: Temporary sign-in is replaced
- **WHEN** the production session flow is delivered
- **THEN** the foundation's temporary sign-in form, verification-account setup, and obsolete tests are removed

#### Scenario: Session is restored in the current tab
- **WHEN** a signed-in user reloads the current tab while the shared browser session remains renewable
- **THEN** the application restores the shared browser account without password entry and resolves its current membership/onboarding state

#### Scenario: User signs out
- **WHEN** a signed-in user signs out
- **THEN** owned authentication storage and private rendered state are cleared, sign-out propagates to other tabs, and the signed-out experience is displayed

