# ADR 0010 — D1 to PostgreSQL cutover and rollback

- Status: Accepted, rehearsal pending
- Date: 2026-08-26

## Decision

Migrate through signed snapshot, deterministic transform, staging import and ownership/checksum
reconciliation. Shadow reads compare results but never serve shadow data. Cutover uses a short write
freeze, final delta, gate-controlled driver switch and scripted smoke tests. Avoid dual writes; when a
brief secondary projection is unavoidable, publish it from the authoritative PostgreSQL outbox.

D1 remains read-only for 14–30 days after cutover. Any identity mismatch, cross-tenant result,
reconciliation drift, missing audit event or unavailable rollback aborts the cutover.
