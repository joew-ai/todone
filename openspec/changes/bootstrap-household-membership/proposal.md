## Why

An authenticated account is not enough to safely enter Todone. The first parent needs a clear bootstrap path, and every request needs an explicit household boundary before family data exists.

## What Changes

- Add username registration, sign-in, sign-out, and session restoration.
- Require an authenticated user without membership to create a household before using the application.
- Create the first parent membership and persist household name and IANA timezone.
- Enforce household isolation at every protected API boundary.

## Capabilities

### New Capabilities
- `household-membership`: Household bootstrap, membership-gated access, and tenant isolation.

### Modified Capabilities

- None.

## Impact

- Depends on `establish-deployable-pwa-foundation`.
- Introduces Household and Membership data owned by the authenticated first parent.
- Does not include invitations, pre-existing account attachment, family account creation, or Todos.
- Success: a new username can create exactly one household and cannot access another household.
