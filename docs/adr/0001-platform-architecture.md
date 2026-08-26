# ADR 0001 — Platform architecture

- **Status:** Accepted
- **Date:** 2026-08-25
- **Deciders:** Platform engineering
- **Blueprint refs:** §42, §43, §44, §83

## Context

The platform must serve six very different surfaces (low-literacy worker mobile, student/worker
web, assisted-service desk, employer/agency portals, government admin, provider portal) while
sharing one authoritative body of domain logic: route rules, eligibility, cost, verification,
ledger. Duplicating that logic per surface is the primary long-term risk to trust: two surfaces
disagreeing about a fee or an eligibility answer is a worker-harm event, not a cosmetic bug.

## Decision

1. **TypeScript-first monorepo** (`pnpm` + Turborepo, strict TS) with separate optimized runtimes
   per surface. We do not force one UI framework across web, mobile and desktop.
2. **Domain logic lives in `packages/`, never in an app.** `domain`, `rules`, `ledger`, `auth`,
   `contracts`, `i18n`, `analytics`, `design-tokens` are the shared truth. Apps are delivery
   mechanisms. An app may not re-implement an eligibility, cost or ledger rule.
3. **Backend:** NestJS on the Fastify adapter, REST/JSON + OpenAPI, bounded contexts as Nest
   modules (§44). No GraphQL until client-query complexity demonstrably requires it.
4. **Web:** Next.js App Router (patched 16.x) — public SEO surfaces and the worker/student PWA.
5. **State ownership:** PostgreSQL for business state, Temporal for durable multi-week process
   orchestration, object storage for documents, Redis for ephemeral state only.
6. **Persistence is a port.** The API depends on repository interfaces (`src/storage/ports.ts`),
   not on a driver. This lets the trust-rail slice run end-to-end on an in-memory store while the
   PostgreSQL adapter is built behind `STORAGE_DRIVER`.
7. **No premature infrastructure:** no Kubernetes, no search cluster, no microservice split, no
   vector store on the authoritative path (§82).

## Consequences

- A rule change lands once and is visible identically on every surface.
- Apps stay thin and replaceable; a future government-hosted deployment can swap infrastructure
  without touching domain packages.
- The cost is discipline: every PR that adds business logic to an app is a review failure.
- `STORAGE_DRIVER=postgres` is a feature flag until the adapter is complete; the flag fails loudly
  rather than silently degrading (§83, "no silent data migrations").

## Alternatives considered

- **One universal React Native/web codebase** — rejected. §85: a low-literacy worker, a mobile
  student and a desk operator need genuinely different interfaces.
- **Microservices from day one** — rejected (§82). Bounded contexts as modules give the same
  boundaries with far lower operational cost; they can be extracted later.
