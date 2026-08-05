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

## MVP capabilities
- Application can support multiple users, differented by a login process
- Profile management is available to all accounts, including updating names and "color".
- Users can log out
- User roles (parent, child)
- Family user management only available to parents
  - Add user to family
  - Remove user from family
  - Change user role
  - Password updates (passwords are entered by parents, and applied to child or parent accounts).
  - One parent cannot update another parent's password
- Parents can add todos
  - Todos can be assigned to no one, one person, or multiple people
  - Todos can be assigned to children or parents
  - Todos can have a due date
  - Todos can have a single label (ie: "bedtime" or "home repair")
    - These labels are stored and auto-suggested in the future (much like GitHub PR labels)
  - Todos can be set to repeat (daily, weekly, monthly)
  - Repeating chores can be set to not repeat if the previous item is not yet completed
- Parents and Children can see their list of currently assigned todos
  - Lists can be filtered by label
- Parents and Children can see a list of unassigned todos
- Parents and Children can mark their todos, or unassigned todos, as "done". Parents can mark any todo as done, regardless of assignment.
- Parents can modify todos
  - Update (name, due date, assignment, label)
  - Delete
 
## Non-goals
- Syncing with other tools (Apple Reminders, Google Tasks, etc.)
- Massive scaling capabilities
- Email notifications (users will not even have an email address assigned)
- Telemetry or tracking
- Pricing/Upsell model (this is a tool, not a product)

## Important entities and terminology
- This app will be used for both todos and tasks. The noun we will use for theses is "Todos"
- Parents and Children are both roles, which are applied to Users

## Platforms and devices
- Mainly targetting web (with a PWA) or native iOS apps
  - This decision should be made based on AI-assisted developer velocity. If XCode is too slow to work with, we don't want it

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
- App meets all MVP functionality goals
- App is well tested via unit tests, integration tests, and has been verified with Playwright tests
- App is thoroughly threat modeled and tested against those goals
- App has clear developer documentation for future iteration

## Constraints
- Ideally hosted on AWS via my family-paas system (https://github.com/josephwegner/family-paas)
  - Example app that I have hosted via family-paas https://github.com/josephwegner/weather
- As much as possible, use free infrastructure. I am willing to make minor architectural sacrifices to keep infra free or extremely cheap
- Must be able to run on a full laptop web browser, iPhone, and iPad
