# Product Brief

## One-sentence description
A task tracking app to be used by family, for tracking daily routines and chore lists.

## Problem
Right now it is difficult to virtually keep a whole family coordinated with their regular chore lists, random emergent TODOs, and daily routines (like morning and bedtime routines). Existing todo apps are not fun to use, they do not have good cross-device and cross-user collaboration, and they are expensive.

## Target users
# Who is this for?
Me and my family. 2 parents, and 3 children (ages 8yo - 12yo)


# Who is explicitly not part of the initial audience?
The rest of the world. This is just for me and my family. If it is helpful to build it for a broader audience, that's fine.

## Core value proposition
What becomes meaningfully easier or better?
Routines, habits, and chore completion in my house

## Primary user journeys
1. As a parent, I want to be able to add todos assigned to each of my children
2. As a child, I want to be able to view my list of todos
3. As a child, I want to be able to check off my todos, and for my parents to be informed.

## Crawl MVP capabilities

- Deliver a responsive PWA with production sign-in, session restoration, sign-out, and household isolation.
- Let a first parent register through the lightweight deployment gate, verify a recovery email, and create one household.
- Support multiple household members with immutable `parent` and `child` roles.
- Let parents add child and additional-parent accounts. Additional parents verify their own recovery email and choose their own password.
- Let parents set and reset child passwords and permanently remove child accounts. One parent cannot reset, remove, demote, or otherwise administer another parent.
- Let every member update only their own non-unique display name and profile color.
- Let parents create a Todo with a title, zero or one due date, exactly one active household assignee, and zero or one household label.
- Let children see only their own active assigned Todos. Let parents inspect each household member's active Todos.
- Let the assignee or any parent complete an active Todo. Parents can edit active Todos and manage their archive, history, reopen, and deletion lifecycle.
- Let members view only the Todo history permitted by their role and filter their authorized active/history views by one label.

## Deferred beyond crawl

- Role changes, parent removal/demotion, and one parent resetting another parent's password.
- Unassigned Todos and Todos with multiple assignees.
- Daily, weekly, and monthly recurrence, including incomplete-previous-item recurrence rules.
- Public household joining, invitations, shared-device account switching, and native iOS applications.
- Broader organization, notification, reward, analytics, and integration features not explicitly included in the crawl changes.

## Non-goals
- Syncing with other tools (Apple Reminders, Google Tasks, etc.)
- Massive scaling capabilities
- Product or reminder email notifications. Cognito may send transactional verification and password-recovery email to adult accounts; child accounts do not require email.
- Telemetry or tracking
- Pricing/Upsell model (this is a tool, not a product)

## Important entities and terminology
- This app will be used for both todos and tasks. The noun we will use for theses is "Todos"
- Parents and Children are both roles, which are applied to Users

## Platforms and devices
- Target a responsive web PWA on laptop browsers, iPhone, and iPad. Native iOS is deferred beyond crawl.

## Integrations
None

## Data and privacy considerations
No telemetry, no sharing. Application should be built in a thoroughly secure fashion.

## Visual direction
Most importantly, checking off todos should feel _fun_. It should give a dopamine hit. It shouldn't feel like work.

Interactions should have satisfying UI reactions.

Colors should be light, but mature. We are targeting adolescent and adult users - not children. It should feel natural and casual to use, but not so far that it feels like a kid's toy app.

I really like the UX interactions from the Clear (https://www.useclear.com/) app

I've included a few design inspiration screenshots:

~/docs/product/assets/design_inspo_1.png
~/docs/product/assets/design_inspo_2.png
~/docs/product/assets/design_inspo_3.png
~/docs/product/assets/design_inspo_4.png

Generally the color scheme should feel nature-y and campy. Forest greens, light tans, soft browns, etc.

## Success criteria
- App meets all crawl MVP functionality goals
- App is well tested via unit tests, integration tests, and has been verified with Playwright tests
- App is thoroughly threat modeled and tested against those goals
- App has clear developer documentation for future iteration

## Constraints
- Ideally hosted on AWS via my family-paas system (https://github.com/josephwegner/family-paas)
  - Example app that I have hosted via family-paas https://github.com/josephwegner/weather
- As much as possible, use free infrastructure. I am willing to make minor architectural sacrifices to keep infra free or extremely cheap
- Must be able to run on a full laptop web browser, iPhone, and iPad
