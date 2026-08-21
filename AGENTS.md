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

## Code conventions

- Name stable cross-boundary values (API paths, header names, error codes, record kinds, field limits, and storage key formats) with constants or factories. Keep truly local literals local.
- Keep user-visible frontend copy in src/i18n/en.yml; API messages must be generic domain messages, not instructions tied to a particular UI.
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

## Test workflow

- This is a CommonJS Node project with Playwright tests; `package.json` defines no npm scripts. Run the suite with `npx playwright test`.
- Run one file with `npx playwright test tests/example.spec.ts`; target one browser with `npx playwright test --project=chromium`.
- Tests run from `tests/` in Chromium, Firefox, and WebKit. CI uses one worker, retries twice, and rejects `test.only`; local runs are parallel with no retries.
- The current tests navigate to `https://playwright.dev/`. There is no local application, configured `baseURL`, or `webServer`; add those before writing tests that require a local app.
- Playwright output is intentionally untracked: `test-results/`, `playwright-report/`, `blob-report/`, and Playwright caches/auth state.
