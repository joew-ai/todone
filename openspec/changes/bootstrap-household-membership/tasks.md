## 1. Session and Bootstrap UI

- [ ] 1.1 Replace and remove the foundation's temporary form and verification-account setup with production first-parent registration, sign-in, session restoration, sign-out, and parent Forgot Password surfaces; completion: duplicate username, invalid secret, closed registration, invalid credentials, email verification, loading, error, and retry states are accessible.
- [ ] 1.2 Implement server-validated reusable deployment setup-secret registration that creates unattached accounts only; completion: multiple authorized first parents can register, no public request can join an existing household, and later household members use family management.
- [ ] 1.3 Implement the membership gate, household-creation form, browser timezone prefill/selectable fallback, and onboarding landing; completion: an authenticated non-member cannot reach application content, while successful creation displays the household name and add-members next step.

## 2. Household API and Persistence

- [ ] 2.1 Add Household, Membership with server-immutable `role`, and user lookup persistence models with transactional or idempotent bootstrap behavior; completion: retries and concurrent calls cannot create duplicate households for one user while different unattached users can create separate households.
- [ ] 2.2 Add authenticated household bootstrap and current-membership API contracts; completion: valid first users become `parent` members, existing members cannot bootstrap again, and invalid timezone/name input is rejected.
- [ ] 2.3 Add shared membership authorization middleware; completion: all scoped routes reject missing membership and cross-household IDs.

## 3. Verification

- [ ] 3.1 Add unit and integration coverage for reusable setup-secret validation, unattached registration, public join denial, duplicate usernames, parent email recovery, second-bootstrap denial, retries, session states, and cross-household denial; completion: tests prove one household per user and no client-supplied household ID can authorize access.
- [ ] 3.2 Add Playwright coverage for register-to-onboarding, parent Forgot Password, returning-session, timezone fallback, and temporary-form removal plus accessibility checks; completion: critical flows pass at representative iPhone, iPad, and laptop viewports.
- [ ] 3.3 Run format, lint, typecheck, unit tests, integration tests, build, Playwright, and accessibility checks; completion: all required checks pass.
