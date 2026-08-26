# PostgreSQL storage driver

`STORAGE_DRIVER=postgres` is wired through `PostgresStorage` (ADR 0001, §83). The
migration runner applies explicit SQL migrations in filename order and records each
applied filename.

What exists today:

- `migrations/0001_init.sql` — explicit SQL DDL for the entity set the trust-rail
  slice uses (§45). Migrations are always explicit SQL; there are no silent
  auto-migrations (§83).
- `migrate.ts` — the migration runner entry point, backed by `pg`.

The typed collection port is backed by `app_record_store` JSONB records so every
current domain shape has durable semantics. The double-entry ledger is hydrated on
startup and flushed at the end of each confirmed payment or settlement operation. The
normalized SQL tables remain the integration and reporting model while individual
high-volume repositories move to specialized queries.

User-owned, financial, document, audit, outbox, and ledger records are stored as
AES-256-GCM authenticated envelopes. The required `FIELD_ENCRYPTION_KEY` is bound to
the collection namespace and record id as additional authenticated data, so moving or
altering ciphertext fails closed. Reference catalog records remain queryable JSONB.

`@probash/config` refuses `STORAGE_DRIVER=memory` outside development, so production
cannot silently degrade to process memory. PostgreSQL startup also fails unless both
`DATABASE_URL` and a 32-byte base64 `FIELD_ENCRYPTION_KEY` are configured.
