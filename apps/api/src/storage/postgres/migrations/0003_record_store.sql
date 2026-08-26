-- Transitional PostgreSQL repository backing for every typed Storage collection.
-- The normalized tables remain the reporting/integration model; this store preserves
-- the exact versioned application record shape while individual repositories mature.

BEGIN;

CREATE TABLE app_record_store (
  namespace   TEXT NOT NULL,
  id          TEXT NOT NULL,
  payload     JSONB NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (namespace, id)
);
CREATE INDEX app_record_store_namespace_updated_idx
ON app_record_store (namespace, updated_at DESC);

INSERT INTO schema_migration (filename) VALUES ('0003_record_store.sql')
ON CONFLICT (filename) DO NOTHING;

COMMIT;
