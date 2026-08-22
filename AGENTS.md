# Application Development Instructions

## Product source of truth

- Product requirements: `docs/product/`
- User flows: `docs/ux/`
- Architecture: `docs/architecture/`
- ADRs: `docs/adr/`
- Security: `docs/security/`
- Test strategy: `docs/testing/`

## Engineering principles

- Prefer boring, reversible architecture.
- Implement vertical slices.
- Do not introduce dependencies without justification.
- Do not weaken tests to make implementation pass.
- Do not change approved requirements silently.
- Never commit secrets or production data.

## Review feedback conventions

- When the project owner leaves comments on a changeset, look for recurring feedback themes rather than treating each comment in isolation. Confirm any inferred trend with the project owner before acting on it, then add the confirmed convention as a stylistic guideline in this `AGENTS.md` file.

## Code conventions

- Name stable cross-boundary values (API paths, header names, error codes, record kinds, field limits, and storage key formats) with constants or factories. Keep truly local literals local.
- Keep user-visible frontend copy in src/i18n/en.yml; API messages must be generic domain messages, not instructions tied to a particular UI.
- Prefer explicit control flow over conditional return expressions when the condition carries authorization or state meaning.
- Keep user-visible strings and stable external error identifiers in centralized catalogs or named constants.
- When a constant serves one small code region, define it as near to that region as practical without recreating it repeatedly.
- Reuse shared request, response, repository, and validation utilities when they preserve an established contract. Record request IDs and outcomes for successful as well as failed API requests.
- Prefer descriptive helper names over terse persistence or serialization abbreviations.
- Treat sign-out as a fail-safe local privacy boundary: clear local credentials and private UI state even if an SDK cleanup call throws. Add server sign-out only when a server-side sign-out contract exists.

## Required workflow

1. Read the relevant specification and ADRs.
2. Identify ambiguities before editing.
3. Produce a file-level plan.
4. Add or update tests.
5. Implement the smallest complete slice.
6. Run the local verification command.
7. Review the diff for unrelated changes.
8. Update documentation when behavior changes.

## Required verification

- Format check
- Lint
- Static typecheck
- Unit tests
- Integration tests
- Production build
- Relevant Playwright tests
- Accessibility checks for changed UI

## UI expectations

- Keyboard accessible
- Screen-reader labels where applicable
- Responsive at documented breakpoints
- Loading, empty, error, success, and disabled states
- No layout shift for ordinary loading
- Consistent design tokens
- Visual screenshots reviewed for meaningful UI changes

## Prohibited actions

- Do not deploy.
- Do not alter production infrastructure.
- Do not remove migrations.
- Do not accept visual snapshot changes blindly.
- Do not bypass authorization checks in test helpers.

## Repository notes

- This is a Vue 3, Vite, TypeScript, Tailwind, and Playwright PWA with Lambda handlers and Terraform configuration.
- `package.json` provides the canonical local and CI commands documented in `docs/testing/strategy.md`.
- Local full-stack development uses `npm run dev:full`; initialize the development-only Cognito emulator with `npm run setup:local-cognito` as documented in the testing strategy.
- Playwright starts the local Vite application through its configured `webServer`; browser tests must not target production by default.

## Test workflow

- Run the required checks with `npm run format:check`, `npm run lint:check`, `npm run typecheck`, `npm run test:unit`, `npm run test:integration`, `npm run build`, `npm run test:e2e`, and `npm run test:a11y`.
- Run one Playwright file with `npx playwright test tests/e2e/<file>.spec.ts`; target a configured project with `--project=<project-name>` from `playwright.config.ts`.
- End-to-end and accessibility suites run against the local application in Chromium, Firefox, and WebKit at the configured compact, medium, and wide viewports. CI rejects `test.only`.
- The local Cognito end-to-end workflow is separate: start the development stack, initialize the emulator as documented, then run `npm run test:e2e:local-auth`.
- Playwright output is intentionally untracked: `test-results/`, `playwright-report/`, `blob-report/`, and Playwright caches/auth state.
