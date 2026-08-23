# Next-agent handoff: visual foundation next

## Current status

`bootstrap-household-membership` and `clarify-registration-password-requirements` are complete. The human release owner previously applied the reviewed bootstrap infrastructure, deployed its reviewed artifacts, and completed the authorized production smoke. Do not repeat Terraform apply or production smoke unless explicitly asked.

`manage-family-accounts` has completed its profile/directory and route-foundation slices:

- 2.1: the Cognito pre-signup trigger has explicit public-signup versus administrative-create policy and tests.
- 3.1: Profile persistence plus self-only versioned read/update API are complete.
- 3.2: an active first parent with no Profile is required to complete display-name/color setup before family management.
- 3.3: the active/pending family directory returns deterministic, household-safe data and caller-allowed pending-parent actions.
- 3.4: `vue-router` owns canonical page-level navigation, guard redirects, document titles, and destination-heading focus. Public auth routes are secret-free; authenticated guards resolve session, Membership, and Profile before rendering. Active children with a Profile land on `/todos`, an intentionally nonfunctional work-in-progress page with no Todo API call, data, or actions; parents retain `/family` as the current useful home.
- 7.0: approved local command families are documented in `AGENTS.md` and implemented by `.codex/rules/default.rules`.

The completed family-account work is committed locally. It has not been separately deployed in this handoff; do not infer deployment or Terraform-apply authorization from the commits or artifact-hash updates.

## Start with this change

The next dependency is `openspec/changes/establish-visual-design-foundation/`.

Read its proposal, design, task list, and capability spec in full before editing. `manage-family-accounts` task 3.4 is complete, so begin visual-foundation task 1.1: inventory the existing shell, authentication, bootstrap, profile, and shared controls. The accepted direction uses authored CSS custom properties as the visual source of truth, Tailwind aliases for ergonomic utilities, `lucide-vue-next` imported icon-by-icon, a retained quick HTML reference page under `docs/ux/references/` for pre-implementation human review, and real-app UX journeys for post-implementation product-owner testing. Do not use Tailwind's stock palette as the product language or direct profile hex values as large UI fills.

`manage-family-accounts` task 3.4 is complete; tasks 3.5–3.6 remain intentionally open:

- 3.5 must produce a quick self-contained route-level family-account HTML reference under `docs/ux/references/`, obtain human review before final implementation, and retain the accepted page as a decision reference.
- 3.6 must restyle/complete family-management and self-profile UI only after those prerequisites.

Do not mark broader family-account tasks 1.1–1.6, 2.2–2.5, or 4–7 complete merely because their early supporting code exists. Their checkboxes and completion criteria remain authoritative.

## Existing behavior and boundaries to preserve

- Cognito session material is tab-scoped in `sessionStorage`; it must not move to `localStorage`, IndexedDB, URLs, app data, or service-worker caches.
- First-parent registration uses an Entry Code only through `PreSignUp_SignUp`; `PreSignUp_AdminCreateUser` is an independent, IAM-authorized future parent-provisioning path. Never assume one trigger follows the other.
- Local `cognito-local` does not execute the deployed pre-signup Lambda. Local browser registration therefore does not validate the Entry Code; see `docs/testing/strategy.md` for the documented limitation. Do not present that bypass as production behavior.
- Local Cognito confirmation/recovery codes appear in the Cognito emulator console. `npm run setup:local-cognito` is idempotent and updates an existing pool for local email-code delivery.
- The local API must stay alive under `npm run dev:full`; `local-dev/server.ts` deliberately retains a timer handle and closes cleanly on `SIGINT`/`SIGTERM` because the current `tsx` process otherwise exits after listener setup.
- Household authorization derives scope from verified membership, never client-supplied household/member identifiers. Profiles are self-only; the family directory never returns recovery email, Cognito status/details, raw `sub`, or household details.
- The canonical profile palette lives in `shared/profilePalette.ts`; browser and Lambda code import the same stable identifiers. Profile color is always paired with member name and never represents authorization or status.
- Lambda-facing user/API messages load through `lambdas/shared/messages.ts`; the Lambda build copies `src/i18n/en.yml` into each artifact. Keep internal diagnostics local and do not return/log them raw.
- `lambdas/shared/request.ts` records request ID/outcome for successful and failed completed responses. Logs and metrics must remain free of credentials, Entry Codes, emails, usernames, Cognito `sub`, tokens, household names, profile values, and raw request bodies.

## Important implementation locations

- `src/components/ProductionBootstrap.vue` renders the established auth/bootstrap/profile/family route surfaces. Its transient loading/error state is component-local, but page-level navigation is router-owned; do not reintroduce component-local page switching or extend it for later account surfaces.
- `src/router/routes.ts` owns the stable route names and paths; `src/router/index.ts` owns route records, safe guard normalization, and document titles. Keep secrets, identities, and mutation values out of route params, queries, fragments, and history state.
- `src/components/TodoPlaceholder.vue` is the deliberate pre-Todo child landing page. Do not add data access, controls, or simulated Todo behavior before the Todo vertical slice.
- `src/assets/main.css` and `tailwind.config.js` are the existing styling entry points. Inventory literal colors/control patterns before creating the visual foundation's tokens and primitives. Authored CSS custom properties own the intentional palette; Tailwind maps semantic names to those variables rather than supplying stock application colors.
- `lucide-vue-next` is the accepted outline-icon dependency. Import individual icons, use semantic inherited color, keep visible labels where useful, and do not import the complete catalog dynamically.
- `src/services/apiClient.ts` owns shared authenticated browser request construction. `profileClient.ts` and `familyClient.ts` build on it.
- `lambdas/households/constants.ts`, `keys.ts`, `model.ts`, `repository.ts`, and `runtime.ts` own durable family-account vocabulary, storage, and production repository construction. Handlers receive repository overrides for tests/local development.
- `docs/architecture/api-conventions.md`, `docs/security/authorization-matrix.md`, `docs/ux/interaction-states.md`, and `docs/ux/responsive-accessibility.md` are the cross-cutting contracts to preserve.

## Verification and release

At this handoff, `npm run verify-local`, `npm run test:e2e` (50 tests), and `npm run test:a11y` (20 tests) pass. Route coverage proves signed-out protected-route normalization, child `/todos` landing without Todo traffic, direct verification without identity in the URL, profile navigation with Back, registration Back/Forward without restored secret fields, titles, and destination focus. The bootstrap browser fixture continues to cover the profile-setup transition and mocks the profile/directory APIs at the HTTP boundary.

Use `npm run verify-local` for non-browser verification, then run the relevant Playwright and accessibility suites for changed UI. Before asking the project owner to test manually, start the same local stack, perform an automated browser smoke where possible, and provide concise UX journeys naming setup, route/actions, and expected results for direct testing in the real app. Update OpenSpec task status and this handoff at the end of every bounded slice.

Never deploy, apply Terraform, alter production infrastructure, or run a production smoke without explicit user authorization.
