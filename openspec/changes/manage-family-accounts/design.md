## Context

Households need parent-managed credentials for children and may contain any number of equal parent accounts. Cognito provides user provisioning and permanent password reset operations, while Todone owns household role rules and profile data.

## Goals / Non-Goals

**Goals:** parent/child account creation, child recovery, profile identity, and peer-parent safety.

**Non-Goals:** invitations, email recovery, parent removal/demotion, role mutation, and shared device switching.

## Decisions

- A parent-only API validates the caller membership, creates the Cognito user with messaging suppressed, sets a permanent password, then creates the Todone Membership and profile.
- Store a provisioning operation record so retries either finish safely or report a recoverable state if Cognito succeeds before persistence.
- Roles are immutable through the UI. `parent` authorizes household and child-account administration; `child` authorizes only later child-safe Todo operations.
- Remove child membership first or atomically with identity disablement; authorization always checks active membership, so stale tokens cannot retain access.
- Historical records store a display identity snapshot rather than depending solely on a current profile.

## Risks / Trade-offs

- The runtime needs privileged Cognito operations; IAM must scope actions to the Todone user pool and all authorization occurs before calling Cognito.
- Permanent passwords make child onboarding simple but require strong transport security and strict no-log handling.
