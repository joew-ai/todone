# Next-agent handoff: household bootstrap released

## Release status

`bootstrap-household-membership` is complete. The human release owner applied the reviewed Terraform, deployed the reviewed artifacts, and completed the authorized production smoke. The change's task list is fully checked. Do not repeat a Terraform apply or production smoke unless explicitly asked.

## What shipped

- Cognito-backed first-parent registration, email confirmation/resend, sign-in, Forgot Password, sign-out, and same-tab session restoration.
- Cognito session material is intentionally tab-scoped in `sessionStorage`; it must not move to `localStorage`, IndexedDB, URLs, app data, or service-worker caches without an approved requirement/security change.
- Registration creates an unattached identity only after a reusable registration gate passes a pre-signup Lambda check. The gate is not a household invitation and must never enter logs or application data.
- An authenticated user without membership must create exactly one household. DynamoDB transactional/idempotent bootstrap creates the first immutable `parent` membership; later application data must derive household scope from membership, never client-supplied household IDs.
- The deployed production page is `ProductionBootstrap.vue`; the former temporary verification sign-in surface was removed.

## Immediate follow-up

`clarify-registration-password-requirements` is complete. Before final styling or adding another substantial user-facing surface, implement `openspec/changes/establish-visual-design-foundation/`. It establishes the shared forest-at-dusk visual language, role-prioritized application shell, reference-state review, and brief server-confirmed completion feedback. It does not change the Todo active-list/history contract.

## Next dependency-ordered crawl work

`manage-family-accounts` and `centralize-authorization-capabilities` are active work. Backend/domain tasks may proceed according to their own dependency boundaries, but their remaining client surfaces use `visual-design-foundation` and must complete their feature-level reference-state review before final styling. `complete-first-family-todo` follows family accounts and is the first full validation of the shared Todo row and completion interaction. Read the selected OpenSpec proposal, design, tasks, and capability spec before editing. Do not modify historical critique reports.

## Important implementation boundaries

- `lambdas/shared/request.ts` records request ID/outcome for successful and failed completed responses. Keep logs privacy-safe: no credentials, registration gate, email, username, Cognito `sub`, tokens, household name, or raw request body.
- `lambdas/households/constants.ts` and `keys.ts` own durable record vocabulary and DynamoDB key construction. Extend them instead of recreating magic strings or key formats.
- `lambdas/households/runtime.ts` owns the production repository factory; handlers accept repository overrides for tests/local development.
- Frontend copy belongs in `src/i18n/en.yml`, loaded by `src/i18n/messages.ts`. The YAML parser is a production dependency.
- API responses must be generic domain messages, not instructions tied to a specific frontend presentation.
- Household `version` starts at 1 and is reserved for optimistic concurrency when household updates are introduced.

## Verification and release

Run the checks required by `AGENTS.md`: format, lint, typecheck, unit/integration tests, production build, relevant Playwright/a11y tests, and Terraform validation/plan if Terraform changes. Never deploy or run Terraform apply without explicit user authorization. Production smoke remains human-authorized only.

## Local development

Use `npm run dev:full`, then `npm run setup:local-cognito`; see `docs/testing/strategy.md` for the local identity workflow. The local account is development-only. Never put real credentials or gate values in repository files, test fixtures, logs, or handoff notes.
