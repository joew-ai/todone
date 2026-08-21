## Context

The foundation supplies username identity, a protected API, and an intentionally temporary sign-in probe, but no application tenant. This change removes that probe, delivers the production session and parent-recovery flow, and turns the only self-registered user into the first parent of the required household.

## Goals / Non-Goals

**Goals:** production session lifecycle, reusable setup-gated first-parent registration, parent recovery, one household per self-registered account, timezone confirmation, and server-enforced isolation.

**Non-Goals:** household invitations, joining existing households, family account administration, or Todos.

## Decisions

```mermaid
flowchart TD
    S[Valid reusable registration password] --> A[Register unattached user and verify parent email]
    A --> B{Membership exists?}
    B -->|yes| C[Household application]
    B -->|no| D[Household creation]
    D --> E[Household plus parent membership]
    E --> F[Onboarding: add members, then Todos]
```

- Remove the temporary foundation sign-in and its verification-account setup after the production registration, sign-in, recovery, restoration, and sign-out paths pass their tests.
- Gate Cognito `SignUp` with a pre-signup Lambda trigger. The browser supplies the reusable registration gate password in the `registrationGatePassword` temporary Cognito validation field; Cognito does not persist it as a user attribute. The trigger computes its lower-case hexadecimal SHA-256 digest and compares it in constant time with `REGISTRATION_GATE_PASSWORD_HASH` from its Lambda environment without logging either value. A missing, empty, or malformed configured hash closes public registration, and a missing or incorrect submitted password rejects signup. The configured value is a low-weight invitation gate, not a primary authentication secret; Cognito username/password authentication remains the security boundary.
- Configure Cognito-assisted email confirmation for first-parent signup without auto-confirming or auto-verifying users in the pre-signup trigger. Cognito sends an email code, and successful `ConfirmSignUp` both activates the account and verifies the email. Configure self-service account recovery to use `verified_email`; `ForgotPassword` and `ConfirmForgotPassword` provide the parent recovery flow. Every adult/parent account requires this verified recovery email invariant, including parents created later by `manage-family-accounts`; email remains optional for child accounts.
- Public registration creates no Membership and never accepts an existing household as a join target. Each registered non-member may create one new household; later accounts in that household are parent-provisioned.
- Persist Household, Membership, and user-to-household lookup items in the dedicated table. Membership includes immutable `role`, initially `parent`, so later account provisioning does not require a membership migration.
- Treat Cognito `sub` as the membership identity key.
- Create the household and initial parent membership transactionally or make retries idempotent with a request key. A condition on the user-to-household lookup rejects second households for the same account while allowing other setup-authorized accounts to create separate households.
- Resolve household membership in a shared authorization layer before every household route.
- Store an IANA timezone and use date-only transport values, not client timestamps, in later features.
- After creation, display the household name and an onboarding next step to add family members. Todo creation remains unavailable until its later change.
- Persist Cognito session material only in browser `sessionStorage`, sufficient to restore the current tab after reload. Do not use `localStorage`, IndexedDB, service-worker caches, URLs, or application data for tokens. Sign-out and session failure clear session storage and private rendered state.
- Follow the foundation's canonical data-model, API, authorization, responsive-accessibility, interaction-state, and testing documents.

## Risks / Trade-offs

- The deployment gate password is a reusable bootstrap control, not a household invitation or high-security access-control system. Anyone who knows it can create a separate household. Changing its configured hash rotates it; removing the hash closes registration.
- A failed Cognito sign-up cannot be rolled back from the application; the membership gate prevents it from accessing product content.
- Cognito usernames are globally unique and immutable. Non-unique mutable display names are stored later in application profiles.
