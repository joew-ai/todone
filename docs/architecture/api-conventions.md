# API Conventions

## Scope and base path

The public application API is JSON over HTTPS under `/api/v1`. Breaking contract changes require a new versioned base path or a coordinated migration. Browser code uses one typed API client configured with an explicit API origin; feature code does not construct arbitrary production URLs.

The foundation protected probe is:

```http
GET /api/v1/session
Authorization: Bearer <Cognito-ID-token>
```

A successful response has exactly these application fields:

```json
{
  "sub": "stable-cognito-sub",
  "username": "immutable-username",
  "expiresAt": "2026-08-05T18:30:00Z"
}
```

No household or profile data is returned by the foundation probe.

## Household bootstrap contracts

First-parent identity creation uses Cognito's public client directly rather than an application credential endpoint:

- `SignUp` receives `username`, `password`, `email`, and the registration gate password as temporary validation data for the pre-signup trigger. The gate password is not a Cognito user attribute and is never copied into application data or logs.
- `ConfirmSignUp` receives `username` and Cognito's email confirmation code. A successful confirmation activates the account and marks its email verified.
- `ResendConfirmationCode` supports an unconfirmed account whose original code expired or was lost.
- `ForgotPassword` receives `username`; `ConfirmForgotPassword` receives `username`, Cognito's recovery code, and the new password. User-facing initiation responses remain generic and do not disclose whether an account exists.

After Cognito authentication, the application resolves bootstrap state through:

```http
GET /api/v1/memberships/current
Authorization: Bearer <Cognito-ID-token>
```

An authenticated account without Membership receives exactly:

```json
{
  "membership": null
}
```

An active member receives exactly:

```json
{
  "membership": {
    "memberId": "opaque-member-id",
    "username": "river-parent",
    "role": "parent",
    "household": {
      "householdId": "opaque-household-id",
      "name": "Wegner Family",
      "timezone": "America/Chicago"
    }
  }
}
```

An unattached account creates its one household through:

```http
POST /api/v1/households
Authorization: Bearer <Cognito-ID-token>
Idempotency-Key: <opaque-client-generated-key>
Content-Type: application/json

{
  "name": "Wegner Family",
  "timezone": "America/Chicago"
}
```

The name is trimmed, must contain 1–80 Unicode characters, and must not contain control characters. The timezone must be an IANA name recognized by the server runtime. Unknown properties are rejected. Success returns `201 Created` with the same non-null `membership` representation as `GET /api/v1/memberships/current`. Reusing the same idempotency key with the same normalized input returns the original successful representation; reusing it with different input returns `409 Conflict`. An existing member's create attempt returns `409 Conflict`, invalid fields return `422 Unprocessable Content`, and missing or invalid authentication returns `401 Unauthorized`.

Neither bootstrap request accepts a household ID, member ID, role, username, email, or Cognito `sub` from the client. Household and membership identifiers are generated server-side, the caller comes from verified authorizer claims, and the initial role is always `parent`.

## Profile and family-directory contracts

An active member reads and version-writes only their own profile through `GET` and `PUT /api/v1/profiles/me`. The write body accepts exactly `displayName`, canonical `color`, and `version`; it never accepts a household ID, member ID, role, username, or Cognito `sub`. A missing profile reads as `{"profile": null}` so first-parent setup can create version `0`; a successful create returns `201 Created` and subsequent writes return `200 OK`. A stale or skipped version returns `409 Conflict` without overwriting the saved profile.

Any active household member may read the safe family directory through:

```http
GET /api/v1/family-members
Authorization: Bearer <Cognito-ID-token>
```

The caller's verified `sub` resolves the household; the request accepts no target or household identifier. The response contains only `memberId`, immutable `username`, immutable `role`, activation state, current `displayName`/canonical `color`, and stable `allowedActions`. It is deterministically ordered by activation state, username, then member ID. Active members have no directory actions. An active parent sees a pending parent with exactly `RESEND_WELCOME`, `CHANGE_EMAIL_AND_RESEND`, and `CANCEL_PENDING_ACCOUNT`; a child receives active members only. Inactive records, recovery email, Cognito status/details, raw `sub`, household details, and cross-household records are never represented.

## Authentication and authorization

- Protected requests use `Authorization: Bearer <Cognito ID token>` over HTTPS. Tokens MUST NOT appear in URLs, logs, error text, analytics, or persistent application data.
- API Gateway verifies configured issuer, audience, signature, and expiry before a protected handler runs.
- Handlers use API Gateway's verified authorizer claims, including `sub`, as caller identity. They do not re-verify the raw bearer token. Username, display name, body fields, route household IDs, and query parameters never establish ownership.
- Every household route resolves active Membership and applies the server-side authorization matrix in `docs/security/authorization-matrix.md`.
- A token may be valid while Membership is absent or inactive. Such a request is denied.
- CORS permits only explicitly configured local origins and the production PWA origin. CORS is not treated as authentication.

## Representation conventions

- Requests and responses use UTF-8 JSON with `Content-Type: application/json` unless a response has no body.
- Property names use `camelCase`. Enum wire values use stable uppercase names such as `ACTIVE` and `COMPLETE`.
- IDs are opaque strings. Clients MUST NOT infer type, ownership, ordering, or authorization from an ID.
- Calendar dates use `YYYY-MM-DD` and are interpreted in the Household IANA timezone.
- Monthly recurrence keys use `YYYY-MM`; weekly and daily keys use `YYYY-MM-DD` as defined in the date ADR.
- Instants use UTC RFC 3339 with `Z`, such as `2026-08-05T18:30:00Z`.
- Optional values are omitted or explicitly `null` only when the endpoint schema defines that choice. Empty strings do not stand in for missing values.
- Unknown request fields are rejected for mutation requests so misspelled or obsolete security-relevant fields do not pass silently.

## Resource and method conventions

- Paths use plural nouns for resources and no action verbs when an HTTP method expresses the operation.
- `GET` is read-only and safe to retry.
- `POST` creates a resource or represents a named transition that is not a simple replacement.
- `PATCH` updates only explicitly mutable fields and carries the current record version.
- `DELETE` is used only for specified deletion behavior and may require an explicit confirmation field or one-time confirmation token.
- List endpoints use bounded page sizes and opaque continuation tokens. A continuation token is validated against the caller, household, route, and filters before use.
- Sorting is deterministic and includes an opaque ID tie breaker.

Non-idempotent creates that may be retried require an `Idempotency-Key` header. The server binds a key to the authenticated caller, route, and normalized request and rejects reuse with a different payload. Lifecycle writes use record versions and conditional persistence. Repeated completion or generation requests return the one current outcome rather than creating duplicates.

## Status codes

| Status | Meaning |
| --- | --- |
| `200 OK` | Successful read or mutation returning a representation. |
| `201 Created` | Resource created; response contains the created representation and may include `Location`. |
| `204 No Content` | Successful operation with intentionally no representation. |
| `400 Bad Request` | Malformed JSON, unsupported field, or request-level validation failure. |
| `401 Unauthorized` | Missing, malformed, expired, or invalid authentication. No session or resource data is returned. |
| `403 Forbidden` | Authenticated caller lacks role or state permission for a resource already safely known in their household. |
| `404 Not Found` | Resource is absent or is not visible in the caller's household. Cross-household requests use the same response as absence. |
| `409 Conflict` | Duplicate normalized value, stale version, already-changed lifecycle, idempotency mismatch, or invariant conflict. |
| `422 Unprocessable Content` | Well-formed payload has field validation errors. |
| `429 Too Many Requests` | Cognito, API, or application throttling. |
| `500 Internal Server Error` | Unexpected failure with a safe request ID and no internals. |
| `503 Service Unavailable` | Known temporary dependency unavailability where retry may succeed. |

Authentication and cross-household responses MUST NOT reveal whether a username, household, member, Todo, label, or template exists, except where the approved product flow explicitly requires a same-household conflict such as label selection.

## Error contract

All application errors use one envelope:

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Check the highlighted fields and try again.",
    "requestId": "01J...",
    "fieldErrors": [
      {
        "field": "timezone",
        "code": "INVALID_TIMEZONE",
        "message": "Select a supported IANA timezone."
      }
    ]
  }
}
```

`code` is a stable machine-readable value. `message` is safe, user-oriented text. `requestId` correlates with privacy-safe logs. `fieldErrors` is present only when useful and preserves no secret input. Stack traces, AWS identifiers, table keys, raw dependency messages, token claims, and request bodies are never returned.

## Conflict responses

A `409` caused by a stale version or already-completed operation returns the current safe resource representation when the caller remains authorized to read it. Otherwise it returns only the error envelope. The client presents refresh/retry guidance and never applies a false optimistic success.

## Caching and service workers

- Protected API responses send `Cache-Control: no-store` and are never stored by the service worker, Cache API, or shared browser caches.
- Authentication endpoints and responses also use `no-store`.
- Hashed public static assets may be immutable and cached. The application shell uses a revalidation strategy that permits a reviewed release and rollback to take effect.
- Logout clears application session material and protected in-memory state. It does not claim to revoke an already expired or separately stolen token.

## Observability

Each request accepts or receives a server-generated request ID. Responses expose that safe request ID. Structured logs contain timestamp, request ID, route template, method, status, latency, authenticated/denied outcome, and coarse error code only.

Metrics cover API error count, API latency, and authorization denials. Product usage, names, Todo titles, labels, credentials, JWTs, setup secrets, emails, and raw identifiers are excluded.

## Contract verification

Integration tests MUST prove:

- Missing, malformed, wrong-issuer, wrong-audience, and expired tokens fail before data access.
- The current-session success body has exactly `sub`, `username`, and `expiresAt`.
- Cross-household identifiers behave like absent resources and do not disclose data.
- Parent/child role rules and inactive membership are enforced server-side.
- Protected responses are not cacheable.
- Validation, conflicts, throttling, and unexpected errors conform to the envelope without sensitive values.
