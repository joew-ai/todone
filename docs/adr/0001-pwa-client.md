# ADR 0001: Use a Vue Progressive Web Application Client

- Status: Proposed
- Date: 2026-08-05

## Context

Todone must work on laptop browsers, iPhone, and iPad. The project prioritizes AI-assisted developer velocity, low operating cost, accessible web delivery, and a small reversible architecture. Native iOS packaging would add a second client toolchain before the product proves its core family workflow.

## Decision

Build the client as a Vue 3, Vite, TypeScript, Tailwind, and PWA application. Deliver static assets through S3 and CloudFront. Use a responsive shell at compact, medium, and wide breakpoints and follow `docs/ux/responsive-accessibility.md`.

The PWA service worker may cache versioned public static assets. It MUST NOT cache protected API responses, credentials, tokens, or private household content. Offline mutation queues and native iOS packaging are out of scope.

The local `weather` project is a development reference, not a source of product requirements or code that Todone must preserve.

## Consequences

- One client implementation serves all target devices and can be installed where browser support permits.
- Static hosting and CDN costs remain low.
- Browser security, storage, service-worker updates, responsive behavior, and accessibility require explicit testing.
- The application does not promise native platform APIs or reliable offline writes.
- Native packaging remains a future reversible decision if the web client cannot satisfy an accepted requirement.
