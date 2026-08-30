# ADR 0012 — Cloudflare Workers is the supported apps/web runtime

- Status: Accepted
- Date: 2026-08-30

## Context

`apps/web` is built by `vinext build`, which emits a Cloudflare Workers bundle to
`apps/web/dist/` together with a generated `dist/server/wrangler.json`. It does not
produce a `.next` directory.

CI nevertheless started the web surface with `next start`. That command cannot serve
this build, for two independent reasons:

- there is no `.next` production build on a fresh checkout, so `next start` exits 1
  with `Could not find a production build in the '.next' directory`;
- even with a `.next` directory present, the bundle imports `cloudflare:` scheme
  modules, which Node's ESM loader rejects (`ERR_UNSUPPORTED_ESM_URL_SCHEME`). A Node
  server boots and then answers HTTP 500 on every route.

The second failure is the more dangerous one, because a stale local `.next` from an
earlier `build:next` lets `next start` appear to work on a developer machine while the
same command fails in CI.

## Decision

The Workers runtime is the only supported runtime for the `apps/web` production build.
Anything that serves the built web artefact — CI, smoke tests, preview deployments —
runs it through Wrangler against the generated `dist/server/wrangler.json`, never
through a Node server.

`next start` and `build:next` remain available for local Next-specific debugging only.
They are not a deployment path and must not be reintroduced into CI.

Bindings run in Wrangler's local mode for CI and smoke runs, so no Cloudflare account,
credential or network call is involved and no production resource is touched.

## Consequences

- `pnpm smoke:built` (`scripts/smoke-built.mjs`) starts the built API and the built
  Worker and asserts `/api/v1/health` is 200 and `/bn` is 200 containing Bangla text.
  It runs in CI, so a packaging or runtime regression fails the PR rather than
  surfacing after a deploy.
- Verifying the Bangla page against the real artefact keeps the Bangla-first promise
  (ADR 0002) a runtime assertion rather than a claim about source.
- Changing the web runtime again requires a new ADR.

## Alternatives considered

- **Serve the build with `vinext start` under Node.** Verified on 2026-08-30: the
  server boots and returns HTTP 500 for `/bn` with `ERR_UNSUPPORTED_ESM_URL_SCHEME`.
  Rejected because it does not work.
- **Build with `next build` so `next start` can serve it.** Rejected: it abandons the
  Workers deployment target the hostname and storage boundaries assume (ADR 0011,
  ADR 0008) and would mean CI tests an artefact that is never deployed.
- **Drop the built-artefact check and rely on unit and E2E tests.** Rejected: unit
  tests exercise source, and the E2E job was itself the surface that had been failing
  for a packaging reason no source-level test could see.
