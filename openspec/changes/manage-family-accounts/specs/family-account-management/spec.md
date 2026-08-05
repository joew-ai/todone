## ADDED Requirements

### Requirement: Parent-Provisioned Members
Any parent SHALL be able to create a child or parent account in their household using a unique username, initial password, display name, profile color, and immutable selected role. The system SHALL suppress invitation delivery and SHALL NOT require a child email address.

#### Scenario: Parent creates child
- **WHEN** a parent submits valid child account details
- **THEN** the child can sign in with the supplied username and password and belongs only to that household

### Requirement: Peer Parent Protection
Every parent SHALL have equal authority to manage Todos and child accounts. A parent SHALL NOT reset, remove, demote, or otherwise administer another existing parent.

#### Scenario: Parent attempts peer password reset
- **WHEN** a parent requests a password reset for another parent
- **THEN** the API denies the request and no credential changes

### Requirement: Child Password Reset
A parent SHALL be able to set a new permanent password for a child account in their household. The new password SHALL never be persisted or logged by Todone.

#### Scenario: Child reset succeeds
- **WHEN** a parent submits a valid replacement password for a household child
- **THEN** the child can sign in immediately with the replacement password

### Requirement: Profile Identity
Each member SHALL have a mutable display name and a constrained accessible profile color. Interfaces SHALL pair the profile color with the member's visible name and SHALL NOT use color as the only identity signal.

#### Scenario: Profile color is shown
- **WHEN** a member is rendered in an assignment control
- **THEN** the control shows both the member name and their profile color indicator

### Requirement: Child Account Removal
A parent SHALL be able to remove a child account from the household. Removed children SHALL lose application access, while their historical identity remains understandable in historical records.

#### Scenario: Removed child session
- **WHEN** a removed child's previously valid session calls a household API
- **THEN** the API denies access because active membership no longer exists
