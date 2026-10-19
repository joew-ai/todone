## Why

The registration form labels the reusable registration gate as "Registration password." When the gate is incorrect, the current error makes it easy to mistake that value for the account password and gives no account-password policy guidance.

## What Changes

- Rename the reusable registration gate to "Entry Code" so it is clearly distinct from an account password.
- Display the Cognito account-password requirements before submission and when the password fails validation on first-parent registration and Forgot Password. The same shared policy copy and validation contract will be reused by later additional-parent and child-password flows.
- Keep gate failures generic: never disclose the configured gate value or whether a submitted value was close.

## Impact

- Modifies the first-parent registration UI, copy catalog, unit tests, and accessibility/browser coverage.
- Does not change the registration-gate authorization contract or Cognito password policy.
