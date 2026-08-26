-- Higher Study OS: programme shortlist, applications and consented outcomes.

BEGIN;

CREATE TABLE study_shortlist (
  id          UUID PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
  program_id  TEXT NOT NULL,
  category    TEXT NOT NULL CHECK (category IN ('dream','target','backup')),
  note_ciphertext BYTEA,
  created_at  TIMESTAMPTZ NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL,
  UNIQUE (user_id, program_id)
);
CREATE INDEX study_shortlist_user_idx ON study_shortlist (user_id, category, updated_at DESC);

CREATE TABLE study_application (
  id                         UUID PRIMARY KEY,
  user_id                    UUID NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
  program_id                 TEXT NOT NULL,
  institution_id             TEXT NOT NULL,
  case_id                    UUID NOT NULL REFERENCES mobility_case (id),
  intake                     TEXT NOT NULL,
  status                     TEXT NOT NULL CHECK (status IN (
    'draft','materials_preparing','submitted','institution_review','conditional_offer',
    'unconditional_offer','rejected','accepted','withdrawn'
  )),
  eligibility_at_submission  TEXT NOT NULL,
  submitted_at               TIMESTAMPTZ NOT NULL,
  updated_at                 TIMESTAMPTZ NOT NULL
);
CREATE INDEX study_application_user_status_idx
ON study_application (user_id, status, updated_at DESC);

CREATE TABLE study_outcome (
  id                          UUID PRIMARY KEY,
  user_id                     UUID NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
  application_id              UUID NOT NULL REFERENCES study_application (id),
  consent_given               BOOLEAN NOT NULL CHECK (consent_given = true),
  admission_obtained          BOOLEAN,
  scholarship_obtained        BOOLEAN,
  visa_obtained               BOOLEAN,
  enrolled                    BOOLEAN,
  graduated                   BOOLEAN,
  post_study_job_obtained     BOOLEAN,
  actual_tuition              JSONB,
  actual_monthly_living_cost  JSONB,
  post_study_salary           JSONB,
  visa_converted_to_work      BOOLEAN,
  notes_ciphertext            BYTEA,
  observed_at                 TIMESTAMPTZ NOT NULL,
  review_status               TEXT NOT NULL DEFAULT 'pending_human_review'
);
CREATE INDEX study_outcome_review_idx ON study_outcome (review_status, observed_at);

INSERT INTO schema_migration (filename) VALUES ('0005_study_os.sql')
ON CONFLICT (filename) DO NOTHING;

COMMIT;
