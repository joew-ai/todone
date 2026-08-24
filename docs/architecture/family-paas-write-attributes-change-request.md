# Superseded change request: Explicit Cognito browser-client write attributes

## Requested outcome

This request is superseded by `family-paas` commit
`73e535fe6ad66f9ca052347bfdfb4d70fd0f675c`. A disposable AWS test proved Cognito treats an
empty `WriteAttributes` list exactly like omission, retaining default standard-attribute write
access. Todone therefore uses a two-client design with an immutable sentinel on the existing PWA
client and an email-only registration client.

## Final decision

- Existing PWA client: `write_attributes = ["custom:browser_write_guard"]`; keep normal SRP,
  refresh, session, and `VerifyUserAttribute` behavior unchanged.
- New public registration client: `write_attributes = ["email"]` and only `ALLOW_CUSTOM_AUTH`;
  use it only for signup, confirmation, and resend. Todone has no custom-auth triggers, so it
  cannot issue a usable normal session.
- The immutable custom attribute is never populated. Adding its pool schema is irreversible, so a
  Terraform plan must prove an in-place pool update with no replacement.

The required AWS disposable probe was completed by the platform owner. Before any production
apply, Todone still needs the Terraform plan plus mailbox-backed first-parent confirmation/resend
and server-staged recovery-email verification evidence.
