## Context

Todos already support parent editing and role-scoped views. Labels introduce household-local organization without changing lifecycle or assignment semantics.

## Goals / Non-Goals

**Goals:** one optional label per Todo, local suggestion, and safe filters.

**Non-Goals:** nested labels, multiple labels, label colors, label administration pages, labels as routine state, or cross-household reuse.

## Decisions

- Store a normalized label record per household and a label ID/name snapshot on each Todo.
- Create labels only through parent Todo create/edit to avoid a separate management surface.
- Query label suggestions by normalized prefix from the caller's household.
- Apply filtering after role-scoped query authorization; a filter never broadens a child's data scope.
- Render text label names as the primary indicator; optional styling is supplementary.

## Risks / Trade-offs

- One label avoids multi-label query complexity but may be insufficient later; the model retains a label entity to allow a future expansion.
- Creating labels inline can create near-duplicates; normalization and suggestion reduce but do not fully eliminate that risk.
