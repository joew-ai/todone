## 1. Visual Language and Reference Design

- [ ] 1.1 Inventory existing shell, authentication, bootstrap, profile, and shared-control styles against the product brief and foundation requirements; completion: duplicate patterns, accessibility constraints, and behavior that must not regress are recorded before visual changes.
- [ ] 1.2 Define semantic color, typography, spacing, shape, elevation, icon, focus, disabled, warning, success, and motion tokens; completion: representative token combinations pass WCAG 2.2 AA contrast and no component depends on raw profile colors or feature-local visual constants.
- [ ] 1.3 Produce and review inspectable compact reference mockups for the child active-Todo home, parent member/Todo view with prominent creation, and server-confirmed completion sequence, plus materially different wide-shell composition; completion: the accepted anatomy demonstrates realistic metadata, gentle density, no child-directed illustration/gamification, and reduced-motion behavior.
- [ ] 1.4 Document reusable app-shell, navigation, form, Todo-row, metadata, status, confirmation, and feedback component contracts; completion: later changes can extend named patterns without copying a whole screen or inventing a separate visual language.

## 2. Shared Foundation Implementation

- [ ] 2.1 Implement centralized semantic tokens and shared primitives with the system-first font stack and light-only forest-at-dusk composition; completion: literal styling is limited to token definitions and components remain usable across supported browsers and viewport ranges.
- [ ] 2.2 Implement the role-aware responsive shell and navigation placeholders without exposing unavailable feature routes; completion: children land on their primary assigned-work destination when available, parents retain a prominent create-Todo path when available, and focus/reading order remains stable across compact, medium, and wide layouts.
- [ ] 2.3 Restyle existing authentication and household-bootstrap surfaces through the shared foundation without changing security, session, validation, or onboarding contracts; completion: Entry Code and account-password guidance remain distinct and every existing browser/security test still passes.

## 3. Visual and Accessibility Verification

- [ ] 3.1 Add component and browser coverage for token use, shell navigation priorities, focus behavior, and long-content reflow; completion: foundation behavior is covered without shipping placeholder Todo controls before the first Todo vertical slice.
- [ ] 3.2 Capture and manually review representative compact, medium, and wide screenshots plus 320-pixel reflow and 200-percent zoom for the shell and existing auth/bootstrap surfaces; completion: hierarchy remains clear, ordinary loading does not shift layout, and no state relies on color or motion alone.
- [ ] 3.3 Perform keyboard, screen-reader, contrast, forced-colors where supported, and reduced-motion review of shared primitives; completion: results and any intentional constraints are recorded before downstream UI changes claim the foundation.
- [ ] 3.4 Run format, lint, typecheck, unit tests, integration tests, production build, relevant Playwright, and accessibility checks; completion: all required checks pass and the diff contains no unrelated behavior changes.
