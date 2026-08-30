# ProbashPoth — state, blockers and next steps

Written 2026-08-30 against commit `0bab05b` on branch `fix/ci-web-runtime`.

This document exists so a new agent or engineer can continue without re-deriving the
state of the repo. Everything in the "verified" sections was actually run and observed
on 2026-08-30 — nothing here is assumed. Where something is unknown or unverified, it
says so.

---

## 0. Read this before you change anything

This product helps Bangladeshi workers and students migrate safely. A wrong answer about
a visa rule, a fee, or whether a job is real can cost someone their savings or their
safety. The codebase is deliberately full of controls that fail closed. **Do not remove
a control to make a check pass.**

Hard rules, all of which the existing code already enforces:

- Never invent government, visa, immigration, recruitment, education, payment or legal
  facts. Eligibility is three-valued — `unknown` is a real, required answer.
- Never let AI or OCR decide eligibility or raise a verification level.
- Never claim a visa, admission, scholarship, employment or migration probability.
- Never treat synthetic seed data as production data. It is labelled; keep it labelled.
- Never enable real document uploads or real payments without the full control set in
  §4 below. The code refuses both today, on purpose.
- Never approve a release gate (S1–S4) in `config/release-gates.json`. Those require
  named humans, not a passing test.

If a task seems to require breaking one of these, stop and ask the repo owner.

The `§n` references throughout the codebase point to a 4,444-line product blueprint that
is **not in this repo**. It lives in the owner's Google Drive
(`ProbashOS_Business_Product_Technical_Blueprint_Codex_Claude.md`). Without it, `§25` and
similar citations resolve to nothing. Ask for it before extending a module.

---

## 1. Where the code is

**Branches**

| Branch                | State                                                                                                       |
| --------------------- | ----------------------------------------------------------------------------------------------------------- |
| `main`                | Behind. CI has been red on it since 2026-08-26. Local `main` is 1 commit ahead of `origin/main` (unpushed). |
| `fix/ci-web-runtime`  | The CI repair. Open as PR #1. This is the freshest branch — start here.                                     |
| `codex/site-redesign` | Public-site redesign work, plus its own formatting fix. Rebase onto `main` after PR #1 merges.              |

**What is genuinely built**

- Modular monorepo: `apps/{api,web,document-worker,mobile,ops-desktop}` and eleven shared
  `packages/*`. Turborepo + pnpm.
- API: NestJS + Fastify, 72 tests passing, 87 documented endpoints.
- Web: Next 16 built by `vinext` into a **Cloudflare Workers** bundle. Bangla-first.
- PostgreSQL storage adapter — **real**, 425 lines, not a stub. Nine migrations, with row
  level security in `0008_identity_rls_documents.sql` and `0009_workspace_state.sql`.
- Field encryption — **real** AES-256-GCM envelope encryption (`RecordCipher`). What is
  missing is _key management_, not the crypto.
- Deterministic seed: 249 countries, 10 route versions, 10 rule versions, all synthetic
  records labelled `isSyntheticDemoData: true`, enforced by a CI job.
- Double-entry ledger, three-valued eligibility, verification-level derivation.

**What is deliberately stubbed, and flagged rather than faked**

Temporal workflows, real payment and government adapters, malware scanning, KMS key
management, the study engine, and the employer/agency/admin portals. These fail loudly
via `featureFlags()` in `@probash/config`. Check that function before claiming a
capability works.

---

## 2. Verified state as of 2026-08-30

Run locally on `fix/ci-web-runtime`, all passing:

```bash
pnpm format:check      # clean
pnpm lint              # clean
pnpm typecheck         # 26/26 tasks
pnpm build             # all packages, API, Worker, document-worker dry-run
pnpm test              # 25/25 tasks, 72 API tests
pnpm seed              # synthetic seed validates
pnpm smoke:built       # API 200, built Worker /bn 200 Bangla, 7 live-API calls
pnpm release:gate S0   # approved; S1-S4 correctly exit 1
```

CI on PR #1:

| Check                               | Result                      |
| ----------------------------------- | --------------------------- |
| Format, lint, typecheck, unit tests | **pass**                    |
| No real personal data               | **pass**                    |
| Web E2E (Playwright)                | fail — 92 passed, 28 failed |
| Dependency and secret scanning      | fail — pre-existing         |
| Workers Builds (Cloudflare)         | fail — pre-existing         |

---

## 3. Two runtime traps that have already cost time

Both are fixed in `fix/ci-web-runtime`. Do not undo them.

**The web build only runs on the Workers runtime.** `vinext build` emits a bundle that
imports `cloudflare:` scheme modules. Node's ESM loader rejects those, so `next start`
and `vinext start` boot and then answer **HTTP 500 on every route**. A stale local
`.next` directory makes `next start` look like it works. Always serve the built web app
with Wrangler against `apps/web/dist/server/wrangler.json`. See ADR 0012.

**A Worker does not inherit the shell environment.** `API_BASE_URL=... wrangler dev`
leaves the variable unset _inside_ the Worker. `apps/web/lib/api.ts` reads it at module
load and silently falls back to an in-process demo client — pages still return 200 with
Bangla text, so the failure is invisible. It must be passed as a Worker binding:

```bash
wrangler dev --config dist/server/wrangler.json --var API_BASE_URL:http://127.0.0.1:3001
```

`pnpm smoke:built` now routes the API through a counting proxy and fails if the Worker
never calls it, so this cannot regress silently.

One more, less serious: the Worker binds `127.0.0.1`, while `localhost` may resolve to
`::1` first. Address it by IP in tests.

---

## 4. The blockers, in three tiers

The critical distinction: **tiers A and B are engineering and can be done on free tiers.
Tier C cannot be solved by any amount of money or tooling** — it needs named humans
making accountable decisions. Do not let a tier C item look solved because a tier B task
next to it is done.

### Tier A — engineering, free, no accounts needed

| #   | Blocker                                             | Notes                                                                                                                                  |
| --- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | 28 E2E failures                                     | Triaged in §5. Three categories, treat them differently.                                                                               |
| A2  | 11 high dependency advisories                       | `pnpm audit --audit-level high`. Mostly transitive via `vinext` → `image-size`. Upgrade; do **not** lower the threshold.               |
| A3  | Cloudflare "Workers Builds" check fails on every PR | Configured against the Worker's **production** environment. Investigate in the Cloudflare dashboard; a PR should not build production. |
| A4  | Dead code: `IntentChooser`                          | Imported only for `IntentSwitch`/`parseIntent`; the component itself is never rendered. Delete it or render it deliberately.           |

### Tier B — infrastructure, all available on free tiers

Free-tier limits change. **Verify current limits before relying on any number here.**

| #   | Need                   | Free option                                                             | Limit at time of writing         | Gate    |
| --- | ---------------------- | ----------------------------------------------------------------------- | -------------------------------- | ------- |
| B1  | Web + API runtime      | Cloudflare Workers                                                      | 100k requests/day                | preview |
| B2  | Relational DB          | **Neon** free tier, EU region                                           | ~0.5 GB                          | S2      |
| B3  | Edge DB                | Cloudflare D1                                                           | 5 GB                             | preview |
| B4  | Object storage         | Cloudflare R2                                                           | 10 GB, no egress fees            | S3      |
| B5  | Identity               | **Clerk** free tier                                                     | ~10,000 MAU                      | S1      |
| B6  | Redis                  | Upstash free tier                                                       | small daily command cap          | —       |
| B7  | Error tracking         | Sentry free tier                                                        | ~5k errors/month                 | —       |
| B8  | CI                     | GitHub Actions                                                          | free on public repos             | —       |
| B9  | Durable workflows      | Temporal **self-hosted** (already in `infra/docker/docker-compose.yml`) | free, you run it                 | —       |
| B10 | Preview access control | Cloudflare Access                                                       | free for a small number of users | preview |

Neon in an EU region is the right choice because ADR 0007 already names it and the data
map assumes EU residency.

**Two things have no honest free answer. Say so rather than improvising:**

- **KMS (B11, gate S2/S3).** There is no real free managed KMS. AWS KMS is about
  $1/key/month; Google Cloud KMS about $0.06/key/month plus operations. For a _synthetic_
  preview you may hold `FIELD_ENCRYPTION_KEY` as a Wrangler secret — but that is **not**
  KMS, does not satisfy S2, and must never hold a key that protects real personal data.
  Label it as such wherever you configure it.
- **Malware scanning (B12, gate S3).** ClamAV is free and open source but cannot run on
  Workers; it needs a container or VM (Oracle Cloud Always Free and Fly.io's free
  allowance are both plausible hosts). **Do not use VirusTotal's free tier for user
  documents** — free-tier submissions are shared with third parties, so scanning a
  migrant's passport or NID there would itself be the privacy breach you are trying to
  prevent.

### Tier C — human, legal and organisational. No free tier exists.

These are the real blockers to production. Every one needs a named, accountable person.

**Gate S1 (identity):** approved threat model; named security owner; approved
privacy/retention policy; decisions on identity recovery, SIM reuse and minors.

**Gate S2 (data):** named on-call owner; backup _and tested restore_ evidence;
production PostgreSQL integration evidence; previous-version migration evidence.

**Gate S3 (documents):** named document-security owner; data-residency approval;
upload/download/deletion/security drills; a real Gate S3 evidence record
(`SECURITY_GATE_S3_EVIDENCE_ID`).

**Gate S4 (corridor):** first-corridor dossier; legal source-use approval; named corridor
owner; independent route reviewer; **named Bangla reviewer**; real employer/recruiter/
institution evidence; a freshness and withdrawal process; human support, fraud and
complaint operations.

**Payments:** a licensed provider, an approved custody boundary, reconciliation, and a
dispute/refund process. Note that `PAYMENT_PROVIDER` is typed `z.enum(['mock'])` — real
payments are not merely unconfigured, they are _uncodeable_ without an explicit change.
That is the control working. Leave it.

**Corridor choice:** Bangladesh → Qatar (electrician) is only a _technical_ candidate
because the fixtures point there. Do not select it for that reason. Compare corridors on
lawful demand, harm and fraud profile, official-source access, employer quality, cost
clarity, post-arrival support, and Bangla reviewer availability. Canada Study is likewise
a fixture, not an approved recommendation.

---

## 5. Next TODOs, in order

### Step 1 — land the CI repair

PR #1 (`fix/ci-web-runtime` → `main`) fixes four defects that made every CI run fail:
committed formatting drift, an OpenAPI deadlock where no file state could satisfy both
`format:check` and the drift gate, the `next start` runtime mismatch, and a test fixture
that expired 12 hours after it was written. Review and merge it first — nothing else can
be verified while CI cannot report truthfully.

### Step 2 — triage the 28 E2E failures

They are **not** all stale tests. Three distinct categories:

**Stale, safe to rewrite (8).** `intent.spec.ts` asserts `.intent-card` and
`.compare-table`, which live in the never-rendered `IntentChooser`. Rewrite these to
assert the same §14.1 invariants — both paths described, choice lives in the URL, neither
path defaulted — against `.hero-choice-card` and `.intent-switch`.

**Changed copy (6).** e.g. `design.spec.ts:9` expects `বিদেশে পড়াশোনা`; the page renders
`উচ্চশিক্ষা` (`intent.intentStudy` in `packages/i18n/messages/bn.json`). Update the specs —
but any _further_ Bangla copy change needs a Bangla reviewer.

**Probably real defects — do NOT edit the assertions (14).**

- `design.spec.ts:38` — `.intent-switch-option` measures **below the 44px floor**.
- `worker-journey.spec.ts:18` — homepage no longer offers exactly seven primary actions
  (§15), then fails the 48px tap-target check.
- `worker-journey.spec.ts:97` — the §17 explicit-consent sign-in flow never reaches its
  phone field.

These are accessibility and consent commitments to low-literacy users. Fix the product.

To reproduce:

```bash
pnpm build
APP_ENV=test PORT=3011 node apps/api/dist/main.js &
cd apps/web && ./node_modules/.bin/wrangler dev --config dist/server/wrangler.json \
  --port 3010 --ip 127.0.0.1 --var API_BASE_URL:http://127.0.0.1:3011 &
WEB_BASE_URL=http://127.0.0.1:3010 npx playwright test
```

### Step 3 — dependency advisories

Upgrade until `pnpm audit --audit-level high` is clean. If something cannot be upgraded,
document why in `docs/security/` — do not weaken the gate.

### Step 4 — a synthetic preview deployment (free tier)

Only after steps 1–3. This is a **demo**, not production.

1. `pnpm build`
2. Deploy the generated Worker artefact — `apps/web/dist/server/wrangler.json` — never a
   Node server.
3. Use `workers.dev` or a dedicated preview subdomain. **Never a production domain.**
4. Create preview-only D1 and R2 resources. Do not reuse production resource names.
5. Keep `DOCUMENT_UPLOADS_ENABLED=false`, `PAYMENT_PROVIDER=mock`, synthetic seed only.
6. Put Cloudflare Access in front of it, and set `noindex`.
7. Label it visibly: **"ProbashPoth Engineering Preview — Synthetic Demo Data Only."**
8. Verify after deploy: `/`, `/bn`, `/en`, `/api/health`, the synthetic-data warning is
   visible, uploads are refused, payments are mock.
9. Record deployment URL, Worker version, bindings, timestamp, smoke results and the
   rollback command in a non-secret evidence file.

Never enter a real passport, NID, phone number, educational record, employment record or
migration case into this preview.

### Step 5 — production-readiness engineering that needs no credentials

Safe, useful work that does not require inventing evidence:

- JWT verifier interfaces plus negative tests
- an endpoint authorization / BOLA matrix
- session and device revocation
- account export and deletion request state machines
- a Postgres-backed integration test harness, and previous-version migration fixtures
- outbox retry and dead-letter mechanics
- structured log redaction
- a private document upload intent state machine with in-memory adapters
- malware scanner **contract** tests against a mock scanner
- a deterministic next-action graph
- the family permission matrix
- payment provider contract tests against mock providers
- outcome privacy and differencing tests

Keep every provider behind an interface. Keep real integrations off until credentials and
approvals exist.

---

## 6. How to verify you have not broken anything

```bash
pnpm format:check && pnpm lint && pnpm typecheck && pnpm build && pnpm test
pnpm seed
pnpm smoke:built
pnpm --filter @probash/api openapi && git diff --exit-code docs/api/openapi.json
pnpm release:gate S0            # must pass
pnpm release:gate S1            # must FAIL — if it passes, something is very wrong
git diff --check
```

`config/release-gates.json` must stay untouched unless a named human has actually
approved a gate. Automated approval of S1–S4 is never correct.

---

## 7. Honest status line

Use this wording, or something equally careful, whenever the state is described:

> The engineering baseline is real and tested. CI is being repaired. The platform runs on
> synthetic data only. No release gate above S0 is approved, no payment provider is
> connected, document uploads are disabled, and nothing here has been reviewed by a
> lawyer, a security owner or a Bangla reviewer.

Do not describe a demo as production-ready, and do not describe a passing test suite as
an approval.
