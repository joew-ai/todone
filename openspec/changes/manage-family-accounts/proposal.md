## Why

Parents need to create and recover child accounts without email, while children need a simple identity that is clearly represented during assignment. Parent peers require equal authority without the ability to administer one another.

## What Changes

- Add parent-created child and parent accounts using globally unique immutable usernames stored on Membership and separate mutable, non-unique display names.
- Send the first parent from household creation to required profile setup before family management.
- Activate additional parent accounts through a branded email containing a Cognito one-time setup code and a self-selected password so each parent has their own Cognito Forgot Password path.
- Add private self-service parent recovery-email settings with verification before a replacement address becomes active.
- Add parent-managed child passwords and password reset without requiring a child email address; a reset invalidates the child's existing sessions.
- Add self-service display-name and profile-color editing; members cannot edit another member's profile.
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
- Adds a Cognito custom-message Lambda and SES-backed developer email configuration for reviewed HTML/text welcome-email copy. At family scale this remains pay-as-you-go with no dedicated IP or fixed-price SES plan.
- Does not add reusable/public household invitations, parent removal/demotion, role changes, or shared-device switching. The account-specific additional-parent welcome email is explicitly in scope.
