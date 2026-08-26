# D1 to PostgreSQL reconciliation tools

Export adapters must produce a temporary JSON snapshot shaped as `{ "tables": { table: rows },
"objects": [{ "key", "sha256", "ownerId" }] }`. Keep it outside the repository in an encrypted,
access-controlled working directory. `migration:inventory` replaces row data with deterministic count,
ownership and checksum evidence signed by `MIGRATION_SNAPSHOT_SIGNING_KEY`; only the inventory belongs
in the change record. `migration:reconcile` compares signed source and target inventories and fails on
any difference. Never put raw exports or the signing key in CI artifacts or git.
