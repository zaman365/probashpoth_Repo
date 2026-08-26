# ADR 0007 — EU PostgreSQL and connection path

- Status: Accepted subject to benchmark evidence
- Date: 2026-08-26

## Decision

Neon PostgreSQL in an EU region is authoritative for product state. Hyperdrive is the default Worker
connection path if staging benchmarks show acceptable Bangladesh/EU latency and no harmful nested
pooling. Each handler creates and closes a client; environment bindings are never global I/O clients.

Migrations are explicit SQL. User-owned rows use RLS plus least-privilege grants. Migration, runtime,
scanner and support identities are separate. Production data never enters development branches.
Point-in-time recovery and an independent encrypted export are required before Gate S2.
