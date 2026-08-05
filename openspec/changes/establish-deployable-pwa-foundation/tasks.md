## 1. Application and Quality Baseline

- [x] 1.1 Create the Vue, Vite, TypeScript, Tailwind, and PWA application structure using `weather` only as a reference; completion: the shell runs locally below 768px, from 768–1023px, and at or above 1024px.
- [x] 1.2 Configure formatter, linter, strict typecheck, unit tests, integration tests, production build, Playwright, and accessibility checks; completion: documented commands execute successfully in CI and locally.
- [x] 1.3 Add a local API simulator and typed client boundary; completion: the shell displays loading, success, and recoverable error states from the simulator.
- [x] 1.4 Create the canonical system-context, data-model/access-pattern, API-convention, responsive-accessibility, global-user-flow, interaction-state, threat-model, authorization-matrix, testing-strategy, and operational documents referenced by `AGENTS.md`; completion: later changes can cite these files instead of redefining shared behavior.
- [x] 1.5 Record ADRs for the PWA client, Cognito identity model, dedicated DynamoDB/PITR, server-side household authorization, manual production deployment, and household-local date semantics; completion: implementation cannot begin until the ADRs are reviewed.

## 2. Authentication and Infrastructure

- [x] 2.1 Write and review a `family-paas` handoff specification for the required username pool, app client, authorizer, table, PITR, IAM, and outputs; completion: a separate agent can implement it in `family-paas` without Todone prescribing that repository's internal design.
- [x] 2.2 Replace the unused shared Cognito pool with globally unique, immutable, case-insensitive username sign-in and optional email/phone attributes; completion: Terraform plan shows intended replacement and a pre-apply check confirms no users or consumers.
- [ ] 2.3 Update the auth package and app configuration for username terminology and JWT session handling; completion: username/password sign-in succeeds without an email attribute.
- [ ] 2.4 Add an administrator setup command or script for a verification-only test account and a minimal temporary sign-in form; completion: the form verifies auth plumbing and is explicitly marked for removal by `bootstrap-household-membership`.
- [ ] 2.5 Provision a Todone app client, JWT authorizer, dedicated on-demand DynamoDB table, PITR, and least-privilege roles; completion: Terraform outputs expose the expected app configuration and the runtime role cannot access unrelated tables.
- [ ] 2.6 Implement a protected current-session endpoint returning only `sub`, `username`, and `expiresAt`; completion: valid tokens return the exact contract and invalid or missing tokens are rejected.

## 3. Operational Safety and Verification

- [ ] 3.1 Add privacy-safe structured logging and minimal health metrics; completion: an induced endpoint failure emits request ID, route, and outcome without sensitive fields.
- [ ] 3.2 Document deploy, rollback, backup, and restore procedures; completion: documentation identifies artifact rollback and PITR restore responsibilities.
- [ ] 3.3 Add integration and security-negative tests for protected endpoint access; completion: unauthenticated and malformed-token cases fail without data disclosure.
- [ ] 3.4 Add Playwright and accessibility coverage for temporary sign-in and shell keyboard behavior at representative iPhone, iPad, and laptop viewports; completion: compact, medium, and wide tests pass and reduced motion is honored.
- [ ] 3.5 Run format, lint, typecheck, unit tests, integration tests, production build, Playwright, accessibility checks, and Terraform plan; completion: all results are recorded without bypassing failures.
- [ ] 3.6 After explicit human deployment authorization, run and record a production smoke test through the live PWA sign-in form and protected endpoint; completion: the live response matches the current-session contract. If deployment is not authorized, leave this task incomplete rather than claiming the change is done.
