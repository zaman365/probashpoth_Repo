-- Standalone production foundation: provider-independent identity, tenant RLS,
-- and the quarantine-first document state machine.

BEGIN;

ALTER TABLE app_user ALTER COLUMN phone_e164 DROP NOT NULL;
ALTER TABLE app_user ADD COLUMN IF NOT EXISTS primary_email TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS app_user_primary_email_idx
  ON app_user (lower(primary_email)) WHERE primary_email IS NOT NULL;

ALTER TABLE document ADD COLUMN IF NOT EXISTS original_filename TEXT;

CREATE TABLE IF NOT EXISTS identity_link (
  provider          TEXT NOT NULL CHECK (provider IN ('sites','clerk')),
  provider_subject  TEXT NOT NULL,
  app_user_id       UUID NOT NULL REFERENCES app_user (id) ON DELETE RESTRICT,
  verified_email    TEXT,
  verified_at       TIMESTAMPTZ NOT NULL,
  disabled_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (provider, provider_subject),
  UNIQUE (app_user_id, provider)
);
CREATE INDEX IF NOT EXISTS identity_link_user_idx ON identity_link (app_user_id);
CREATE INDEX IF NOT EXISTS identity_link_email_idx
  ON identity_link (lower(verified_email)) WHERE verified_email IS NOT NULL;

CREATE TABLE IF NOT EXISTS identity_link_event (
  id                UUID PRIMARY KEY,
  app_user_id       UUID NOT NULL REFERENCES app_user (id) ON DELETE RESTRICT,
  provider          TEXT NOT NULL,
  provider_subject  TEXT NOT NULL,
  event_type        TEXT NOT NULL,
  detail            JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS identity_link_event_user_idx
  ON identity_link_event (app_user_id, occurred_at DESC);
CREATE RULE identity_link_event_no_update AS
  ON UPDATE TO identity_link_event DO INSTEAD NOTHING;
CREATE RULE identity_link_event_no_delete AS
  ON DELETE TO identity_link_event DO INSTEAD NOTHING;

CREATE TABLE IF NOT EXISTS identity_webhook_event (
  event_id         TEXT PRIMARY KEY,
  event_type       TEXT NOT NULL,
  provider_subject TEXT,
  processed_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE RULE identity_webhook_event_no_update AS
  ON UPDATE TO identity_webhook_event DO INSTEAD NOTHING;
CREATE RULE identity_webhook_event_no_delete AS
  ON DELETE TO identity_webhook_event DO INSTEAD NOTHING;

CREATE TABLE IF NOT EXISTS identity_recovery_claim (
  id                    UUID PRIMARY KEY,
  provider              TEXT NOT NULL CHECK (provider = 'clerk'),
  provider_subject      TEXT NOT NULL,
  candidate_app_user_id UUID NOT NULL REFERENCES app_user (id) ON DELETE RESTRICT,
  token_hash            TEXT NOT NULL UNIQUE,
  status                TEXT NOT NULL CHECK (status IN (
    'requested','proof_sent','verified','approved','rejected','expired','consumed'
  )),
  expires_at            TIMESTAMPTZ NOT NULL,
  reviewed_by_user_id   UUID REFERENCES app_user (id) ON DELETE RESTRICT,
  requested_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_at            TIMESTAMPTZ,
  consumed_at           TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS identity_recovery_open_claim_idx
  ON identity_recovery_claim (provider, provider_subject)
  WHERE status IN ('requested','proof_sent','verified','approved');

CREATE TABLE IF NOT EXISTS document_upload_intent (
  id                   UUID PRIMARY KEY,
  owner_user_id        UUID NOT NULL REFERENCES app_user (id) ON DELETE RESTRICT,
  case_id              UUID REFERENCES mobility_case (id) ON DELETE RESTRICT,
  expected_content_type TEXT NOT NULL,
  maximum_bytes        BIGINT NOT NULL CHECK (maximum_bytes > 0),
  expected_sha256      TEXT,
  object_key           TEXT NOT NULL UNIQUE CHECK (object_key LIKE 'quarantine/%'),
  status               TEXT NOT NULL CHECK (status IN (
    'pending','uploaded','queued','consumed','expired','revoked'
  )),
  expires_at           TIMESTAMPTZ NOT NULL,
  consumed_at          TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS document_upload_intent_owner_idx
  ON document_upload_intent (owner_user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS document_event (
  id             UUID PRIMARY KEY,
  document_id    UUID REFERENCES document (id) ON DELETE RESTRICT,
  upload_intent_id UUID REFERENCES document_upload_intent (id) ON DELETE RESTRICT,
  owner_user_id  UUID NOT NULL REFERENCES app_user (id) ON DELETE RESTRICT,
  actor_user_id  UUID REFERENCES app_user (id) ON DELETE RESTRICT,
  event_type     TEXT NOT NULL CHECK (event_type IN (
    'intent.created','upload.completed','scan.queued','scan.clean','scan.rejected',
    'viewed','downloaded','shared','revoked','deleted'
  )),
  correlation_id TEXT NOT NULL,
  detail         JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS document_event_document_idx
  ON document_event (document_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS document_event_owner_idx
  ON document_event (owner_user_id, occurred_at DESC);
CREATE RULE document_event_no_update AS ON UPDATE TO document_event DO INSTEAD NOTHING;
CREATE RULE document_event_no_delete AS ON DELETE TO document_event DO INSTEAD NOTHING;

CREATE TABLE IF NOT EXISTS document_scan_job (
  id                UUID PRIMARY KEY,
  upload_intent_id  UUID NOT NULL UNIQUE REFERENCES document_upload_intent (id) ON DELETE RESTRICT,
  document_id       UUID NOT NULL UNIQUE REFERENCES document (id) ON DELETE RESTRICT,
  object_key        TEXT NOT NULL CHECK (object_key LIKE 'quarantine/%'),
  checksum_sha256   TEXT NOT NULL,
  state             TEXT NOT NULL CHECK (state IN ('pending','queued','processing','clean','rejected')),
  attempts          INT NOT NULL DEFAULT 0,
  correlation_id    TEXT NOT NULL,
  last_error_code   TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS document_scan_job_state_idx
  ON document_scan_job (state, updated_at);

-- A request handler sets this transaction-local value only after Clerk validation
-- and identity_link resolution. Missing context produces no rows, not broad access.
CREATE OR REPLACE FUNCTION current_app_user_id() RETURNS UUID
LANGUAGE SQL STABLE PARALLEL SAFE AS $$
  SELECT NULLIF(current_setting('app.current_user_id', true), '')::uuid
$$;

ALTER TABLE identity_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE mobility_case ENABLE ROW LEVEL SECURITY;
ALTER TABLE document ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_upload_intent ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_event ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_shortlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_application ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_outcome ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_application ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_offer_decision ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_outcome ENABLE ROW LEVEL SECURITY;

CREATE POLICY identity_profile_owner ON identity_profile
  USING (user_id = current_app_user_id()) WITH CHECK (user_id = current_app_user_id());
CREATE POLICY mobility_case_owner ON mobility_case
  USING (owner_user_id = current_app_user_id()) WITH CHECK (owner_user_id = current_app_user_id());
CREATE POLICY document_owner ON document
  USING (owner_user_id = current_app_user_id()) WITH CHECK (owner_user_id = current_app_user_id());
CREATE POLICY document_upload_intent_owner ON document_upload_intent
  USING (owner_user_id = current_app_user_id()) WITH CHECK (owner_user_id = current_app_user_id());
CREATE POLICY document_event_owner ON document_event
  USING (owner_user_id = current_app_user_id()) WITH CHECK (owner_user_id = current_app_user_id());
CREATE POLICY study_shortlist_owner ON study_shortlist
  USING (user_id = current_app_user_id()) WITH CHECK (user_id = current_app_user_id());
CREATE POLICY study_application_owner ON study_application
  USING (user_id = current_app_user_id()) WITH CHECK (user_id = current_app_user_id());
CREATE POLICY study_outcome_owner ON study_outcome
  USING (user_id = current_app_user_id()) WITH CHECK (user_id = current_app_user_id());
CREATE POLICY work_application_owner ON work_application
  USING (user_id = current_app_user_id()) WITH CHECK (user_id = current_app_user_id());
CREATE POLICY work_offer_decision_owner ON work_offer_decision
  USING (user_id = current_app_user_id()) WITH CHECK (user_id = current_app_user_id());
CREATE POLICY work_outcome_owner ON work_outcome
  USING (user_id = current_app_user_id()) WITH CHECK (user_id = current_app_user_id());

INSERT INTO schema_migration (filename) VALUES ('0008_identity_rls_documents.sql')
ON CONFLICT (filename) DO NOTHING;

COMMIT;
