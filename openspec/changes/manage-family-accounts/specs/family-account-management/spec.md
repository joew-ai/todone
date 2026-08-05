## ADDED Requirements

### Requirement: Parent-Provisioned Members
Any parent SHALL be able to create a child or parent account in their household using a globally unique, case-insensitive, immutable username, a non-unique display name, a profile color, and an immutable selected role. A child account SHALL use a parent-supplied initial password and SHALL NOT require email. A parent account SHALL require an email address, complete email verification, and let the new parent select their own password before activation.

#### Scenario: Parent creates child
- **WHEN** a parent submits valid child account details
- **THEN** the child can sign in with the supplied username and password and belongs only to that household

#### Scenario: Parent creates another parent
- **WHEN** a parent submits a new parent username, display name, profile color, and email
- **THEN** the new parent completes email verification, selects their own password, and becomes an equal parent member with Cognito Forgot Password recovery

#### Scenario: Provisioned username already exists
- **WHEN** a parent submits a username that case-insensitively matches any existing user-pool username
- **THEN** creation is rejected with an accessible field-level conflict and no membership or partial account data is created

### Requirement: Peer Parent Protection
Every parent SHALL have equal authority to manage Todos and child accounts. The application SHALL expose no parent removal or demotion operation. Existing child-reset and child-removal endpoints SHALL reject a parent target, and a parent SHALL NOT reset another parent's password or edit another parent's profile.

#### Scenario: Parent attempts peer password reset
- **WHEN** a parent requests a password reset for another parent
- **THEN** the API denies the request and no credential changes

#### Scenario: Child-removal endpoint targets parent
- **WHEN** a parent submits another parent's identifier to child removal
- **THEN** the API denies the request and the peer parent remains active

### Requirement: Child Password Reset
A parent SHALL be able to set a new permanent password for a child account in their household. The new password SHALL never be persisted or logged by Todone.

#### Scenario: Child reset succeeds
- **WHEN** a parent submits a valid replacement password for a household child
- **THEN** the child can sign in immediately with the replacement password

### Requirement: Private Parent Recovery Email
A parent's recovery email SHALL be visible only to that parent in their own security settings and SHALL NOT appear in family management or another parent's APIs. An authenticated parent SHALL be able to replace only their own recovery email. The existing verified email SHALL remain active until the replacement email completes verification, after which Cognito Forgot Password SHALL use the replacement.

#### Scenario: Parent changes recovery email
- **WHEN** an authenticated parent submits and verifies a replacement email address
- **THEN** the replacement becomes that parent's recovery email and the previous address is no longer used for Forgot Password

#### Scenario: Parent views peer account
- **WHEN** a parent views another parent in family management
- **THEN** the peer's recovery email is not returned or displayed

### Requirement: Profile Identity
Each member SHALL have a mutable, non-unique display name and a profile color selected from a documented palette whose use meets the application's WCAG contrast rules. A member SHALL edit only their own display name and profile color. Interfaces SHALL pair profile color with the member's visible name and SHALL NOT use color as the only identity signal.

#### Scenario: Profile color is shown
- **WHEN** a member is rendered in an assignment control
- **THEN** the control shows both the member name and their profile color indicator

#### Scenario: Child edits own profile
- **WHEN** a child submits a valid change to their own display name or profile color
- **THEN** the profile is updated and later references display the current values

#### Scenario: Member edits another profile
- **WHEN** any member attempts to change another member's display name or profile color
- **THEN** the API denies the request and the target profile remains unchanged

### Requirement: Parent Family Management View
The application SHALL provide parents a responsive family-management view listing every active household member with visible display name, username, role, and profile-color indicator, but no recovery emails. It SHALL expose create-parent, create-child, child-password-reset, and confirmed child-removal actions only where authorized and SHALL provide loading, empty, submitting, disabled, success, cancellation, error, and retry states.

#### Scenario: Parent opens family management
- **WHEN** a parent opens family management
- **THEN** every active household member appears with only the actions allowed for that member's role

### Requirement: Child Account Removal
A parent SHALL be able to permanently remove a child account only after explicit confirmation describing the deletion consequences. Removal SHALL use an extensible cascade that deletes the child's Cognito identity, Membership, profile, and every child-associated data type known to the deployed application. Each later capability that introduces child-associated records SHALL extend this cascade before that capability is complete. The globally unique username SHALL become reusable only after the complete deployed cascade succeeds. The application SHALL NOT retain the child's name, color, `sub`, credentials, or user-visible historical identity.

#### Scenario: Removed child session
- **WHEN** a removed child's previously valid session calls a household API
- **THEN** the API denies access because active membership no longer exists

#### Scenario: Parent cancels child removal
- **WHEN** a parent dismisses the removal confirmation
- **THEN** the child account and all associated data remain unchanged

#### Scenario: Parent confirms child removal
- **WHEN** a parent confirms removal and the operation succeeds
- **THEN** the child identity, profile, Membership, and every child-associated record known to the deployed application are deleted and the username may be registered again as a new unrelated identity

### Requirement: Provisioning Repair Runbook
Todone SHALL NOT build parent-facing repair UI or monitoring for partial Cognito and application-data provisioning failures. The operations documentation SHALL define how an authorized operator detects and repairs or deletes orphaned users with AWS or CLI tools without logging credentials.

#### Scenario: Provisioning partially fails
- **WHEN** Cognito identity creation and Todone membership creation do not both complete
- **THEN** the parent receives a generic failure, and an authorized operator can follow the documented repair procedure before the username is retried
