# Responsive Accessibility

## Standard

Todone targets WCAG 2.2 Level AA for all delivered application surfaces. Accessibility is a release requirement, not a later enhancement. Automated checks reduce risk but do not replace keyboard, screen-reader, zoom, contrast, motion, and responsive review.

## Responsive ranges

CSS uses content-driven layouts within these canonical ranges:

| Range | CSS width | Default layout intent | Representative verification viewport |
| --- | --- | --- | --- |
| Compact | Below 768px | One primary column, compact navigation, full-width forms and dialogs where useful. | iPhone, 390 x 844 CSS pixels. |
| Medium | 768px through 1023px | Tablet spacing, room for secondary controls without requiring a desktop sidebar. | iPad, 820 x 1180 CSS pixels. |
| Wide | 1024px and above | Bounded readable content, persistent navigation where useful, and multi-column layout only when reading and focus order remain clear. | Laptop, 1440 x 900 CSS pixels. |

Tests also cover narrow reflow at 320 CSS pixels and every changed page at 200 percent browser zoom. No ordinary task requires horizontal scrolling at 320 CSS pixels, except a component whose meaning requires two-dimensional layout and that has an accessible alternative. Layout must tolerate dynamic browser chrome, safe-area insets, orientation changes, text enlargement, long usernames/display names, and validation messages without clipping.

Breakpoints are layout tools, not device detection. Features and authorization do not differ by viewport.

## Page structure and navigation

- Each route has one descriptive `h1`, a logical heading hierarchy, and semantic landmarks.
- A skip link moves focus to main content and is visible when focused.
- Route changes set a meaningful document title and move focus to the new page heading or an intentional error summary. They do not reset focus unpredictably during background refreshes.
- DOM order is the reading and keyboard order. CSS visual reordering MUST NOT create a different semantic sequence.
- Current navigation is indicated in text/semantics, not color alone.
- Browser back/forward behavior is preserved. Modal state that blocks navigation is used only for a real confirmation or focused task.

## Keyboard and focus

- Every action is available with keyboard alone. Custom controls follow the corresponding WAI-ARIA Authoring Practices pattern; native HTML controls are preferred.
- Focus indicators have at least a 2 CSS-pixel visible outline or equivalent and meet WCAG focus contrast against adjacent colors. Do not remove the browser outline without a stronger replacement.
- Focus order follows visual reading order. Opening a dialog moves focus into it, `Escape` cancels when cancellation is allowed, and closing returns focus to the invoking control or the next logical item if that control was removed.
- List updates preserve useful focus. Completing a Todo moves focus to the next Todo, the list heading, or a status message rather than the document body.
- Disabled controls use native `disabled` where possible. A disabled action remains understandable from adjacent visible text; hover-only tooltips are not the only explanation.
- Pointer targets are at least 44 by 44 CSS pixels where layout permits and never below the WCAG 2.2 minimum target requirement without an accepted exception.
- Drag, swipe, hover, long press, and gestures are never the only way to perform an action.

## Forms and validation

- Every field has a persistent visible label programmatically associated with its control. Placeholder text is not a label.
- Required status and input purpose are available in text and semantics. Password controls support password managers and appropriate `autocomplete` values.
- Validation occurs on submit and may occur after meaningful field interaction; it does not interrupt entry on every keystroke.
- Invalid fields set `aria-invalid` and reference specific guidance. A submit failure presents an error summary, moves focus to it, and links to affected fields.
- Secret values are never repeated in error text, live regions, URLs, or logs. Invalid credentials use a generic message.
- A recoverable submission failure preserves non-secret input. Password and setup-secret preservation is limited to the current in-memory form and is cleared on navigation, success, sign-out, or explicit cancellation.
- Destructive actions state consequences and require explicit confirmation. Initial focus is on the least destructive useful control unless the accepted pattern requires otherwise.

## Status and announcements

- Initial loading uses a stable reserved region to avoid ordinary layout shift. Loading text or a labelled progress indicator communicates that work is in progress.
- Polite live regions announce non-urgent save, completion, retry, and already-changed outcomes. Assertive announcements are reserved for errors that block the current task.
- A visual toast is not the sole record of a result. Important errors remain near the affected content until dismissed or resolved.
- Busy containers use `aria-busy` only while their content is genuinely being replaced. Repeated progress updates are throttled to avoid noisy announcements.
- Empty states distinguish no data from a filter with no matches and from a loading or permission failure.

## Visual content

- Normal text meets 4.5:1 contrast. Large text and essential graphical objects meet their applicable WCAG AA thresholds. Focus indicators and control boundaries remain visible in all states.
- Profile color is always paired with visible member name and an accessible name. Color never communicates identity, due status, recurrence outcome, role, selection, success, or error by itself.
- Overdue and missed states use explicit text or accessible labels plus a restrained warning color.
- Text remains readable at 200 percent zoom and with browser text enlargement. Fixed heights do not clip wrapped text.
- Icons that perform actions have accessible names. Decorative icons are hidden from assistive technology.
- The nature-inspired palette must be validated in actual state combinations; aesthetic direction does not override contrast.

## Motion and feedback

Todo completion may use satisfying motion and visual feedback after the server confirms success. Motion is supplementary and does not delay access to the resulting state.

When `prefers-reduced-motion: reduce` is active, remove non-essential translation, scaling, parallax, confetti, and repeated animation. Use an immediate or short opacity/state change and the same text/live-region result. No content flashes more than three times per second.

The UI does not claim a Todo is complete before server confirmation. While submitting, duplicate activation is prevented and the Todo remains understandable. Failure returns it to an actionable state with preserved context and retry.

## Component-specific requirements

- **Authentication:** Username and password labels, announced invalid-credential/network states, keyboard submit, and no credential disclosure. The foundation probe is temporary and must be removed when production session flows ship.
- **Member identity:** Show display name plus color; show username and role only on surfaces that require them. Recovery email is private to its owning parent.
- **Todo controls:** Accessible names include title and relevant due, assignee, completion, or recurrence status without producing excessively repetitive list speech.
- **Comboboxes and suggestions:** Label and timezone controls implement keyboard selection, active descendant or native semantics, no-match text, explicit create versus select wording, and escape/cancel behavior.
- **History:** Status, actor, and timestamp have visible text. Chronological order is also DOM order.
- **Dialogs:** Use a labelled modal dialog, contain focus while open, allow explicit cancel, and do not close from an accidental background click during destructive confirmation.

## Verification ownership

The implementing engineer owns automated component, Playwright, and accessibility checks. The feature reviewer owns manual keyboard, zoom/reflow, contrast, reduced-motion, and screen-reader review. The human release owner confirms that the critical production smoke path remains operable but does not replace local accessibility verification.

Required commands are defined in `docs/testing/strategy.md`. Any confirmed automated accessibility violation, inaccessible critical flow, clipped content at a required viewport, or keyboard trap blocks release. Tool false positives require a recorded manual review; they are not silently ignored. Visual snapshots are reviewed for meaning and MUST NOT be accepted blindly.
