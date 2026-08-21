# Global User Flows

## Flow rules

- The API, not the UI, decides household and role authorization.
- Every remote step has loading, success, empty where applicable, recoverable error, retry, disabled/submitting, and signed-out/session-expired behavior as defined in `interaction-states.md`.
- A return visit restores the current session when valid, resolves active Membership, and routes by membership and onboarding state.
- The application never exposes another household while resolving an invalid route or resource ID.
- The foundation temporary sign-in probe exists only until the production session/bootstrap flow is delivered; the two flows do not coexist as permanent alternatives.

## Foundation authentication proof

1. An operator creates a verification-only Cognito account through an administrator setup command; there is no self-registration in the foundation.
2. The signed-out user enters username and password in the temporary accessible form.
3. The PWA authenticates with Cognito, stores only the temporary session material allowed by the security model, and calls `GET /api/v1/session` with the ID token.
4. The page renders only `sub`, `username`, and `expiresAt` from the protected response.
5. Invalid credentials keep the user signed out. Network errors preserve the opportunity to retry without exposing credentials.
6. `bootstrap-household-membership` replaces this form, account-setup path, and obsolete tests after production registration, sign-in, recovery, restoration, and sign-out pass.

## Production session and first household

```mermaid
flowchart TD
    A[Signed out] --> B{Existing account?}
    B -->|Yes| C[Sign in]
    B -->|No| D[Enter reusable registration gate password]
    D --> E[Register unique username and verify parent email]
    E --> C
    C --> F{Session valid?}
    F -->|No| A
    F -->|Yes| G{Active Membership?}
    G -->|Yes| H[Household application]
    G -->|No| I[Create one household and confirm IANA timezone]
    I --> J[Initial immutable parent Membership]
    J --> K[Onboarding: add members, then Todos]
```

- The reusable registration gate password permits creation of an unattached first-parent account. It does not join or reveal an existing household, and Cognito credentials remain the authentication control.
- The first parent verifies a recovery email before onboarding is complete.
- An authenticated account without Membership can create exactly one new household. Creation is atomic from the user's perspective and safe to retry.
- Browser timezone is a prefill only. The parent confirms a valid IANA timezone or selects one when detection is unavailable.
- Existing members bypass bootstrap. Removed or inactive members are denied even with an otherwise valid session.
- Forgot Password is available to parent accounts with verified email. Children use parent-managed reset, not email recovery.
- Sign-out clears session and private UI state, then returns focus to the signed-out heading.

## Family account management

1. A parent opens Family Management and sees active members with display name, username, immutable role, profile color, and only permitted actions. Recovery emails are absent.
2. To add a child, the parent chooses a globally unique username, display name, color, and password. Delivery is suppressed; the child can sign in immediately after complete provisioning.
3. To add a parent, the existing parent supplies username, display name, color, and email. The new parent verifies email and chooses their own password before Membership becomes active.
4. Any member can edit only their own display name and profile color.
5. A parent may reset a child password after explicit target identification. The password is never persisted or repeated.
6. A parent cannot reset, remove, demote, or edit another parent.
7. Child removal requires confirmation describing the full deployed cascade. Success invalidates stale sessions, removes child-associated data, and releases the username only after the cascade completes. Cancellation changes nothing.
8. A partial Cognito/application-data failure returns a generic recoverable result and moves to the operator repair runbook; the product does not expose repair UI.

## First Todo loop

```mermaid
sequenceDiagram
    participant P as Parent
    participant A as Todone API
    participant C as Child
    P->>A: Create title, optional date, one assignee
    A-->>P: Confirm active Todo
    C->>A: Load own active Todos
    A-->>C: Authorized own list
    C->>A: Complete assigned Todo
    A-->>C: Confirm one completed state
    C->>C: Announce success and move usable focus
```

- Parent creation validates one active household assignee. Cancellation creates nothing; recoverable failure preserves entered non-secret values.
- A child sees only their active Todos. A parent can inspect each household member's active list.
- The assignee or any parent can complete an active Todo. The UI waits for server confirmation and handles duplicate/stale completion as one current result.
- An optional due date is date-only. Overdue begins only after that household-local date ends and remains an active presentation state.

## Todo lifecycle and history

- Parents can edit title, date, and assignee only while a Todo is active.
- The completing child can undo their own completion while the Todo remains assigned to them. Any parent can reopen a completed household Todo through the same versioned transition.
- A parent can archive active or complete work. Restore returns to the exact pre-archive state. Archived work cannot otherwise be changed.
- A parent can explicitly delete active, complete, or archived work after confirmation. It disappears from product views; a restricted audit snapshot is not exposed to product users.
- Children see only their own completed/archived history. Parents see household history. Concurrent changes present current state and refresh/retry guidance rather than silently overwriting.

## Labels

1. During Todo create/edit, a parent selects zero or one existing household label or explicitly creates a new valid label.
2. Suggestions use trimmed case-insensitive prefix matching. Selection and creation are distinct actions.
3. A capitalization-only duplicate is rejected and the existing label is offered for selection.
4. Active and completed Todos may be relabelled or cleared; archived Todos remain immutable.
5. Parent and child active/history views allow one label filter. A child's options may include all household labels, but filtering applies only to that child's already-authorized results. A sibling-only label produces an empty result, not sibling data.

## Recurring rounds

- A parent creates a template for one active household assignee. Daily generation starts at the next local day boundary. Weekly generation starts next Sunday; monthly generation starts next month.
- Server-side scheduling creates one ordinary Todo per template and household-local round key without user login. Reconciliation creates only the current round and never backfills fully elapsed gaps.
- Template edits or retirement affect future rounds only. Existing generated Todos retain their values and history.
- An incomplete rollover-bound round becomes `MISSED`; a parent Archive action makes it irreversibly `SKIPPED`; completed work remains `COMPLETED`.
- Editing a generated due date or reopening/undoing a completed generated round detaches it from rollover and returns it to ordinary active work until resolved.
- A parent may correct `MISSED` to `COMPLETED`; children cannot alter missed or skipped outcomes.
- History remains chronological and uses explicit status text. There is no trends, aggregation, chart, or missed-first surface.
- Weekly/monthly implementation remains blocked until daily recurrence is implemented, locally verified, deployed through its approved process, and accepted.

## Global interruption and recovery

- **Session expires:** Stop protected writes, clear private rendered data, preserve only safe navigation intent, and route to sign-in with an announced explanation. Never replay a secret-bearing request automatically.
- **Network fails:** Keep current confirmed data visible, identify potentially stale content, and offer retry. Do not claim a mutation succeeded.
- **Conflict occurs:** Show current authorized state, explain that another change won, and offer refresh or a new action based on that state.
- **Access is removed:** Clear household state and route to a generic unavailable/signed-out surface without naming the removed household or resource.
- **Deployment updates the PWA:** Do not interrupt an in-progress form. Offer a controlled refresh after the new shell is ready and ensure protected API data was not service-worker cached.
