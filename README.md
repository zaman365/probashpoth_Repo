# ProbashOS — safe migration & global opportunity platform

> **Working codename.** `ProbashOS` is a placeholder. The product name is read from
> configuration (`PUBLIC_PRODUCT_NAME` / `PUBLIC_PRODUCT_NAME_BN`) and is never
> hard-coded in code or copy.

**Mission:** make international work and study migration understandable, verifiable,
affordable, traceable, and significantly harder to exploit — for Bangladeshi workers
and students first.

The platform wins only if a worker can say:

> **আমি জানি চাকরিটা আসল কি না, কত টাকা লাগবে, কাকে টাকা দিচ্ছি, কেন দিচ্ছি, আর এখন আমার পরের কাজ কী।**
>
> _I know whether the opportunity is real, how much it costs, who I am paying, why I
> am paying, and exactly what I need to do next._

> ⚠️ **All data in this repository is synthetic.** Every seeded job, employer and
> agency is prefixed `DEMO` and flagged `isSyntheticDemoData`. The API refuses to
> serve synthetic records outside development, and CI fails if a seeded record is
> unlabelled. Do not put real personal data in this repository, ever.

---

## What is built today

This repository contains the **trust rail and the seven blueprint engineering
releases**. The original end-to-end slice remains the smallest runnable proof:

> a Bangla-speaking worker creates an account → picks an occupation and country →
> sees a source-backed route → views one verified job → sees the exact cost →
> scans a mismatched offer and gets a risk warning → starts a case → invites a
> family co-pilot → generates a sandbox payment intent → sees a digital receipt →
> completes a milestone → sees the settlement state.

English is available at every step.

The implementation now also includes the shared Migration Passport, separate Work
and Higher Study operating systems, organisation-scoped supply portals, independent
publication and outcome review, privacy-thresholded institutional analytics, and an
Android-first Expo client. See `docs/blueprint-delivery.md` for the evidence gate of
each release.

Alongside it, the **public web surface (§14.1)** is live and needs no account:
country guides, occupation guides, scam education, public job verification, and the
SEO plumbing (`sitemap.xml`, `robots.txt`, canonical URLs, Bangla/English `hreflang`,
guide JSON-LD). Case, receipt and document routes are excluded from indexing.

**External launch dependencies remain deliberately unfaked:** production Temporal
workflows, licensed payment/government/communications integrations, KMS-backed object
storage and malware scanning, human-reviewed country and programme evidence, real
partner demand, device/accessibility certification, legal approval and operating
support teams. Synthetic records remain labelled and are blocked in production.

---

## Architecture

```text
                    ┌──────────────────────────────────────────────┐
                    │        packages/  (the shared truth)         │
   worker/student   │  domain · rules · ledger · auth · contracts  │   one copy of
   sees the same    │  i18n · design-tokens · analytics · config   │   every rule
   answer on every  └──────────────────────────────────────────────┘
   surface                     ▲            ▲            ▲
                               │            │            │
        ┌──────────────────────┴───┐  ┌─────┴─────┐  ┌───┴─────────────────┐
        │ apps/web (Next.js)       │  │ apps/api  │  │ apps/mobile (Expo)  │
        │ public + worker PWA      │  │ NestJS +  │  │ apps/ops-desktop    │
        │ Bangla-first, /bn · /en  │──│ Fastify   │──│ (Tauri, operators)  │
        └──────────────────────────┘  └─────┬─────┘  └─────────────────────┘
                                            │
        ┌───────────────────────────────────┼───────────────────────────────┐
        │ PostgreSQL (business state) · Temporal (long processes)           │
        │ S3/MinIO (documents) · Redis (ephemeral only)                     │
        └───────────────────────────────────────────────────────────────────┘
```

Rules of the architecture (ADR 0001):

- **Domain logic lives in `packages/`, never in an app.** An app that re-implements an
  eligibility, cost or ledger rule is a review failure.
- **Persistence is a port.** `STORAGE_DRIVER=memory` runs local/test slices;
  `postgres` uses the durable adapter and explicit SQL migrations.
- **AI never decides.** It may rephrase an explanation built from a decision trace; it
  cannot change a result or upgrade a verification level.

### Apps

| Path               | What it is                                                    | Status                               |
| ------------------ | ------------------------------------------------------------- | ------------------------------------ |
| `apps/api`         | NestJS + Fastify, REST + OpenAPI, bounded contexts as modules | runs, tested                         |
| `apps/web`         | Next.js App Router — public SEO pages + worker/student PWA    | runs, tested                         |
| `apps/mobile`      | Expo Router (Android first)                                   | scaffold, excluded from root install |
| `apps/ops-desktop` | Tauri operator desk (Digital Centre / agency branch)          | shell, excluded from root install    |

### Packages

| Package                  | Responsibility                                                                                      |
| ------------------------ | --------------------------------------------------------------------------------------------------- |
| `@probash/domain`        | Types and value objects: `Money`, verification taxonomy, case state machine, cost, milestones, risk |
| `@probash/rules`         | Typed JSON rule DSL, three-valued interpreter, `DecisionTrace`                                      |
| `@probash/ledger`        | Double-entry accounting, milestone settlement, deterministic refunds                                |
| `@probash/auth`          | RBAC + ABAC authorization with obligations (audit, masking, reason)                                 |
| `@probash/contracts`     | Zod DTOs + typed API client shared by every surface                                                 |
| `@probash/i18n`          | bn/en catalogues, glossary, translation-status governance, money formatting                         |
| `@probash/design-tokens` | Colour, spacing, typography, contrast helpers → CSS variables                                       |
| `@probash/analytics`     | Event taxonomy (§47) with a hard privacy guard                                                      |
| `@probash/config`        | Validated environment and feature flags                                                             |
| `@probash/testing`       | Synthetic fixtures shared by unit, integration and E2E tests                                        |

---

## Local setup

Requirements: **Node 22 LTS**, **pnpm 11**, and Docker (only for the optional local
services).

```bash
cp .env.example .env
pnpm install
pnpm build          # packages must be built before the apps run
pnpm seed           # validates the synthetic seed and prints a summary
```

Run the API and the web app in two terminals:

```bash
pnpm --filter @probash/api dev     # http://localhost:3001  (OpenAPI UI at /api/v1/docs)
```

```bash
pnpm --filter @probash/web dev     # http://localhost:3000  → redirects to /bn
```

> **Why the API dev script uses SWC, not `tsx`:** NestJS resolves constructor
> dependencies from `emitDecoratorMetadata`, which esbuild-based runners drop. Under
> `tsx` the app starts and then fails to inject, with an error that points nowhere
> useful. Every TypeScript entry point in `apps/api` therefore runs through
> `@swc-node/register`, and the API's Vitest config uses the SWC transform for the
> same reason.

### Dev credentials (synthetic)

There are none to memorise, by design (§17):

- Sign in with **any valid-format Bangladeshi mobile number**, e.g. `01712345678`.
- The OTP is printed to the API log (`[sms:dev] OTP for +8801712345678: 123456`) and
  returned in the `devOtp` field. Both happen **only** when `APP_ENV` is
  `development` or `test`.
- Consent must be given explicitly; the API refuses to create an account without it.

Useful synthetic records: job `BD-QA-2026-00482915` (verified), `BD-MY-2026-00220118`
(suspended, expired agency licence), route `rv_qat_work_v1`, and an unmatched id such
as `BD-QA-2026-99999999` to see the "not found" answer.

Worth visiting without signing in at all: `/bn/countries`, `/bn/countries/qa`,
`/bn/occupations/electrician`, `/bn/safety`, `/bn/verify`, and
`/bn/verify/job/BD-QA-2026-00482915`. `/bn/countries/bt` shows what an honest empty
answer looks like.

### Local services (PostgreSQL, Redis, Temporal, MinIO)

```bash
pnpm services:up      # docker compose -f infra/docker/docker-compose.yml up -d
pnpm services:down
```

| Service       | URL                                                 | Notes                                               |
| ------------- | --------------------------------------------------- | --------------------------------------------------- |
| PostgreSQL 18 | `postgres://probash:probash@localhost:5432/probash` | `pg_trgm` enabled on init                           |
| Redis 8       | `redis://localhost:6379`                            | ephemeral only — never financial truth              |
| Temporal      | `localhost:7233`, UI on `http://localhost:8233`     | workflows are the next epic                         |
| MinIO         | `http://localhost:9000`, console `:9001`            | bucket `probash-documents` is created and versioned |

The slice runs **without** these services on `STORAGE_DRIVER=memory`. They are here so
durable workflows, PostgreSQL and document storage can be exercised locally.

### Migrations

```bash
pnpm db:migrate
```

Migrations are explicit SQL in `apps/api/src/storage/postgres/migrations/`, applied in
filename order and recorded in `schema_migration`. There are no ORM-generated or silent
migrations (§83), and the runner refuses to auto-apply a destructive statement in
production (§67). See `apps/api/src/storage/postgres/README.md`.

---

## Commands

| Command                              | What it does                                              |
| ------------------------------------ | --------------------------------------------------------- |
| `pnpm build`                         | Builds every package and app (Turborepo)                  |
| `pnpm test`                          | Runs all unit, integration and API tests                  |
| `pnpm typecheck`                     | Strict TypeScript across the workspace                    |
| `pnpm lint`                          | ESLint, including rules that encode blueprint constraints |
| `pnpm format` / `pnpm format:check`  | Prettier                                                  |
| `pnpm seed`                          | Validates the synthetic seed and its cross-references     |
| `pnpm --filter @probash/api openapi` | Regenerates `docs/api/openapi.json` from source           |
| `pnpm e2e:web`                       | Playwright suite (API and web must be running)            |
| `pnpm services:up` / `services:down` | Local Docker services                                     |

### Testing

```bash
pnpm test                                   # everything
pnpm --filter @probash/rules test           # one package
pnpm --filter @probash/api test             # API end-to-end over HTTP
pnpm e2e:web                                # Playwright (needs API + web running)
```

The API suite drives the whole trust rail through real HTTP requests: onboarding,
eligibility, public verification, the fraud scanner, cost plan, sandbox payment,
milestone settlement, receipts, and the family co-pilot's exact permission boundary.

---

## Contributing to Bangla and English copy

Copy lives in `packages/i18n/messages/{bn,en}.json`, keyed and ICU-shaped. Rules:

1. **Bangla is the source language** for worker-facing copy. Write it first (ADR 0002).
2. **No literal strings in components.** A missing key renders as the key itself so it
   fails visibly in review rather than silently showing English.
3. Both catalogues must have identical key sets — a test enforces this.
4. **Critical copy** (money, refundability, legal warnings, consent, emergency,
   scanner verdicts) must reach `human_reviewed` in Bangla before a production
   release. Status lives in `packages/i18n/meta/translation-status.json`;
   `assertCriticalCopyReviewed()` is the release gate, and a test lists exactly which
   keys are still outstanding.
5. Government and legal terms get a plain-language entry in
   `packages/i18n/meta/glossary.json` ("সহজ ভাষায় বুঝুন").
6. Never write "guaranteed visa", "100% chance" or similar — a test scans both
   catalogues for that language (§74).

---

## Rules and regulatory data workflow

Route and eligibility data is **versioned, effective-dated data — not code** (ADR 0003).

```text
official source → raw snapshot (hashed) → normalized extract → diff → human review → version publish
```

1. Register the source in `data/seed/sources.json` with its authority, URL and review
   cadence (§68).
2. Add or amend a `routeVersion` in `data/seed/routes.json` and its rule in
   `data/seed/rules.json`. Every requirement carries the source it came from.
3. Bump `version`; never edit a published version in place.
4. `pnpm seed` validates cross-references (unknown rule, source, employer, fee rule or
   country all fail the build).
5. Publication is permissioned and audited. Draft and withdrawn versions are invisible
   to evaluation.

The rule interpreter is deliberately small: comparison, set membership, presence, and
`all`/`any`/`not`, over three-valued logic. **A missing fact yields `unknown`, never a
guess and never a default "no"** — the UI answers "we cannot determine" and routes to
a human.

---

## Security

- Report vulnerabilities privately to the security contact listed in
  `docs/security/README.md`. Please do not open a public issue.
- Never commit secrets; `.env` is git-ignored and CI runs a secret scan.
- No real personal data in development, test or staging (§50). CI scans `data/` for
  identifiers that look real and fails the build.
- Details, including the threat-model summary for identity, payments and documents,
  are in [`docs/security/README.md`](docs/security/README.md).

---

## Documentation

| Document                                         | Contents                                                                   |
| ------------------------------------------------ | -------------------------------------------------------------------------- |
| [`docs/adr/`](docs/adr/)                         | Architecture decisions — read these first                                  |
| [`docs/data-model.md`](docs/data-model.md)       | Entity map and how records relate                                          |
| [`docs/security/`](docs/security/)               | Threat model summary, controls, reporting                                  |
| [`docs/compliance/`](docs/compliance/)           | Legal workstreams that gate scale, and what this platform does _not_ claim |
| [`docs/ux/`](docs/ux/)                           | Low-literacy design rules and copy principles                              |
| [`docs/country-sources/`](docs/country-sources/) | Official source registry and review cadence                                |
| [`docs/api/`](docs/api/)                         | Generated OpenAPI specification                                            |

## Product invariants

These are constraints, not preferences (§76):

1. A worker can see every platform-known cost before committing.
2. A worker can see who earns every fee.
3. Search ranking is never sold. Personal data is never sold.
4. A financial incentive never changes an eligibility answer.
5. AI never upgrades a verification level.
6. A complaint cannot be deleted by the organization complained about.
7. Route changes notify affected users; a suspended organization triggers review of
   affected cases.
8. The company must be willing to lose revenue rather than route a worker into an
   unverified transaction.
