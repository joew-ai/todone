## Why

Parents need to create and recover child accounts without email, while children need a simple identity that is clearly represented during assignment. Parent peers require equal authority without the ability to administer one another.

## What Changes

- Add parent-created child and parent accounts using username/password credentials.
- Add parent-managed child password reset and member display profiles.
- Add immutable creation-time roles and peer-parent protections.
- Add child-account removal behavior and recovery from partial account provisioning.

## Capabilities

### New Capabilities
- `family-account-management`: Parent-managed household account provisioning and profile identity.

### Modified Capabilities

- `household-membership`: Adds member roles and lifecycle behavior.

## Impact

- Depends on household bootstrap and Cognito administrative APIs.
- Adds Cognito `AdminCreateUser` and `AdminSetUserPassword` permissions to the runtime, restricted to the Todone pool.
- Does not add invitations, parent removal/demotion, role changes, or shared-device switching.
