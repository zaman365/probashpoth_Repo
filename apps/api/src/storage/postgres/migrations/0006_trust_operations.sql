-- Shared complaint, human-review and two-person publication workflows.
-- Event tables are append-only by convention and permissions; no API exposes deletion.

BEGIN;

CREATE TABLE complaint_case (
  id                    UUID PRIMARY KEY,
  complainant_user_id   UUID NOT NULL REFERENCES app_user (id) ON DELETE RESTRICT,
  path                  TEXT NOT NULL CHECK (path IN ('work','study','shared')),
  category              TEXT NOT NULL,
  case_id               UUID REFERENCES mobility_case (id),
  organization_id       UUID REFERENCES organization (id),
  job_id                UUID REFERENCES job (id),
  program_id            TEXT,
  summary_ciphertext    BYTEA NOT NULL,
  evidence_document_ids UUID[] NOT NULL DEFAULT '{}',
  urgent_safety_risk    BOOLEAN NOT NULL DEFAULT false,
  status                TEXT NOT NULL,
  safety_state          TEXT NOT NULL CHECK (safety_state IN (
    'reported','reviewing','corroborated','verified','resolved','dismissed'
  )),
  priority              TEXT NOT NULL CHECK (priority IN ('normal','high','critical')),
  assigned_to_user_id   UUID REFERENCES app_user (id),
  created_at            TIMESTAMPTZ NOT NULL,
  updated_at            TIMESTAMPTZ NOT NULL
);
CREATE INDEX complaint_case_queue_idx ON complaint_case (status, priority, updated_at);
CREATE INDEX complaint_case_organization_idx ON complaint_case (organization_id, safety_state);

CREATE TABLE complaint_event (
  id                    UUID PRIMARY KEY,
  complaint_id          UUID NOT NULL REFERENCES complaint_case (id) ON DELETE RESTRICT,
  type                  TEXT NOT NULL,
  actor_user_id         UUID NOT NULL REFERENCES app_user (id) ON DELETE RESTRICT,
  note_ciphertext       BYTEA,
  evidence_document_ids UUID[] NOT NULL DEFAULT '{}',
  occurred_at           TIMESTAMPTZ NOT NULL
);
CREATE INDEX complaint_event_history_idx ON complaint_event (complaint_id, occurred_at);

CREATE TABLE human_review (
  id                    UUID PRIMARY KEY,
  requester_user_id     UUID NOT NULL REFERENCES app_user (id) ON DELETE RESTRICT,
  type                  TEXT NOT NULL,
  resource_type         TEXT NOT NULL,
  resource_id           TEXT NOT NULL,
  case_id               UUID REFERENCES mobility_case (id),
  question_ciphertext   BYTEA NOT NULL,
  evidence_document_ids UUID[] NOT NULL DEFAULT '{}',
  priority              TEXT NOT NULL,
  status                TEXT NOT NULL,
  assigned_to_user_id   UUID REFERENCES app_user (id),
  created_at            TIMESTAMPTZ NOT NULL,
  updated_at            TIMESTAMPTZ NOT NULL
);
CREATE INDEX human_review_queue_idx ON human_review (status, priority, created_at);

CREATE TABLE human_review_decision (
  id                    UUID PRIMARY KEY,
  review_id             UUID NOT NULL UNIQUE REFERENCES human_review (id) ON DELETE RESTRICT,
  reviewer_user_id      UUID NOT NULL REFERENCES app_user (id) ON DELETE RESTRICT,
  outcome               TEXT NOT NULL,
  explanation_ciphertext BYTEA NOT NULL,
  source_ids            TEXT[] NOT NULL DEFAULT '{}',
  evidence_document_ids UUID[] NOT NULL DEFAULT '{}',
  decided_at            TIMESTAMPTZ NOT NULL,
  changes_official_rule BOOLEAN NOT NULL DEFAULT false CHECK (changes_official_rule = false)
);

CREATE TABLE publication_change (
  id                   UUID PRIMARY KEY,
  resource_type        TEXT NOT NULL,
  resource_id          TEXT NOT NULL,
  summary              TEXT NOT NULL,
  source_ids           TEXT[] NOT NULL,
  risk_level           TEXT NOT NULL CHECK (risk_level IN ('low','medium','high')),
  created_by_user_id   UUID NOT NULL REFERENCES app_user (id) ON DELETE RESTRICT,
  status               TEXT NOT NULL CHECK (status IN ('draft','in_review','approved','rejected')),
  submitted_at         TIMESTAMPTZ,
  reviewed_at          TIMESTAMPTZ,
  reviewed_by_user_id  UUID REFERENCES app_user (id) ON DELETE RESTRICT,
  review_note          TEXT,
  created_at           TIMESTAMPTZ NOT NULL,
  CHECK (reviewed_by_user_id IS NULL OR reviewed_by_user_id != created_by_user_id)
);
CREATE INDEX publication_change_queue_idx ON publication_change (status, risk_level, created_at);

INSERT INTO schema_migration (filename) VALUES ('0006_trust_operations.sql')
ON CONFLICT (filename) DO NOTHING;

COMMIT;
