## 1. Application and Quality Baseline

- [ ] 1.1 Create the Vue, Vite, TypeScript, Tailwind, and PWA application structure using `weather` only as a reference; completion: the shell runs locally at compact, medium, and wide viewport sizes.
- [ ] 1.2 Configure formatter, linter, strict typecheck, unit tests, integration tests, production build, Playwright, and accessibility checks; completion: documented commands execute successfully in CI and locally.
- [ ] 1.3 Add a local API simulator and typed client boundary; completion: the shell displays loading, success, and recoverable error states from the simulator.

## 2. Authentication and Infrastructure

- [ ] 2.1 Replace the unused shared Cognito pool with case-insensitive username sign-in and optional email/phone attributes; completion: Terraform plan shows intended replacement and a pre-apply check confirms no users or consumers.
- [ ] 2.2 Update the auth package and app configuration for username terminology and JWT session handling; completion: username/password sign-in succeeds without an email attribute.
- [ ] 2.3 Provision a Todone app client, JWT authorizer, dedicated on-demand DynamoDB table, PITR, and least-privilege roles; completion: Terraform outputs expose the expected app configuration and the runtime role cannot access unrelated tables.
- [ ] 2.4 Implement a protected current-session endpoint; completion: valid tokens return safe identity metadata and invalid or missing tokens are rejected.

## 3. Operational Safety and Verification

- [ ] 3.1 Add privacy-safe structured logging and minimal health metrics; completion: an induced endpoint failure emits request ID, route, and outcome without sensitive fields.
- [ ] 3.2 Document deploy, rollback, backup, and restore procedures; completion: documentation identifies artifact rollback and PITR restore responsibilities.
- [ ] 3.3 Add integration and security-negative tests for protected endpoint access; completion: unauthenticated and malformed-token cases fail without data disclosure.
- [ ] 3.4 Add Playwright and accessibility coverage for sign-in and shell keyboard behavior; completion: tests pass on the configured browsers and reduced motion is honored.
- [ ] 3.5 Run format, lint, typecheck, unit tests, integration tests, production build, Playwright, accessibility checks, and Terraform plan; completion: all results are recorded without bypassing failures.
