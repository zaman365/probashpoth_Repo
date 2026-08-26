# Standalone Cloudflare environment contract

The checked-in Wrangler files ending in `.example.jsonc` are reviewed resource contracts, not live
credentials and not deployable configurations. Provision development, staging and production
independently. Never reuse a binding ID, Clerk instance, Neon project, R2 bucket or queue across them.

## Required staging resources

- a standalone web Worker on `staging.bdos.io`;
- a Clerk non-production instance with an exact authorized-party and redirect allowlist;
- a synthetic-only Neon EU project plus application, migration, scanner and read-only roles;
- Hyperdrive benchmarked against Neon's pooled endpoint (choose one intentional pooling path);
- private EU-jurisdiction `quarantine` and `clean` R2 buckets with `r2.dev` disabled;
- document scan Queue and DLQ plus an isolated scanner service binding;
- request rate limits, Turnstile on abuse-prone anonymous forms, WAF rules and redacted logs.

## Provisioning status — 2026-08-26

- Created and verified `bdos-staging-document-scan` and
  `bdos-staging-document-scan-dlq`. They intentionally have no attached producer or consumer until
  the document Worker, private storage and scanner dependency pass their gates.
- R2 activation was approved and advanced to Cloudflare's secure billing form, but requires the
  account owner to enter a payment card and billing address. Do not create non-EU buckets as a
  workaround; after activation, create both staging buckets with `jurisdiction: "eu"`.
- Created a separate Clerk development application named `bdos.io Staging`; the existing Export HQ
  application was not changed. Cloudflare secret transfer and hostname allowlisting remain pending.
- Created the free Neon project `bdos-staging-eu` in AWS Europe Central 1 (Frankfurt). All nine SQL
  migrations were applied and verified; the current schema reports 25 RLS-enabled tables.
- Hyperdrive, least-privilege database login roles and the isolated scanner service remain
  unprovisioned.

Production additionally requires `pnpm release:gate S2`, or S3 for documents. Put Clerk secret/JWT
keys and webhook secrets into Worker secrets. Do not place them under `vars` or in this repository.

## Validation before route changes

Run `wrangler types`, `wrangler deploy --dry-run`, migration/RLS tests, Clerk authorized-party negative
tests, restore rehearsal, R2 jurisdiction/public-access inspection, queue/DLQ test and the production
cutover runbook. A successful static build is not a production gate.
