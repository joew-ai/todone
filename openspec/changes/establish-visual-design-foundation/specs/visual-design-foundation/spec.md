## ADDED Requirements

### Requirement: Mature Nature-Inspired Visual Language
Todone SHALL use one light-only, nature-inspired visual language built from warm readable content surfaces and restrained deep forest, plum, clay, and related accents. The visual language SHALL define centralized semantic tokens for color, typography, spacing, shape, elevation, iconography, focus, disabled, status, and motion states. It SHALL feel appropriate to adolescents and adults and SHALL NOT introduce mascots, animals, illustrated task animations, emoji decoration, points, streaks, rewards, sound, or vibration.

#### Scenario: Dense family surface uses the shared language
- **WHEN** a family-management or Todo surface presents primary actions with supporting metadata
- **THEN** the primary task remains visually clear, secondary information uses a predictable lower-emphasis hierarchy, and the screen uses shared semantic tokens rather than a feature-specific theme

#### Scenario: Visual styling communicates state
- **WHEN** color, weight, elevation, or motion reinforces identity, status, selection, success, warning, or error
- **THEN** visible text or semantics communicates the same meaning and the actual combination meets the applicable WCAG 2.2 AA requirement

### Requirement: System-Compatible Typography and Components
Todone SHALL use a system-first sans-serif font stack that remains legible and structurally consistent across supported laptop, iPhone, and iPad browsers without requiring a remote font. Shared components SHALL use generous touch targets, restrained rounded geometry and elevation, consistent outline icons, and responsive content hierarchy without clipping long family or Todo content.

#### Scenario: Preferred font is unavailable
- **WHEN** a device renders Todone using a fallback system font
- **THEN** headings, labels, controls, metadata, and Todo rows retain their intended hierarchy without overlap or truncation of essential content

### Requirement: Role-Prioritized Application Shell
The signed-in application shell SHALL prioritize assigned active Todos and completion for children. It SHALL provide parents a prominent keyboard-accessible path to create and assign a one-off Todo whenever that capability is available, while preserving clear household/member context and access to family management and history. Responsive composition SHALL NOT change authorization or hide the only path to an available primary action.

#### Scenario: Child enters the application
- **WHEN** an active child session resolves successfully
- **THEN** the primary destination is that child's assigned active Todos and completion actions are visually and semantically prominent

#### Scenario: Parent needs to assign work
- **WHEN** an active parent uses any supported viewport after Todo creation is available
- **THEN** a prominent labelled path to create and assign a Todo is available without navigating through account settings

### Requirement: Rewarding Server-Confirmed Completion Feedback
Todo completion feedback SHALL begin its celebratory phase only after the server confirms success. The confirmed interaction SHALL provide a brief, local pop and optional abstract light-particle or glitter treatment, resolve the row to an explicitly completed lower-emphasis appearance, and remove it from the active list within a few seconds. It SHALL NOT use sound, vibration, illustration, rewards, or motion that blocks the next action. A visible labelled control SHALL remain available even if supplementary swipe completion is implemented.

#### Scenario: Completion succeeds
- **WHEN** the server confirms that an authorized actor completed an active Todo
- **THEN** the row presents a brief completion celebration and completed state before leaving the active list, the result is announced, and focus moves to the next useful target

#### Scenario: Completion fails
- **WHEN** the completion write fails
- **THEN** no celebration or removal occurs, the Todo remains actionable, and accessible retry feedback is provided

#### Scenario: Reduced motion is requested
- **WHEN** the user prefers reduced motion and completion succeeds
- **THEN** particles, glitter, translation, scaling, and animated collapse are omitted while the same completion state, announcement, removal, and focus outcome remain available

### Requirement: Incremental Design Review
Every change that introduces or materially alters a user-facing surface SHALL include design exploration before final styling and visual review before the change is complete. Exploration SHALL cover the primary compact state, materially different responsive compositions, realistic metadata, and applicable loading, empty, error, success, disabled, conflict, and destructive states. Review SHALL include real implementation screenshots, keyboard/focus behavior, contrast, reduced motion, 320-pixel reflow, and 200-percent zoom.

#### Scenario: Feature introduces a new screen
- **WHEN** a change adds a family, Todo, history, label, or recurrence screen
- **THEN** its design record identifies accepted hierarchy and component behavior before implementation and its verification records responsive visual and accessibility review before completion
