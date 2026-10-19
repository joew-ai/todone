# Next-agent handoff: parent invitations and activation

## Scope and state

The child credential slice is complete: `manage-family-accounts` tasks 4.1–4.4 implement child creation, permanent password reset, global sign-out, lookup-owned credential cutoff, parent UI, and authorization/privacy tests. The next requested slice is section 5: additional-parent provisioning, setup-code activation, pending actions, and private recovery email. Child removal/cascade remains section 6; it is not implemented. Full-change acceptance tasks 7.1–7.4 remain unchecked because they also cover those unfinished features and final human release review.

The owner committed child creation as `2e83c02` (`create children`). The working tree contains the subsequent reset implementation and verification changes; preserve them. This handoff does not imply a commit or production release. Infrastructure tasks 2.4–2.5 were previously applied and tested by the owner. No deployment, artifact publication, Terraform apply, or production smoke occurred during the child-reset slice.

## Child credential behavior

- Parents create children at `/family/children/new`. The compact create action stays beside the family heading. Passwords are immediate request/control values and never become replay-record input.
- An active child row links to `/family/children/:memberId/password`. This route is parent-only, resolves the opaque member ID through the authorized household directory, identifies the child, shares password-policy guidance, and clears passwords on submission, target/path changes, cancel, Back/Forward, reload, and session loss. Inaccessible targets return safely to `/family`.
- `PUT /api/v1/family-members/{memberId}/password` accepts exactly `password`, has no idempotency key, and never automatically retries. It authenticates the caller, requires an active parent, and strongly reads a target scoped to that parent's household. Parent/pending/inactive targets receive `403`; cross-household and absent targets receive the same `404`.
- Production performs permanent Cognito password replacement, `AdminUserGlobalSignOut`, then monotonic `credentialsValidAfter` advancement. It returns empty, `no-store` `204` only after all complete. The cutoff exists only on `USER#<sub>/MEMBERSHIP`; conditional writes cannot create a missing lookup or lower its cutoff. A concurrent equal/newer cutoff is confirmed by a strong read.
- Every ordinary household request rejects a missing or older/equal token `iat` after a cutoff. Cognito JWT timestamps have second precision: a token issued in the reset's own second is deliberately stale; sign in in a later second.
- The approved failure policy remains manual operator handling. A failed password/sign-out/cutoff sequence can be partially applied, and an error is not evidence that old JWTs were revoked or the old password remains valid. The UI clears the password and blocks ordinary retry after an unconfirmed server failure. Operators must confirm sign-out and lookup cutoff before claiming revocation. Do not add an automatic repair state machine or parent-facing repair UI.

## Local development and testing

Use `docs/testing/strategy.md`: start `npm run dev:cognito`, initialize with `npm run setup:local-cognito`, stop that standalone emulator, then start `npm run dev:full`. The frontend is port 3001, the in-memory API is port 3002, and Cognito is port 9229. Restart the stack after setup changes ignored `.env.local`.

Local Cognito administration requires explicit `TODONE_LOCAL_DEVELOPMENT=true` plus a loopback `COGNITO_LOCAL_ENDPOINT`; the pool ID remains required. Every local household handler injects the same in-memory repository. Do not direct local routes to production DynamoDB or bypass authentication/target checks.

`cognito-local` does not implement `AdminUserGlobalSignOut`. The simulator therefore returns `503 PASSWORD_RESET_UNAVAILABLE` after authorization and before any credential mutation, with an explicit “No password was changed” message. Never suppress that failure and report success. Deterministic Cognito-boundary and repository tests prove the complete reset sequence; an AWS release smoke owns successful managed-service behavior.

`npm run test:e2e:local-auth` uses `playwright.local.config.ts` against the already-running port-3001 stack. It performs real local authentication, household/profile setup when needed, child creation, the unsupported-reset check, and sign-in with the original child password. It creates disposable local Cognito identities. Household data is in memory and disappears when the API restarts; emulator identities persist in ignored `.cognito/db/`. Traces, screenshots, and videos are disabled for this real-auth suite. The ordinary e2e/a11y suites instead use HTTP mocks and port 3000.

## Verification evidence (2026-10-19)

- `npm run verify-local`: formatting, lint, typecheck, 233 unit tests, 28 integration tests, production build, eight Lambda builds, and all 11 strict OpenSpec validations passed.
- `npm run test:e2e -- --workers=2 --reporter=line`: 75 passed across Chromium compact/medium/wide, Firefox, and WebKit.
- `npm run test:a11y -- --workers=2 --reporter=line`: 35 passed, including reset validation focus, 320-pixel reflow, enlarged text, and reduced motion. Reset screenshots at compact, medium, and wide were visually reviewed. Untracked screenshots live under `test-results/e2e-bootstrap-child-passwo-*/child-password-reset.png` until the next browser run.
- The documented startup/setup commands and `npm run test:e2e:local-auth` passed against the real emulator. Processes started for verification are stopped at handoff.
- Terraform format/validate passed. Independent read-only review found no remaining material issues within the approved manual-repair contract. Secret-canary assertions cover failure responses, request logging, and metrics; built-browser artifacts were checked separately.

The verification log is `/private/tmp/todone-child-credentials-verification.log`. Temporary files are local evidence, not durable release records.

## Infrastructure and release boundary

`terraform/main.tf` adds the dedicated `reset_child_password_lambda` and protected PUT route. Creation/reset Lambdas use `family_account_admin_role_arn`; ordinary read/profile/session Lambdas retain the role without Cognito authority. No IAM expansion or pool schema change is needed. The build registry, Terraform required artifact map, and function/log outputs include `reset-child-password`. Artifact keys and hashes in `terraform/todone.auto.tfvars.json` match the verified local build; nothing was uploaded.

The read-only plan `/private/tmp/todone-child-credentials.tfplan` used `-refresh=false` and a non-secret placeholder registration-gate hash. It contains 12 additions, 14 updates, zero deletions, and zero replacements: the still-unreleased creation resources and reset resources, existing Lambda artifact/alias updates, and two existing app-client updates. Terraform reports those client updates despite identical before/after JSON attributes; treat them as requiring fresh release-plan review, not as approved configuration changes. The pre-signup environment also uses the placeholder hash. **Do not apply this plan.** A human release owner must publish reviewed artifacts and generate a fresh full plan with the real secret input. The log is `/private/tmp/todone-child-credentials-plan.log`.

The first-parent mailbox/confirmation/resend and server-staged recovery-email AWS checks remain human release evidence. Keep the existing PWA client identity and the email-only registration client distinct. All family-paas references remain pinned to `beb37ef0e19d896984cb3c16165b2307e38fdf31`; do not float to main. Cognito uses its built-in sender and static invitation template, with the accepted 50-message daily quota. Do not introduce SES/custom senders or custom-auth triggers.

## Start the next slice

Read `AGENTS.md`, this handoff, and the active proposal/design/spec/tasks before editing. Shared API/data contracts are in `docs/architecture/`; authorization and threat boundaries in `docs/security/`; route/state/reference behavior in `docs/ux/`; verification commands in `docs/testing/strategy.md`.

Key files are `lambdas/cognito/administration.ts`, `lambdas/households/{model,repository,authorization,children,resetChildPassword}.ts`, `src/services/{authClient,familyClient}.ts`, `src/router/`, `src/components/ProductionBootstrap.vue`, and `src/i18n/en.yml`. Credential-focused tests are `src/test/lambdas/{childCredentials,credentialRepository,children}.test.ts`, `src/test/integration/childCredentials.test.ts`, and the browser/component/client tests.

Start with task 5.1 as a complete pending-parent provisioning slice. Preserve these boundaries:

- Caller identity comes only from verified `sub`; household scope comes from active Membership. Authorize caller and target before any Cognito administration. Test fixtures must pass the same authorization code.
- Usernames/roles are immutable. Profiles are self-only. Recovery email stays in Cognito and is absent from directory/peer responses and logs.
- Pending parents lack household authority. Only the authenticated pending self may activate after `NEW_PASSWORD_REQUIRED`; mark only the already-configured email verified after setup-code possession, then activate both Membership copies atomically.
- The authenticated PWA client remains restricted to the immutable browser-write guard; registration uses the separate email-write client only for registration/confirmation. Do not revive the superseded empty-allowlist proposal.
- Passwords, setup/verification codes, emails, usernames, tokens, and mutation payloads never enter URLs/history, logs, metrics, caches, or application persistence. Use the shared English catalog for user-visible copy.
- Parent peers cannot reset/remove/demote one another. Preserve dedicated privileged runtimes, generic failures, and operator-owned partial-outcome handling.
