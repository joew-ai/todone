## 1. Member Domain and Authorization

- [ ] 1.1 Add immutable parent/child role, profile, active-membership, and historical identity snapshot models; completion: role and profile validation are typed and testable.
- [ ] 1.2 Add parent-only authorization helpers including peer-parent denial; completion: a parent can manage children but cannot administer another parent.

## 2. Provisioning and Recovery

- [ ] 2.1 Implement idempotent parent-created child and parent provisioning with suppressed Cognito delivery; completion: a successful request creates one Cognito identity and one matching household membership.
- [ ] 2.2 Implement parent-managed child permanent password reset with secret-safe error handling; completion: reset children can authenticate immediately and password values never appear in logs.
- [ ] 2.3 Implement child removal and partial-provisioning recovery; completion: removed sessions lose API access and failed provisioning can be safely retried or repaired.

## 3. Member Management UI and Verification

- [ ] 3.1 Implement accessible responsive family management and profile controls; completion: parent role selection, child reset, loading, validation, cancellation, and error retry states are available by keyboard.
- [ ] 3.2 Add unit, integration, and security-negative tests for role boundaries, provisioning retries, and removed sessions; completion: peer-parent and cross-household administration attempts fail.
- [ ] 3.3 Add Playwright and accessibility coverage for creating accounts and resetting child credentials; completion: configured browser tests pass.
- [ ] 3.4 Run all required quality checks; completion: format, lint, typecheck, unit, integration, build, Playwright, and accessibility checks pass.
