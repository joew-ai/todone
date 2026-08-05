## 1. Member Domain and Authorization

- [ ] 1.1 Add immutable parent/child role, globally unique immutable username, mutable non-unique display name, documented accessible color palette, profile, and active-membership models; completion: role immutability and self-only profile mutation are enforced server-side.
- [ ] 1.2 Add parent-only authorization helpers including peer-parent denial; completion: a parent can create peers and manage children but child reset/removal and profile APIs cannot administer another parent.

## 2. Provisioning and Recovery

- [ ] 2.1 Implement parent-created child provisioning with suppressed Cognito delivery and permanent parent-supplied password; completion: a successful request creates one child identity, Membership, and profile without email.
- [ ] 2.2 Implement parent-created parent activation with required verified email and self-selected password; completion: the new parent gains equal authority only after activation and can use Cognito Forgot Password.
- [ ] 2.3 Implement global case-insensitive username conflict handling across both provisioning paths; completion: duplicate submission returns a field-level error and creates no membership.
- [ ] 2.4 Implement parent-managed child permanent password reset with secret-safe error handling; completion: reset children can authenticate immediately and password values never appear in logs.
- [ ] 2.5 Implement private self-service parent recovery-email display and verified replacement; completion: only the owning parent can read/change it and the old address remains active until the new one verifies.
- [ ] 2.6 Implement confirmed full child removal as an extensible cascade across profile/Membership, Cognito identity, and currently known child data; completion: stale sessions fail, no currently deployed child data remains, and the username becomes reusable only after the full cascade succeeds.
- [ ] 2.7 Document the cascade-extension contract for downstream capabilities; completion: any change adding child-associated data must add deletion and tests before it can be complete.
- [ ] 2.8 Document AWS/CLI detection and repair or deletion of partial-provisioning and partial-removal orphans; completion: an authorized operator can recover without a built-in repair UI or logging secrets.

## 3. Member Management UI and Verification

- [ ] 3.1 Implement accessible responsive family management listing username, display name, role, color, and allowed per-member actions; completion: create, activate, reset, confirm/cancel removal, loading, disabled, success, error, and retry states work by keyboard at all three responsive targets.
- [ ] 3.2 Implement self-service display-name and profile-color editing; completion: each member can edit only their own profile and current references reflect the change.
- [ ] 3.3 Add unit, integration, and security-negative tests for role immutability, global username conflicts, parent activation/recovery, recovery-email privacy/reverification, self-only profiles, peer-parent denial, full deletion, reusable usernames, and removed sessions; completion: cross-member and cross-household administration attempts fail.
- [ ] 3.4 Add Playwright and accessibility coverage for child creation/reset/removal, parent activation, family management, and self-profile editing; completion: configured browser tests pass at iPhone, iPad, and laptop viewports.
- [ ] 3.5 Run all required quality checks; completion: format, lint, typecheck, unit, integration, build, Playwright, and accessibility checks pass.
