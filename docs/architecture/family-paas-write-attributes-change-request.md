# Change request: Explicit Cognito browser-client write attributes

## Requested outcome

Extend the `family-paas` Cognito app-client module so Todone can set an explicit empty Cognito
`WriteAttributes` list on its existing public PWA app client. The resulting client MUST allow no
authenticated browser-side attribute writes, especially no direct `email` replacement.

This is the remaining platform dependency for `manage-family-accounts` OpenSpec task 2.5. It
closes a bypass of Todone's planned parent-authorized recovery-email API: without an explicit list,
Cognito defaults the client to write access for standard mutable attributes, including `email`.

## Research basis

AWS documents `WriteAttributes` as the list of attributes an app client may write **after the user
authenticates**, using that user's access token with `UpdateUserAttributes`. It is not an IAM
permission and it is separate from the administrative Lambda operations. When the list is omitted,
Cognito grants default write access to the pool's standard attributes.

Initial first-parent registration is a separate `SignUp` flow that sends `email` as a signup
attribute before the user has an access token. The platform change MUST preserve this existing
flow; do not introduce a second client unless regression evidence shows Cognito rejects this signup
attribute with an explicit empty write list. `VerifyUserAttribute` is also a separate access-token
operation for confirming an email-verification code, and it needs regression coverage.

Authoritative references:

- [Cognito `UserPoolClientType.WriteAttributes`](https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_UserPoolClientType.html)
- [Cognito `UpdateUserAttributes`](https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_UpdateUserAttributes.html)
- [Cognito `VerifyUserAttribute`](https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_VerifyUserAttribute.html)

## Required module contract

1. Add an optional `write_attributes` input to the Cognito app-client module. It MUST preserve
   existing callers when omitted—for example, a nullable `list(string)` with a `null` default that
   omits the Terraform argument.
2. When supplied, pass the value unchanged to the underlying
   `aws_cognito_user_pool_client.write_attributes` argument. An explicit empty list is meaningful
   and MUST NOT be normalized to `null` or omitted.
3. Update Todone's module call to pass `write_attributes = []`.
4. Keep the existing public client: no client secret, no new app client, no user-pool replacement,
   and no change to the existing client-ID output or token/session configuration.
5. Do not add SES, custom sender, custom-message Lambda, new IAM permissions, or a paid service.

## Required verification evidence

- Module format, lint, and Terraform validation pass.
- A reviewed plan updates the existing Todone app client in place. It MUST show no Cognito user-pool
  replacement, no app-client replacement, no added client secret, and no unrelated IAM or cost
  change.
- Module-level tests prove both omission compatibility and that an explicit empty list renders
  `write_attributes = []` rather than the default unrestricted behavior.
- Before an authorized production apply, an operator verifies the existing first-parent browser
  `SignUp` flow still accepts `email`, email confirmation still works, normal SRP sign-in/session
  refresh still work, and direct authenticated `UpdateUserAttributes(email)` from the PWA client is
  rejected. The later recovery-email UI will separately prove `VerifyUserAttribute` after the
  server-authorized update.

## Rollback

The expected Terraform action is an in-place app-client configuration update. If registration or
verification regresses, restore the prior app-client `write_attributes` configuration through the
same reviewed Terraform process. Do not replace the user pool or create a replacement client as a
rollback shortcut.

## Explicit scope boundary

Todone owns the user-pool invitation template and staged email-verification configuration in its
root Terraform. This request is only for the separately owned app-client module capability needed
to restrict browser-side attribute writes.
