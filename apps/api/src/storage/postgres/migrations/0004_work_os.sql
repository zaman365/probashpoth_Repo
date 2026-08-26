-- Work Abroad OS: applications, explicit offer decisions and consented outcomes.
-- Records are append-oriented and keep unknown/high-risk conditions explicit.

BEGIN;

CREATE TABLE work_application (
  id                         UUID PRIMARY KEY,
  user_id                    UUID NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
  job_id                     UUID NOT NULL REFERENCES job (id),
  case_id                    UUID NOT NULL REFERENCES mobility_case (id),
  status                     TEXT NOT NULL CHECK (status IN (
    'draft','submitted','screening','interview','offer_received','accepted',
    'rejected','withdrawn'
  )),
  eligibility_at_submission  TEXT NOT NULL CHECK (eligibility_at_submission IN (
    'eligible','conditional','ineligible','unknown'
  )),
  submitted_at               TIMESTAMPTZ NOT NULL,
  updated_at                 TIMESTAMPTZ NOT NULL,
  rejection_reason           JSONB
);
CREATE INDEX work_application_user_status_idx
ON work_application (user_id, status, updated_at DESC);

CREATE TABLE work_offer_decision (
  id                       UUID PRIMARY KEY,
  application_id           UUID NOT NULL REFERENCES work_application (id),
  user_id                  UUID NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
  decision                 TEXT NOT NULL CHECK (decision IN ('accepted','declined')),
  unresolved_risk_ids      UUID[] NOT NULL DEFAULT '{}',
  acknowledged_risk_ids    UUID[] NOT NULL DEFAULT '{}',
  decided_at               TIMESTAMPTZ NOT NULL,
  CHECK (decision != 'accepted' OR unresolved_risk_ids <@ acknowledged_risk_ids)
);

CREATE TABLE work_outcome (
  id                         UUID PRIMARY KEY,
  user_id                    UUID NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
  case_id                    UUID NOT NULL REFERENCES mobility_case (id),
  job_id                     UUID REFERENCES job (id),
  consent_given              BOOLEAN NOT NULL CHECK (consent_given = true),
  departed                   BOOLEAN,
  arrived                    BOOLEAN,
  joined_expected_employer   BOOLEAN,
  occupation_matched         BOOLEAN,
  salary_matched             BOOLEAN,
  accommodation_matched      BOOLEAN,
  actual_monthly_salary      JSONB,
  actual_worker_cost         JSONB,
  unexpected_charge_minor_units NUMERIC(20,0),
  job_active_at_days         INT CHECK (job_active_at_days > 0),
  notes_ciphertext           BYTEA,
  observed_at                TIMESTAMPTZ NOT NULL,
  review_status              TEXT NOT NULL DEFAULT 'pending_human_review'
);
CREATE INDEX work_outcome_review_idx
ON work_outcome (review_status, observed_at);

INSERT INTO schema_migration (filename) VALUES ('0004_work_os.sql')
ON CONFLICT (filename) DO NOTHING;

COMMIT;
