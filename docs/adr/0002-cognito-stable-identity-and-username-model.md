# ADR 0002: Use Cognito Stable Identity and Immutable Usernames

- Status: Proposed
- Date: 2026-08-05

## Context

Children need accounts without email addresses, parents need a recovery path, and mutable family-facing names must not destabilize ownership. The existing unused shared Cognito pool is email-oriented and incompatible with this identity model.

## Decision

Use the replacement case-insensitive Cognito username/password pool. Usernames are globally unique within the Todone pool and immutable. Email and phone remain optional pool attributes; delivered parent flows may require a verified email for recovery while child accounts require neither.

Use the Cognito `sub` claim as the stable authenticated identity and Membership identity key. Never use username, email, display name, or profile color as an ownership key. Store mutable, non-unique display name and profile color in application profile data.

The browser app client is public and has no client secret. Passwords, setup secrets, JWT values, and recovery contact values are never stored in Todone application data or logs.

The existing pool may be replaced only after an immediate pre-apply check proves that it contains no users and has no active consumers.

## Consequences

- Children can sign in without email.
- Parent recovery can use a separately verified email without making contact data universal.
- Username renaming is not supported; display name handles family-facing changes.
- Account deletion and later username reuse create a new unrelated identity with a new `sub`.
- Replacing a populated pool would break identities and is prohibited without a separate migration decision.
- Application authorization must continue checking active Membership even while a JWT is cryptographically valid.
