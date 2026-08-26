# PostgreSQL storage driver

`STORAGE_DRIVER=postgres` is a **feature flag that is not yet wired** (ADR 0001, §83).

What exists today:

- `migrations/0001_init.sql` — explicit SQL DDL for the entity set the trust-rail
  slice uses (§45). Migrations are always explicit SQL; there are no silent
  auto-migrations (§83).
- `migrate.ts` — the migration runner entry point.

What is missing:

- repository implementations of the `Storage` port in `apps/api/src/storage/ports.ts`.

Until those land, selecting the driver fails at startup with a clear error rather
than silently degrading. `@probash/config` also refuses `STORAGE_DRIVER=memory`
outside development, so neither driver can be used in the wrong place.
