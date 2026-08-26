-- Extensions used by the platform (§42.6). pgvector is intentionally NOT enabled here:
-- vector search must never sit on the authoritative eligibility/verification path.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gin;
