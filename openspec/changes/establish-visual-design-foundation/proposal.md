## Why

Todone's product brief makes interaction quality part of the product value: family work should feel clear, gentle, and satisfying rather than administrative or childish. The existing changes specify accessible states and feature behavior, but they do not yet establish enough shared visual language or an iterative design process to keep later screens coherent.

Design should be resolved alongside each vertical slice. A small foundation now gives family management, Todos, history, labels, and recurrence a common starting point while leaving feature-specific decisions with the change that introduces each workflow.

## What Changes

- Establish a light-only "forest at dusk" visual language with warm neutral content surfaces, deep forest and plum anchors, mature nature-derived accents, and accessible semantic state colors.
- Define system-first typography, spacing, shape, elevation, icon, focus, motion, and responsive app-shell rules as reusable design tokens and component contracts.
- Define role-appropriate navigation priorities: children land directly on their assigned Todos and parents retain a prominent path to create and assign one-off Todos.
- Define a server-confirmed Todo completion interaction that briefly pops and celebrates before removing the completed row, without sound, vibration, illustrated animation, rewards, or delayed access to the next task.
- Require lightweight mockups and state review before implementing each substantial new UI surface, followed by responsive, visual, motion, and accessibility review within that feature change.
- Bring the already-delivered authentication and household-bootstrap surfaces under the shared visual foundation without changing their behavior or security contracts.

## Capabilities

### New Capabilities

- `visual-design-foundation`: Shared visual language, app-shell priorities, completion feedback, and incremental design-review requirements.

### Modified Capabilities

- None. Feature changes retain ownership of their domain behavior and screen-specific interaction decisions.

## Impact

- Depends on the deployable PWA foundation and the product brief's visual direction.
- Becomes a design dependency for remaining family-account, Todo, lifecycle, label, and recurrence UI work.
- Affects shared frontend tokens, primitives, application shell, authentication/bootstrap styling, screenshot references, and visual/accessibility review.
- Adds no rewards, points, mascots, avatars, illustrations, sound, vibration, dark mode, or product behavior beyond presentation and interaction feedback.
