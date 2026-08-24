## Why

Parents need to create and recover child accounts without email, while children need a simple identity that is clearly represented during assignment. Parent peers require equal authority without the ability to administer one another.

## What Changes

- Add parent-created child and parent accounts using globally unique immutable usernames stored on Membership and separate mutable, non-unique display names.
- Send the first parent from household creation to required profile setup before family management.
- Activate additional parent accounts through a branded email containing a Cognito one-time setup code and a self-selected password so each parent has their own Cognito Forgot Password path.
- Add private self-service parent recovery-email settings with verification before a replacement address becomes active.
- Add parent-managed child passwords and password reset without requiring a child email address; a reset invalidates the child's existing sessions.
- Add self-service display-name and profile-color editing; members cannot edit another member's profile.
- Replace in-memory screen switching with route-backed authentication, onboarding, profile, security, family-management, and authenticated `/todos` navigation so URLs identify the current surface and browser back, forward, reload, and safe deep links work as expected. During this change `/todos` is an explicit nonfunctional work-in-progress child landing page; Todo data and actions remain owned by the first Todo slice.
- Add immutable creation-time roles and peer-parent protections.
- Add confirmed full child-account removal with an extensible cascade contract. This change deletes the Cognito identity, Membership/profile, and all currently known child-owned data; each downstream Todo/history/recurrence change extends and tests the cascade for the records it introduces. The username becomes reusable after successful deletion.
- Document AWS/CLI repair for partial provisioning instead of building recovery UI or monitoring for this edge case.

## Capabilities

### New Capabilities
- `family-account-management`: Parent-managed household account provisioning and profile identity.

### Modified Capabilities

- None. The prerequisite `household-membership` capability already defines immutable roles and active membership; this change adds family-account behavior without changing those requirements.

## Impact

- Depends on household bootstrap and Cognito administrative APIs.
- Delivers the crawl MVP's immutable parent/child accounts and self-managed profiles.
- Routes the existing pre-signup trigger by Cognito trigger source: public `SignUp` requires the Entry Code, while pool-scoped IAM-authorized `AdminCreateUser` relies on parent API authorization and does not require the public gate.
- Adds the minimum reviewed Cognito administrative permissions needed for provisioning, removal, password reset, activation resend, and global child sign-out, restricted to the Todone pool.
- Uses Cognito's built-in email delivery and reviewed static HTML welcome-email template for additional-parent setup. The default 50-message daily account quota is sufficient for this private deployment; a separately configured SES sender and custom-message Lambda are deferred unless delivery volume or sender-control requirements change.
- Adds client-side routing and guarded, secret-free URLs for the existing authentication/bootstrap surfaces, the family-account surfaces introduced by this change, and the honest `/todos` placeholder needed for child landing behavior. Transient form values, credentials, email addresses, setup codes, verification codes, and tokens never enter route paths, query strings, fragments, or history state.
- Does not add reusable/public household invitations, parent removal/demotion, role changes, or shared-device switching. The account-specific additional-parent welcome email is explicitly in scope.
