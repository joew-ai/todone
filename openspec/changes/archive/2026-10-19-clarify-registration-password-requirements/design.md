## Context

First-parent registration currently presents the reusable deployment gate as a registration password beside the permanent Cognito account password. Cognito enforces one password policy for registration, recovery, child passwords, and additional-parent activation, but the UI does not explain it consistently.

## Decisions

- Present the reusable deployment gate as **Entry Code**. It remains temporary Cognito validation data and is never persisted, logged, echoed, compared in user-visible text, or described as an account credential.
- Define account-password requirements once in the frontend copy/validation boundary: at least 8 characters with uppercase, lowercase, number, and symbol. Use the same definition for first-parent registration and Forgot Password in this change and reuse it for later family-account password forms.
- Client validation provides immediate guidance, while Cognito remains authoritative and rejected-password errors map back to the password field with the same actionable policy text.
- Replace hardcoded labels and authentication errors touched by the change with typed `src/i18n/en.yml` entries.
- This change does not alter the Cognito password policy, registration-gate hash/validation contract, authentication flow, or infrastructure.

## Visual and UX Direction

- Use the shared `visual-design-foundation` form anatomy so Entry Code and account password are distinguishable by label, help placement, and grouping—not by color alone.
- Present the password policy as compact persistent guidance adjacent to the account-password field. It should be easy to scan without turning registration or recovery into a security-settings dashboard.
- Give errors stable inline space and one clear correction focus. Do not add animated strength meters, playful password scoring, or policy effects that interrupt entry.
- When the visual foundation is applied to delivered authentication screens, preserve the existing typed copy, accessible associations, and security-safe generic failure behavior.

## Verification

Test registration and recovery before submission and after password-policy rejection. Verify that Entry Code and account-password failures are visually and semantically distinct, correction focus is useful, and submitted values never appear in rendered errors, logs, URLs, storage assertions, or test diagnostics.
