## 1. Session and Bootstrap UI

- [ ] 1.1 Implement registration, sign-in, session restoration, and sign-out surfaces with loading, error, retry, and accessible validation states; completion: keyboard and screen-reader journeys work at compact and wide breakpoints.
- [ ] 1.2 Implement the membership gate and household-creation form with browser timezone prefill and confirmation; completion: an authenticated non-member cannot reach protected application content.

## 2. Household API and Persistence

- [ ] 2.1 Add Household, Membership, and user lookup persistence models with idempotent bootstrap behavior; completion: retrying a failed client request does not create duplicate households.
- [ ] 2.2 Add authenticated household bootstrap and current-membership API contracts; completion: valid first users become parent members and invalid timezone/name input is rejected.
- [ ] 2.3 Add shared membership authorization middleware; completion: all scoped routes reject missing membership and cross-household IDs.

## 3. Verification

- [ ] 3.1 Add unit and integration coverage for bootstrap validation, retries, session states, and cross-household denial; completion: tests demonstrate no client-supplied household ID can authorize access.
- [ ] 3.2 Add Playwright coverage for register-to-household and returning-session flows plus accessibility checks; completion: critical flows pass in configured browsers.
- [ ] 3.3 Run format, lint, typecheck, unit tests, integration tests, build, Playwright, and accessibility checks; completion: all required checks pass.
