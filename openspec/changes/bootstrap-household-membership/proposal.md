## Why

An authenticated account is not enough to safely enter Todone. The first parent needs a clear bootstrap path, and every request needs an explicit household boundary before family data exists.

## What Changes

- Replace and remove the foundation's temporary sign-in probe with the production registration, sign-in, parent Forgot Password, sign-out, and session-restoration flow.
- Gate public first-parent registration with a reusable deployment setup secret. Each successful registrant starts unattached and may create one new household after first login.
- Require the first parent to verify a recovery email while keeping email optional for child identities created later.
- Require an authenticated user without membership to create a household before using the application.
- Create the first immutable parent membership and persist household name and IANA timezone.
- Land the first parent in an onboarding state that confirms the household and directs them to add family members and then Todos.
- Enforce household isolation at every protected API boundary.

## Capabilities

### New Capabilities
- `household-membership`: Household bootstrap, membership-gated access, and tenant isolation.

### Modified Capabilities

- None.

## Impact

- Depends on `establish-deployable-pwa-foundation`.
- Introduces Household and Membership data owned by the authenticated first parent.
- The setup secret authorizes creation of an unattached first-parent account but never joins an existing household. Existing-household invitations and public joining, pre-existing account attachment, family account creation, and Todos remain out of scope; later members of a household are created only by a parent in the application.
- Success: a new username can create exactly one household and cannot access another household.
