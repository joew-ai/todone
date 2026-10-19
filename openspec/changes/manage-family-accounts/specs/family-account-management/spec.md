## ADDED Requirements

### Requirement: Explicit Membership Resolution
The application SHALL distinguish a genuinely unattached authenticated identity from an active,
pending, inactive, credential-stale, or persistence-inconsistent Membership. Ordinary household
APIs SHALL authorize only a strongly validated active lookup, Household, and household Membership
whose member ID, `sub`, immutable username, immutable role, and activation copies agree. The sole
credential-validity cutoff SHALL be stored on the `USER#<sub>/MEMBERSHIP` lookup, and a token with
missing `iat` or `iat` at or before that cutoff SHALL NOT authorize household access.

#### Scenario: Unattached identity resolves current membership
- **WHEN** an authenticated first-parent identity has no user-membership lookup
- **THEN** current-Membership returns `membership: null` and the client may offer household setup

#### Scenario: Non-active identity resolves current membership
- **WHEN** the lookup or household Membership is pending or inactive
- **THEN** current-Membership does not return `membership: null` or household data and the client does not offer creation of a second household

#### Scenario: Stored Membership is inconsistent
- **WHEN** lookup, Household, and household Membership data is malformed, missing after reference, or disagrees on an invariant
- **THEN** authorization fails closed with a generic request-ID error and a non-identifying operator consistency outcome rather than treating the identity as unattached or disclosing stored values

#### Scenario: Token predates child credential cutoff
- **WHEN** a household request carries a token whose `iat` is missing or not later than the lookup's `credentialsValidAfter`
- **THEN** the request requires reauthentication before reading household or target data

### Requirement: Parent-Provisioned Members
Any parent SHALL be able to create a child or parent account in their household using a globally unique, case-insensitive, immutable username, a non-unique display name, a profile color, and an immutable selected role. Usernames SHALL be normalized to lowercase, contain 3-24 characters using only `a-z`, `0-9`, `-`, and `_`, allow any permitted character at the beginning or end, and be stored on Membership as an immutable read copy while Cognito remains the uniqueness authority. A child account SHALL use a parent-supplied initial password and SHALL NOT require email. A parent account SHALL require an email address, prove control of it by completing the emailed one-time setup-code flow, and select their own password before activation.

#### Scenario: Parent creates child
- **WHEN** a parent submits valid child account details
- **THEN** the child can sign in with the supplied username and password and belongs only to that household

#### Scenario: Parent creates another parent
- **WHEN** a parent submits a new parent username, display name, profile color, and email
- **THEN** a pending parent appears in family management and receives a branded welcome email with a one-time setup code for selecting their own password

#### Scenario: Additional parent activates
- **WHEN** the pending parent supplies their username, emailed one-time setup code, and a valid self-selected password
- **THEN** Cognito completes the required first-sign-in challenge and issues a new token, after which the self-only activation API validates the caller's matching pending records, marks the already-configured Cognito email verified, atomically activates both Membership copies, and returns the ordinary active Membership

#### Scenario: Existing parent attempts to activate a pending peer
- **WHEN** an active parent calls the activation API with a target identifier or another parent's pending state
- **THEN** the request is rejected before mutation because activation accepts only the verified pending caller and no target identity

#### Scenario: Parent manages a pending parent
- **WHEN** an active parent views a pending parent in family management
- **THEN** the active parent can resend the welcome email, change the pending email and resend, or cancel the pending account, but cannot manually activate it

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
A parent SHALL be able to set a new permanent password for a child account in their household. The new password SHALL never be persisted or logged by Todone. A successful reset SHALL globally sign out the child's Cognito sessions and advance the server-side credential-validity cutoff on that child's user-membership lookup so previously issued JWTs cannot continue to authorize household APIs.

#### Scenario: Child reset succeeds
- **WHEN** a parent submits a valid replacement password for a household child
- **THEN** the child can sign in immediately with the replacement password

#### Scenario: Existing child session follows reset
- **WHEN** a previously authenticated child calls a household API after their password is reset
- **THEN** authorization rejects the pre-reset token and requires the child to sign in with the replacement password

#### Scenario: Reset form navigation
- **WHEN** a parent opens `/family/children/:memberId/password` and navigates, cancels, reloads, or traverses browser history
- **THEN** the form resolves only an authorized household child, keeps passwords out of the URL/history, clears secret input, and never replays a reset automatically

#### Scenario: Local emulator cannot sign out a child
- **WHEN** reset is attempted through the local simulator whose Cognito emulator lacks global sign-out
- **THEN** the API explicitly reports reset unavailable before any password mutation and the UI makes no success claim

### Requirement: Private Parent Recovery Email
A parent's recovery email SHALL be visible only to that parent in their own security settings and SHALL NOT appear in family management or another parent's APIs. An authenticated parent SHALL be able to replace only their own recovery email. The existing verified email SHALL remain active until the replacement email completes verification, after which Cognito Forgot Password SHALL use the replacement.

#### Scenario: Parent changes recovery email
- **WHEN** an authenticated parent submits and verifies a replacement email address
- **THEN** the replacement becomes that parent's recovery email and the previous address is no longer used for Forgot Password

#### Scenario: Parent views peer account
- **WHEN** a parent views another parent in family management
- **THEN** the peer's recovery email is not returned or displayed

### Requirement: Profile Identity
Each member SHALL have a mutable, non-unique display name and a profile color selected by stable identifier from the canonical nature-inspired palette: `PINE` `#2F6B4F`, `FERN` `#4D7C3F`, `MOSS` `#6B7A3A`, `CLAY` `#B85C3F`, `CEDAR` `#8A5A44`, `MARIGOLD` `#966300`, `LAKE` `#337B8C`, and `DUSK` `#76507A`. A member SHALL edit only their own display name and profile color. Interfaces SHALL pair profile color with the member's visible name, meet the application's WCAG contrast rules in actual state combinations, and SHALL NOT use color as the only identity signal.

#### Scenario: First parent completes profile setup
- **WHEN** the first parent successfully creates a household without an existing Profile
- **THEN** the application requires display-name and profile-color setup before opening family management

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
The application SHALL provide parents a responsive family-management view listing every active household member with visible display name, username, role, and profile-color indicator, but no recovery emails. Pending parents SHALL appear with pending status and only resend-welcome, change-email-and-resend, and cancel-pending actions. The view SHALL expose create-parent, create-child, child-password-reset, and confirmed child-removal actions only where authorized and SHALL provide loading, empty, submitting, disabled, success, cancellation, error, and retry states.

#### Scenario: Parent opens family management
- **WHEN** a parent opens family management
- **THEN** every active household member and pending parent appears with only the actions allowed for that role and activation state

### Requirement: Route-Backed Account Navigation
Authentication, household/profile onboarding, self-profile, security, family-management, member-creation, and authenticated Todo-landing page surfaces SHALL use canonical client-side routes whose URLs identify the current safe surface. The authenticated route map SHALL include `/todos`. Before the Todo capability ships, `/todos` SHALL be an explicit nonfunctional work-in-progress surface and SHALL NOT render fabricated Todo data or actions or call a Todo API. Ordinary user navigation SHALL create browser history entries; automatic guard and normalization redirects SHALL replace the current entry. Browser Back, Forward, reload, and direct navigation SHALL restore the authorized surface without replaying writes or restoring secret input. Credentials, Entry Codes, verification/setup/recovery codes, tokens, email addresses, and usernames SHALL NOT appear in paths, query strings, fragments, or persisted history state.

#### Scenario: Active child enters before Todo delivery
- **WHEN** an active child with a completed Profile signs in before the Todo capability is available
- **THEN** the application replaces the entry route with `/todos` and renders only a clear work-in-progress surface with ordinary account navigation, no Todo records or controls, and no Todo API request

#### Scenario: Member navigates between account surfaces
- **WHEN** a member navigates from family management to self-profile editing and then uses browser Back
- **THEN** the URL changes for each surface and Back returns to family management without discarding confirmed server state or submitting either surface

#### Scenario: Member reloads a protected route
- **WHEN** an authenticated member reloads or directly visits a protected canonical route
- **THEN** the application restores the session, resolves Membership/onboarding authorization, and renders that route or replaces it with the required safe prerequisite route

#### Scenario: Signed-out visitor opens a protected route
- **WHEN** a signed-out visitor opens a protected canonical route
- **THEN** the application replaces it with sign-in without rendering private data and may retain only a non-secret authorized return destination in current-tab state

#### Scenario: Visitor opens a secret-bearing flow
- **WHEN** a visitor opens email verification, password reset, or additional-parent activation
- **THEN** the URL identifies only the flow and the visitor supplies username and codes in current in-memory form fields rather than through the URL or persisted history state

#### Scenario: History traverses a submitted form
- **WHEN** a user traverses Back or Forward across a route whose form was previously submitted
- **THEN** navigation performs no API mutation, does not restore secret fields, and shows only state confirmed by a fresh or retained authorized read

### Requirement: Administrative Provisioning Boundary
Public first-parent signup SHALL require the Entry Code only for Cognito `PreSignUp_SignUp`. Parent-provisioned child and additional-parent creation SHALL use IAM-authorized `AdminCreateUser`, SHALL pass parent and household authorization before the Cognito call, and SHALL be restricted by IAM to the Todone user pool. The pre-signup trigger SHALL explicitly permit `PreSignUp_AdminCreateUser` without an Entry Code and reject unexpected trigger sources. Administrative creation SHALL NOT assume or require a prior public signup event.

#### Scenario: Public caller attempts administrative creation
- **WHEN** a caller without a valid active-parent session and the runtime's IAM authority attempts to create a child or additional parent
- **THEN** no `AdminCreateUser` call is authorized and no identity or membership is created

#### Scenario: Authorized parent creates a member
- **WHEN** an active parent submits valid member details through the protected family-account API
- **THEN** the pool-scoped runtime may invoke `AdminCreateUser` and the pre-signup trigger does not require the public Entry Code

### Requirement: Branded Parent Welcome Email
Additional-parent creation and resend SHALL use reviewed application-owned HTML welcome-email copy
in Cognito's static invitation template and Cognito's built-in email delivery. The message SHALL
contain `{username}` and `{####}`, present the temporary password as a one-time setup code, explain
the shared account-password requirements, and direct the parent to `/activate-parent` without
placing username, email, setup code, password, or another secret in the URL. This private deployment
accepts Cognito's 50-message daily account quota and SHALL NOT add an SES developer configuration,
custom-message/custom-sender Lambda, dedicated IP, or paid email plan for this capability.

#### Scenario: Pending parent receives welcome email
- **WHEN** Cognito sends or resends an additional-parent welcome message
- **THEN** the parent receives branded setup instructions and a one-time code without secret values entering application logs or URLs

#### Scenario: Built-in daily email quota is exhausted
- **WHEN** Cognito refuses a welcome or verification message because the built-in daily quota is exhausted
- **THEN** the application reports that delivery could not be confirmed without exposing the address or code and does not silently switch to an unreviewed sender

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
Todone SHALL NOT build parent-facing repair UI, automatic cross-service repair, or monitoring for
partial Cognito and application-data provisioning failures. The operations documentation SHALL
define how an authorized operator detects and deletes or repairs orphaned users with AWS or CLI
tools without logging credentials. Product retries SHALL replay only a confirmed completed result;
an uncertain split result SHALL block username reuse or a repeated destructive transition until
the operator resolves it.

#### Scenario: Provisioning partially fails
- **WHEN** Cognito identity creation and Todone membership creation do not both complete
- **THEN** the parent receives a generic request-ID failure without a claim that retry is safe, and an authorized operator follows the documented repair procedure before the username is retried
