# ADR 0002 — Bangla-first, low-literacy-first accessibility

- **Status:** Accepted
- **Date:** 2026-08-25
- **Blueprint refs:** §0, §13 (P1), §15, §16, §52, §74

## Context

The most vulnerable user — persona P1 — may read limited Bangla, uses an inexpensive Android
phone on intermittent connectivity, and is the person fraud targets hardest. An English-first
product translated afterwards systematically produces bureaucratic Bangla that this user cannot
act on, and quietly pushes them back toward the informal broker path.

## Decision

1. **`bn-BD` is the default locale everywhere.** English is a first-class option, never the source
   of truth for UX quality. Public URLs are `/bn/...` and `/en/...`; `/` redirects to the default.
2. **No literal UI copy in components.** All copy is ICU message keys in `packages/i18n`. A lint
   rule and a test guard this.
3. **Translation status is data:** `machine_draft | human_reviewed | authoritative`. Keys marked
   _critical_ (money, refundability, legal warnings, consent, emergency) **must** be at least
   `human_reviewed` in Bangla — enforced by a unit test that fails the build, not by convention.
4. **Every critical instruction is listenable.** `ListenButton` is a product component, not an
   enhancement; audio is an accessibility layer across the product, not a chatbot (§42.14).
5. **Low-literacy interaction rules are encoded in design tokens:** ≥48px tap targets, one main
   question per screen, text + icon (never icon-only for critical functions), amounts rendered
   prominently, refundable vs non-refundable distinguished visually _and_ in audio.
6. **Never require email for worker onboarding.** Phone OTP first; assisted account creation
   requires explicit recorded consent.
7. Accessibility gates in CI: automated axe checks, 200% zoom, keyboard operability.

## Consequences

- Bangla copy review is a release blocker for critical flows. This is intended.
- Components carry more props (`listenKey`, `sourceRef`) than a typical design system.
- Machine-translated Bangla can ship for non-critical explanatory content, clearly tracked.
