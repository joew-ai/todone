## Why

The registration form labels the reusable registration gate as "Registration password." When the gate is incorrect, the current error makes it easy to mistake that value for the account password and gives no account-password policy guidance.

## What Changes

- Clearly distinguish the reusable registration gate from the new account password.
- Display the Cognito account-password requirements before submission and when the password fails validation.
- Keep gate failures generic: never disclose the configured gate value or whether a submitted value was close.

## Impact

- Modifies the first-parent registration UI, copy catalog, unit tests, and accessibility/browser coverage.
- Does not change the registration-gate authorization contract or Cognito password policy.
