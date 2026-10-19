## 1. Registration clarity

- [x] 1.1 Rename the registration-gate label to "Entry Code" and use generic Entry Code error copy; completion: the form and error clearly separate the reusable deployment gate from account passwords without exposing or comparing gate values.
- [x] 1.2 Add one shared account-password-policy copy/validation definition for at least 8 characters with uppercase, lowercase, number, and symbol; completion: first-parent registration and Forgot Password show the policy before submission and associate the same actionable guidance with a rejected password field, ready for reuse by later family-account password flows.
- [x] 1.3 Move all touched authentication labels, help, and error text to `src/i18n/en.yml` and consume it through the typed catalog; completion: the changed surfaces do not retain duplicate hardcoded user-visible copy.

## 2. Verification

- [x] 2.1 Add or update unit, component, browser, and accessibility coverage for Entry Code and account-password errors on registration and recovery; completion: errors are distinguishable, visibly associated with their fields, announced accessibly, focused for correction, and never leak sensitive values.
- [x] 2.2 Run the required format, lint, typecheck, unit, integration, production-build, relevant Playwright, and accessibility checks; completion: all required local checks pass without deployment or production smoke.
