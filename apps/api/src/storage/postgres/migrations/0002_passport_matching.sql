-- Migration Passport, independent Work/Study profiles, explainable matching and alerts.
-- All mutable profile rows are versioned. Sensitive fact values have a ciphertext path.

BEGIN;

CREATE TABLE migration_passport (
  id                UUID PRIMARY KEY,
  user_id           UUID NOT NULL UNIQUE REFERENCES app_user (id) ON DELETE CASCADE,
  version           INT NOT NULL CHECK (version > 0),
  identity          JSONB NOT NULL DEFAULT '{}'::jsonb,
  financial         JSONB NOT NULL DEFAULT '{}'::jsonb,
  preferences       JSONB NOT NULL DEFAULT '{}'::jsonb,
  document_ids      UUID[] NOT NULL DEFAULT '{}',
  consent_ids       UUID[] NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE passport_fact (
  id                  UUID PRIMARY KEY,
  passport_id         UUID NOT NULL REFERENCES migration_passport (id) ON DELETE CASCADE,
  fact_key            TEXT NOT NULL,
  sensitivity         TEXT NOT NULL CHECK (sensitivity IN ('public','personal','sensitive')),
  value_json          JSONB,
  value_ciphertext    BYTEA,
  verification_state  TEXT NOT NULL DEFAULT 'unverified',
  source_document_ids UUID[] NOT NULL DEFAULT '{}',
  supplied_by_user_id UUID REFERENCES app_user (id),
  valid_from          TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_to            TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (
    (sensitivity = 'sensitive' AND value_ciphertext IS NOT NULL AND value_json IS NULL)
    OR (sensitivity != 'sensitive' AND value_json IS NOT NULL AND value_ciphertext IS NULL)
  )
);
CREATE INDEX passport_fact_active_idx
ON passport_fact (passport_id, fact_key)
WHERE valid_to IS NULL;

CREATE TABLE work_profile (
  id                       UUID PRIMARY KEY,
  user_id                  UUID NOT NULL UNIQUE REFERENCES app_user (id) ON DELETE CASCADE,
  version                  INT NOT NULL CHECK (version > 0),
  current_occupation_key   TEXT,
  target_occupation_keys   TEXT[] NOT NULL DEFAULT '{}',
  total_experience_months  INT,
  employment_history       JSONB NOT NULL DEFAULT '[]'::jsonb,
  technical_skills         TEXT[] NOT NULL DEFAULT '{}',
  credentials              JSONB NOT NULL DEFAULT '[]'::jsonb,
  portfolio_urls           TEXT[] NOT NULL DEFAULT '{}',
  cv_document_id           UUID,
  medically_fit            BOOLEAN,
  police_clearance_ready   BOOLEAN,
  bmet_registration_ready  BOOLEAN,
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE academic_profile (
  id                          UUID PRIMARY KEY,
  user_id                     UUID NOT NULL UNIQUE REFERENCES app_user (id) ON DELETE CASCADE,
  version                     INT NOT NULL CHECK (version > 0),
  target_level                TEXT,
  target_fields               TEXT[] NOT NULL DEFAULT '{}',
  education                   JSONB NOT NULL DEFAULT '[]'::jsonb,
  transcript_courses          JSONB NOT NULL DEFAULT '[]'::jsonb,
  language_evidence           JSONB NOT NULL DEFAULT '[]'::jsonb,
  academic_gaps               JSONB NOT NULL DEFAULT '[]'::jsonb,
  research_interests          TEXT[] NOT NULL DEFAULT '{}',
  publications                TEXT[] NOT NULL DEFAULT '{}',
  portfolio_urls              TEXT[] NOT NULL DEFAULT '{}',
  academic_cv_document_id     UUID,
  statement_document_id       UUID,
  recommendation_document_ids UUID[] NOT NULL DEFAULT '{}',
  research_proposal_document_id UUID,
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE readiness_assessment (
  id                         UUID PRIMARY KEY,
  user_id                    UUID NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
  path                       TEXT NOT NULL CHECK (path IN ('work','study')),
  passport_version           INT NOT NULL,
  profile_version            INT NOT NULL,
  engine_version             TEXT NOT NULL,
  outcome                    TEXT NOT NULL,
  readiness_percent          INT NOT NULL CHECK (readiness_percent BETWEEN 0 AND 100),
  evidence_coverage_percent  INT NOT NULL CHECK (evidence_coverage_percent BETWEEN 0 AND 100),
  factors                    JSONB NOT NULL,
  source_ids                 TEXT[] NOT NULL DEFAULT '{}',
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX readiness_assessment_user_path_idx
ON readiness_assessment (user_id, path, created_at DESC);

CREATE TABLE preparation_task (
  id                    UUID PRIMARY KEY,
  user_id               UUID NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
  assessment_id         UUID NOT NULL REFERENCES readiness_assessment (id) ON DELETE CASCADE,
  path                  TEXT NOT NULL CHECK (path IN ('work','study')),
  dimension             TEXT NOT NULL,
  state                 TEXT NOT NULL CHECK (state IN ('missing','unknown')),
  priority              TEXT NOT NULL CHECK (priority IN ('now','next','confirm')),
  label_key             TEXT NOT NULL,
  action_key            TEXT NOT NULL,
  needs_route_evidence  BOOLEAN NOT NULL,
  source_ids            TEXT[] NOT NULL DEFAULT '{}',
  template_version      TEXT NOT NULL,
  status                TEXT NOT NULL CHECK (status IN ('open','in_progress','done','dismissed')),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at          TIMESTAMPTZ
);
CREATE INDEX preparation_task_open_idx
ON preparation_task (user_id, path, priority, created_at DESC)
WHERE status IN ('open','in_progress');

CREATE TABLE recommendation_set (
  id                UUID PRIMARY KEY,
  user_id           UUID NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
  passport_version  INT NOT NULL,
  engine_version    TEXT NOT NULL,
  work_matches      JSONB NOT NULL DEFAULT '[]'::jsonb,
  study_matches     JSONB NOT NULL DEFAULT '[]'::jsonb,
  comparison        JSONB NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX recommendation_set_user_idx
ON recommendation_set (user_id, created_at DESC);

CREATE TABLE alert_subscription (
  id             UUID PRIMARY KEY,
  user_id        UUID NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
  path           TEXT NOT NULL CHECK (path IN ('work','study','both')),
  country_codes  CHAR(2)[] NOT NULL DEFAULT '{}',
  candidate_ids  TEXT[] NOT NULL DEFAULT '{}',
  event_types    TEXT[] NOT NULL DEFAULT '{}',
  channel        TEXT NOT NULL CHECK (channel IN ('in_app','sms','email')),
  active         BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX alert_subscription_active_idx
ON alert_subscription (user_id, path)
WHERE active = true;

INSERT INTO schema_migration (filename) VALUES ('0002_passport_matching.sql')
ON CONFLICT (filename) DO NOTHING;

COMMIT;
