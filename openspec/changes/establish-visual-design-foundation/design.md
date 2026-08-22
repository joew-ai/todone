## Context

The product brief asks for a clear and rewarding family task experience inspired most strongly by Clear's focused interaction model, while the denser family-list reference demonstrates how secondary metadata can remain gentle. Todone must support meaningful account, assignment, lifecycle, and recurrence detail, but that complexity should not dominate the primary task.

The foundation is light-mode-only in the platform sense, but it is not uniformly pale. Deep forest may anchor navigation and actions while the signed-in member's canonical profile color supplies accessible tonal variants for atmospheric headers and full-bleed list surfaces. Warm neutrals remain available for forms and dense settings. The result should feel mature, natural, and casual—not like a children's rewards product.

## Goals / Non-Goals

**Goals:** a coherent visual language, low-friction role-based shell, reusable component anatomy, satisfying accessible completion feedback, representative mockups, and design iteration inside every later vertical slice.

**Non-Goals:** pixel-locking every future screen, dark mode, a required bespoke illustration library, mascots, animals, task illustrations, points, streaks, rewards, rare/jackpot animation outcomes, sound, vibration, decorative gamification, or adopting every pattern shown in an inspiration screenshot.

## Visual and UX Direction

### Visual character and tokens

- Use a light-only "forest at dusk" composition: deep evergreen anchors common navigation/actions while the current member's canonical profile color may generate a coordinated family of light, mid, deep, muted, and on-color tonal tokens for their personal header and full-bleed Todo canvas. Warm neutral surfaces carry forms and settings where sustained reading benefits from less color.
- Start shared semantic exploration from bark text `#2E2925`, muted bark `#6F675F`, evergreen action `#1F563F`, warm canvas `#F6F1E8`, paper `#FFFCF6`, warm border `#D8CEC0`, and rust warning `#A44232`. Define and contrast-check a tonal family for each canonical profile color rather than applying the stored base hex directly as a large background. These are candidate tokens, not permission to scatter literal values through components.
- Profile-derived atmosphere is identity, not state. A member's self/home surface uses that signed-in member's tonal family. A parent household shell retains the parent's global atmosphere, while a selected child's name-plus-color may tint the scoped member context and Todo canvas so the target remains obvious. Keep success/warning/error/action semantics stable across profiles, and ensure that changing profile color never makes controls or lifecycle states change meaning.
- Prefer a simple, high-quality profile-to-forest gradient in the default header. Optional static SVG nature artwork may use restrained trail, tree-line, canopy, ridge, or topographic forms only after visual review confirms that it feels intentional and mature. Do not ship generic clip art, faux-retro scenery, animals, mascots, or low-detail illustration merely to fill space.
- Use a system-first friendly sans-serif stack such as `Avenir Next`, `Avenir`, `Segoe UI`, `Inter`, `system-ui`, and `sans-serif`, with platform fallbacks and no required remote font. Favor clear sentence case, moderate weight, and compact metadata rather than cartoon display lettering or all-caps decoration.
- Use generous touch targets and internal whitespace, softly rounded controls and genuinely bounded surfaces such as forms/dialogs, quiet borders, and restrained elevation. Full-bleed Todo rows remain a continuous canvas rather than individually rounded cards; use hierarchy, separators, and tonal surfaces to keep complex pages calm.
- Use one consistent outline icon family. Avoid emoji, clip art, illustrated task objects, animals, and identity imagery that makes the experience feel aimed at young children.
- Full-bleed Todo rows may use subtle profile-derived gradients or dappled-light texture to make the list feel organic and reinforce horizontal completion. Resting motion must remain low-contrast and non-essential; prefer motion that responds to hover, focus, press, or drag over simultaneous high-activity animation across the whole list, and remove it under reduced motion.

### Information hierarchy and app shell

- The child's signed-in landing surface prioritizes their assigned active Todos and exposes completion as the strongest repeated action. Navigation and account controls remain available but visually secondary.
- The parent's signed-in shell keeps household/member context clear and provides a prominent, persistent, keyboard-accessible path to create and assign a one-off Todo. Family management and history are reachable without competing with the primary create/view workflow.
- Compact layouts use one primary column and a small stable navigation region. Medium and wide layouts may reveal supporting context or persistent navigation only when the same reading order and primary action remain clear.
- Present essential Todo information first: title, completion control, and due state. Assignee, label, recurrence, actor, and lifecycle metadata use predictable secondary positions and progressive disclosure where an action does not require all details at once.

### Completion feedback

- Completion remains a server-confirmed state transition. Pressed and submitting feedback may begin immediately, but celebration begins only after the server confirms success.
- On confirmation, the completion control gives a quick scale/settle "pop" and the row plays one of a small reviewed family of equally special nature-inspired treatments, such as a leaf gust, firefly drift, sunbeam wipe, rain ripple, or dappled-light bloom. Effects use abstract SVG/CSS shape, light, and motion—no emoji, score, streak, sound, or vibration.
- Completion variety is not a lottery. Do not label, rank, collect, or assign rarity to effects. Select the effect by hashing the stable Todo ID into the approved effect list; retries and reopened completion of the same Todo therefore use the same treatment without storing reward state. Keep every effect comparable in duration, prominence, and quality.
- The row then resolves to a clearly completed, lower-emphasis state with visible completion text/check treatment before fading or collapsing out of the active list. The entire confirmed celebration and removal takes no more than a few seconds and never blocks interaction with the next Todo.
- Swipe may be offered as a supplementary pointer/touch shortcut when it proves reliable, but a visible, labelled completion control remains the canonical keyboard, screen-reader, and pointer action.
- With reduced motion, omit translation, scaling, particles, glitter, and collapse animation. Confirm completion through an immediate state/text change and remove the row while preserving the same announcement and focus outcome.
- If the write fails, do not play celebration or remove the row. Restore the actionable state in place with retry and useful focus.
- Modern target devices can comfortably render richer local SVG/CSS completion effects when few run at once. Prefer composited transforms and opacity, but judge complexity by measured interaction responsiveness, smooth scrolling, battery-conscious duration, and absence of long main-thread work rather than an arbitrary particle limit. An effect must never delay focus, input, server-state presentation, or row removal.

### Incremental design process

- Before implementing a substantial new screen or interaction, create low-cost wireframes or inspectable reference mockups for the primary compact state and any materially different medium/wide composition.
- Review hierarchy, role-appropriate actions, realistic metadata, loading/empty/error/success/disabled states, destructive controls, and long-content behavior before final component styling.
- Treat mockups as decision records, not immutable screenshots. Record accepted anatomy and behavior in the owning change's `design.md`; keep visual constants in the foundation rather than copying feature-specific palettes.
- During implementation, review real screenshots at compact, medium, and wide targets, 320-pixel reflow, 200-percent zoom, reduced motion, keyboard focus, and representative long names/content. Iterate within the feature change before its verification task can complete.
- The foundation owns shared tokens and primitives. Each feature change owns the mockups, component composition, interaction details, and visual acceptance evidence for the surfaces it introduces.

## Risks / Trade-offs

- A dark anchor color can make the product distinctive but can also overpower dense pages. Reserve deep surfaces for hierarchy and focus, leaving reading surfaces warm and quiet.
- Celebration can become distracting when many Todos are completed quickly. Keep it short, local to the completed row, interruptible by continued work, and absent in reduced-motion mode.
- Profile-derived large surfaces require a tested tonal family for all eight colors; direct base-color fills would make some profiles too aggressive or fail contrast.
- Optional nature artwork can quickly become cheesy or inconsistent. The default gradient is sufficient, and illustration is accepted only when reviewed at production quality rather than treated as required decoration.
- System fonts vary by platform. The hierarchy must remain sound across the fallback stack instead of relying on one font's exact metrics.
- Reference mockups can become stale. Requirements and accepted component anatomy remain authoritative; feature reviews update the design record when implementation reveals a better accessible solution.

## Migration Plan

- Add semantic tokens and shared primitives without changing domain behavior.
- Apply the foundation first to the app shell and existing authentication/household-bootstrap surfaces, preserving their tested flow and focus behavior.
- Use the first family-management and Todo screens to validate density, role navigation, Todo anatomy, and completion motion before later lifecycle, label, and recurrence surfaces extend them.
- Roll back individual visual primitives independently if they fail contrast, motion, or responsive review; no data migration is involved.
