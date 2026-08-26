-- PostgreSQL equivalents of the current account workspace records. These keep
-- the established application contract while D1 is retired as a source of truth.

BEGIN;

CREATE TABLE user_profiles (
  user_id UUID PRIMARY KEY REFERENCES app_user (id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  locale TEXT NOT NULL,
  active_path TEXT NOT NULL CHECK (active_path IN ('work','study','both','unsure')),
  enabled_paths JSONB NOT NULL DEFAULT '["work","study"]'::jsonb,
  journey_stage TEXT NOT NULL DEFAULT 'exploring',
  goal_title TEXT,
  onboarding_completed_at TIMESTAMPTZ,
  passport_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE journeys (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
  path TEXT NOT NULL CHECK (path IN ('work','study')),
  target_type TEXT NOT NULL,
  target_id TEXT,
  title TEXT NOT NULL,
  destination_country TEXT,
  stage TEXT NOT NULL,
  status TEXT NOT NULL,
  details_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX journeys_user_status_idx ON journeys (user_id, status);
CREATE INDEX journeys_user_path_idx ON journeys (user_id, path);

CREATE TABLE journey_tasks (
  id UUID PRIMARY KEY,
  journey_id UUID NOT NULL REFERENCES journeys (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
  task_key TEXT NOT NULL,
  title_bn TEXT NOT NULL,
  title_en TEXT NOT NULL,
  detail_bn TEXT NOT NULL,
  detail_en TEXT NOT NULL,
  status TEXT NOT NULL,
  position INT NOT NULL,
  due_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  UNIQUE (journey_id, task_key)
);
CREATE INDEX journey_tasks_user_status_idx ON journey_tasks (user_id, status);

CREATE TABLE journey_records (
  id UUID PRIMARY KEY,
  journey_id UUID NOT NULL REFERENCES journeys (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
  record_type TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL,
  notes TEXT,
  due_at TIMESTAMPTZ,
  amount_minor BIGINT,
  currency CHAR(3),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX journey_records_user_due_idx ON journey_records (user_id, due_at);

CREATE TABLE saved_opportunities (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
  path TEXT NOT NULL CHECK (path IN ('work','study')),
  opportunity_type TEXT NOT NULL,
  opportunity_id TEXT NOT NULL,
  title TEXT NOT NULL,
  details_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL,
  UNIQUE (user_id, opportunity_type, opportunity_id)
);

-- `documents` is transition metadata for the current workspace UI. Sensitive
-- production files use the normalized `document` table from 0001/0008.
CREATE TABLE documents (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
  journey_id UUID REFERENCES journeys (id) ON DELETE SET NULL,
  category TEXT NOT NULL,
  label TEXT NOT NULL,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  object_key TEXT NOT NULL UNIQUE,
  verification_status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE ledger_entries (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
  journey_id UUID REFERENCES journeys (id) ON DELETE SET NULL,
  entry_type TEXT NOT NULL,
  label TEXT NOT NULL,
  amount_minor BIGINT NOT NULL,
  currency CHAR(3) NOT NULL,
  payee TEXT,
  status TEXT NOT NULL,
  legal_basis TEXT,
  receipt_document_id UUID,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE verification_requests (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  subject TEXT NOT NULL,
  evidence TEXT,
  status TEXT NOT NULL,
  result_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE delegations (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
  journey_id UUID REFERENCES journeys (id) ON DELETE SET NULL,
  delegate_contact TEXT NOT NULL,
  relationship TEXT NOT NULL,
  permissions_json JSONB NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ
);

CREATE TABLE alerts (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
  journey_id UUID REFERENCES journeys (id) ON DELETE SET NULL,
  alert_type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  severity TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE support_tickets (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
  journey_id UUID REFERENCES journeys (id) ON DELETE SET NULL,
  priority TEXT NOT NULL,
  category TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE partner_submissions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
  portal_type TEXT NOT NULL,
  organization_name TEXT NOT NULL,
  country_code TEXT,
  submission_type TEXT NOT NULL,
  title TEXT NOT NULL,
  evidence TEXT NOT NULL,
  fee_declaration TEXT,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE outcome_reports (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
  journey_id UUID NOT NULL REFERENCES journeys (id) ON DELETE CASCADE,
  path TEXT NOT NULL CHECK (path IN ('work','study')),
  reached_destination SMALLINT NOT NULL CHECK (reached_destination IN (0,1)),
  primary_outcome TEXT NOT NULL,
  promise_matched TEXT NOT NULL,
  cost_matched TEXT NOT NULL,
  actual_cost_minor BIGINT,
  currency CHAR(3),
  notes TEXT,
  consent_given SMALLINT NOT NULL CHECK (consent_given = 1),
  review_status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE audit_events (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES app_user (id) ON DELETE RESTRICT,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  details_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL
);
CREATE RULE audit_events_no_update AS ON UPDATE TO audit_events DO INSTEAD NOTHING;
CREATE RULE audit_events_no_delete AS ON DELETE TO audit_events DO INSTEAD NOTHING;

DO $rls$
DECLARE table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'user_profiles','journeys','journey_tasks','journey_records','saved_opportunities',
    'documents','ledger_entries','verification_requests','delegations','alerts',
    'support_tickets','partner_submissions','outcome_reports','audit_events'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format(
      'CREATE POLICY %I ON %I USING (user_id = current_app_user_id()) WITH CHECK (user_id = current_app_user_id())',
      table_name || '_owner', table_name
    );
  END LOOP;
END
$rls$;

INSERT INTO schema_migration (filename) VALUES ('0009_workspace_state.sql')
ON CONFLICT (filename) DO NOTHING;

COMMIT;
