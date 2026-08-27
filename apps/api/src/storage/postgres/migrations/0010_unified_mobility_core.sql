-- Additive foundation for the unified benchmark-strengthening programme.
-- Live connectors and high-stakes publication remain gated by review evidence.

BEGIN;

CREATE TABLE IF NOT EXISTS route_coverage_registry (
  route_version_ref TEXT PRIMARY KEY,
  country_code CHAR(2) NOT NULL,
  nationality_scope JSONB NOT NULL DEFAULT '["BD"]'::jsonb,
  maturity TEXT NOT NULL CHECK (maturity IN (
    'RESEARCH_ONLY','INFORMATION_VERIFIED','ELIGIBILITY_SUPPORTED',
    'JOURNEY_SUPPORTED','PARTNER_SUPPORTED','TRANSACTION_SUPPORTED'
  )),
  capabilities JSONB NOT NULL DEFAULT '{}'::jsonb,
  launch_checklist JSONB NOT NULL DEFAULT '{}'::jsonb,
  coverage_owner TEXT,
  source_last_verified_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS official_action (
  id TEXT PRIMARY KEY,
  country_code CHAR(2) NOT NULL,
  authority_json JSONB NOT NULL,
  action_type TEXT NOT NULL,
  title_json JSONB NOT NULL,
  description_json JSONB NOT NULL,
  official_url TEXT NOT NULL CHECK (official_url ~ '^https://'),
  official_app_deeplink TEXT,
  requires_account BOOLEAN NOT NULL,
  requires_in_person BOOLEAN NOT NULL,
  fee_type TEXT NOT NULL CHECK (fee_type IN ('OFFICIAL','FREE','VARIES','UNKNOWN')),
  official_fee_minor BIGINT,
  official_fee_currency CHAR(3),
  source_record_ref TEXT NOT NULL,
  last_verified_at TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN (
    'ACTIVE','TEMPORARILY_UNAVAILABLE','RETIRED','NEEDS_REVIEW'
  )),
  preparation_requirement_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  legal_review_required BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((official_fee_minor IS NULL) = (official_fee_currency IS NULL))
);

CREATE TABLE IF NOT EXISTS official_action_completion (
  id UUID PRIMARY KEY,
  action_id TEXT NOT NULL REFERENCES official_action (id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES app_user (id) ON DELETE RESTRICT,
  case_id UUID REFERENCES mobility_case (id) ON DELETE RESTRICT,
  status TEXT NOT NULL CHECK (status IN (
    'NOT_STARTED','HANDED_OFF','USER_CONFIRMED_COMPLETE','AUTHORIZED_SYNC_COMPLETE'
  )),
  status_provenance TEXT NOT NULL CHECK (status_provenance IN (
    'USER_CONFIRMED','AUTHORIZED_CONNECTOR','NONE'
  )),
  authorized_external_reference TEXT,
  handed_off_at TIMESTAMPTZ,
  user_confirmed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS official_action_completion_user_idx
  ON official_action_completion (user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS universal_deadline (
  id UUID PRIMARY KEY,
  owner_user_id UUID REFERENCES app_user (id) ON DELETE RESTRICT,
  case_id UUID REFERENCES mobility_case (id) ON DELETE RESTRICT,
  opportunity_ref TEXT,
  entity_type TEXT NOT NULL,
  entity_ref TEXT NOT NULL,
  deadline_kind TEXT NOT NULL,
  title_json JSONB NOT NULL,
  due_at TIMESTAMPTZ NOT NULL,
  timezone TEXT NOT NULL,
  hardness TEXT NOT NULL CHECK (hardness IN ('HARD','SOFT')),
  reminder_offsets_minutes JSONB NOT NULL DEFAULT '[]'::jsonb,
  source_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  changed_from_deadline_id UUID REFERENCES universal_deadline (id) ON DELETE RESTRICT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS universal_deadline_owner_due_idx
  ON universal_deadline (owner_user_id, due_at) WHERE completed_at IS NULL;

CREATE TABLE IF NOT EXISTS application_submission_snapshot (
  id UUID PRIMARY KEY,
  application_ref TEXT NOT NULL,
  applicant_user_id UUID NOT NULL REFERENCES app_user (id) ON DELETE RESTRICT,
  profile_version INT NOT NULL CHECK (profile_version > 0),
  document_ids JSONB NOT NULL,
  application_payload_hash CHAR(64) NOT NULL,
  rendered_summary_json JSONB NOT NULL,
  cost_disclosure_ids JSONB NOT NULL,
  provider_verification_evidence_ids JSONB NOT NULL,
  assisted_by_user_id UUID REFERENCES app_user (id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at TIMESTAMPTZ,
  approved_by_user_id UUID REFERENCES app_user (id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS application_submission_snapshot_application_idx
  ON application_submission_snapshot (application_ref, created_at DESC);
CREATE RULE application_submission_snapshot_no_update AS
  ON UPDATE TO application_submission_snapshot DO INSTEAD NOTHING;
CREATE RULE application_submission_snapshot_no_delete AS
  ON DELETE TO application_submission_snapshot DO INSTEAD NOTHING;

CREATE TABLE IF NOT EXISTS application_qa_review (
  id UUID PRIMARY KEY,
  application_ref TEXT NOT NULL,
  owner_user_id UUID NOT NULL REFERENCES app_user (id) ON DELETE RESTRICT,
  snapshot_id UUID NOT NULL REFERENCES application_submission_snapshot (id) ON DELETE RESTRICT,
  result_json JSONB NOT NULL,
  reviewed_by_user_id UUID REFERENCES app_user (id) ON DELETE RESTRICT,
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE RULE application_qa_review_no_update AS
  ON UPDATE TO application_qa_review DO INSTEAD NOTHING;
CREATE RULE application_qa_review_no_delete AS
  ON DELETE TO application_qa_review DO INSTEAD NOTHING;

ALTER TABLE official_action_completion ENABLE ROW LEVEL SECURITY;
ALTER TABLE universal_deadline ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_submission_snapshot ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_qa_review ENABLE ROW LEVEL SECURITY;

CREATE POLICY official_action_completion_owner ON official_action_completion
  USING (user_id = current_app_user_id()) WITH CHECK (user_id = current_app_user_id());
CREATE POLICY universal_deadline_owner ON universal_deadline
  USING (owner_user_id = current_app_user_id()) WITH CHECK (owner_user_id = current_app_user_id());
CREATE POLICY application_submission_snapshot_owner ON application_submission_snapshot
  USING (applicant_user_id = current_app_user_id())
  WITH CHECK (applicant_user_id = current_app_user_id());
CREATE POLICY application_qa_review_owner ON application_qa_review
  USING (owner_user_id = current_app_user_id()) WITH CHECK (owner_user_id = current_app_user_id());

INSERT INTO schema_migration (filename) VALUES ('0010_unified_mobility_core.sql')
ON CONFLICT (filename) DO NOTHING;

COMMIT;
