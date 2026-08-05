## Context

Todos already support parent editing and role-scoped views. Labels introduce household-local organization without changing lifecycle or assignment semantics.

## Goals / Non-Goals

**Goals:** one optional label per Todo, local suggestion, explicit duplicate handling, and safe filters.

**Non-Goals:** nested labels, multiple labels, multiple simultaneous label filters, label colors, label administration pages, label rename/deletion, labels as routine state, or cross-household reuse.

## Decisions

- Store a label record per household with a trimmed display name preserving entered case and a case-folded comparison key. Store only label ID on each Todo; do not snapshot label names.
- Create labels only through parent Todo create/edit to avoid a separate management surface.
- Reject creation when the case-folded key already exists, with an informative error and an explicit path to select the existing label instead of silently reusing it.
- Query label suggestions by case-insensitive normalized prefix from the caller's household.
- Permit label mutation on active and completed Todos because labels are organizational metadata; reject every mutation on archived Todos.
- Return all household labels as child filter options, compute labels used on that child's Todos so the client can feature them, and apply the selected single filter only after role-scoped Todo authorization.
- Render text label names as the primary indicator; optional styling is supplementary.

## Risks / Trade-offs

- One label avoids multi-label query complexity but may be insufficient later; the model retains a label entity to allow a future expansion.
- Case-insensitive comparison prevents capitalization-only duplicates while preserving parent-entered display case.
