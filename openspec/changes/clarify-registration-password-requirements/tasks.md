## 1. Registration clarity

- [ ] 1.1 Rename the registration-gate field and error copy so it is clearly separate from the new account password; completion: a gate failure directs the user to check the registration access password without exposing gate details.
- [ ] 1.2 State the configured Cognito account-password requirements before submission and return accessible, actionable password-policy guidance after validation failure; completion: users can determine the required minimum length and character categories without trial-and-error.

## 2. Verification

- [ ] 2.1 Add or update unit, component, browser, and accessibility coverage for gate and account-password errors; completion: both errors are distinguishable, announced accessibly, and neither leaks sensitive values.
