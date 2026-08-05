# ADR 0006: Use Household-Local Date Semantics

- Status: Proposed
- Date: 2026-08-05

## Context

Todos and recurring routines are understood as family calendar obligations, not moments selected independently by each device. Browser timezones may differ or be unavailable, and fixed 24-hour arithmetic fails at daylight-saving transitions.

## Decision

Store one valid IANA timezone on each Household. The first parent confirms it during household bootstrap. Treat Todo due dates and recurrence round keys as date-only values interpreted in that Household timezone.

Transport date-only values as `YYYY-MM-DD`, never as client timestamps. Store event instants such as creation and completion as server-generated UTC RFC 3339 values. Derive overdue only after the household-local due date has ended; overdue is not a stored lifecycle state.

Daily recurrence uses the local calendar date as round key. Weekly recurrence runs Sunday through Saturday and uses the local Sunday date as key. Monthly recurrence uses local `YYYY-MM`; an unavailable selected day is clamped independently to that month's last day. Date calculations use timezone-aware calendar arithmetic, not fixed-duration offsets.

## Consequences

- Every member sees consistent due and recurrence behavior even when devices use different timezones.
- Household timezone is required domain data and must be validated against supported IANA zones.
- Tests must cover day boundaries, daylight-saving transitions, leap years, month lengths, and monthly clamp reset.
- A future household-timezone change requires an explicit product decision for existing date-only values and generated rounds; implementations must not silently reinterpret historical data.
- Server-side scheduled generation and reconciliation use household time, independent of user login.
