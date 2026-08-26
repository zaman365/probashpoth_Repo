-- Run as the Neon database owner after replacing the role names through the
-- approved secret/provisioning workflow. Passwords are never embedded here.

REVOKE CREATE ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC;

-- Migration role owns DDL and is not used by application traffic.
-- Runtime receives only the user-facing tables; RLS still applies independently.
GRANT USAGE ON SCHEMA public TO bdos_app_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON
  user_profiles, journeys, journey_tasks, journey_records, saved_opportunities,
  documents, ledger_entries, verification_requests, delegations, alerts,
  support_tickets, partner_submissions, outcome_reports
TO bdos_app_runtime;
GRANT SELECT, INSERT ON audit_events TO bdos_app_runtime;
GRANT SELECT, INSERT, UPDATE ON app_user, identity_link TO bdos_app_runtime;
GRANT SELECT, INSERT ON identity_link_event, identity_webhook_event TO bdos_app_runtime;
GRANT SELECT, INSERT, UPDATE ON
  document, document_upload_intent, document_scan_job, document_event, outbox_event
TO bdos_app_runtime;

-- Scanner has no profile, journey, payment or organization grants. It requires
-- BYPASSRLS only for document rows because the job contains an opaque id and the
-- scanner has no end-user session context.
GRANT USAGE ON SCHEMA public TO bdos_document_scanner;
GRANT SELECT, UPDATE ON document_scan_job, document_upload_intent, document TO bdos_document_scanner;
GRANT SELECT, UPDATE ON documents TO bdos_document_scanner;
GRANT INSERT ON document_event TO bdos_document_scanner;
GRANT SELECT, UPDATE ON outbox_event TO bdos_document_scanner;
ALTER ROLE bdos_document_scanner BYPASSRLS;

-- Read-only support gets no user tables by default. Approved support views with
-- masking and audited break-glass access are granted separately after Gate S2.
GRANT USAGE ON SCHEMA public TO bdos_support_readonly;

ALTER DEFAULT PRIVILEGES FOR ROLE bdos_migration IN SCHEMA public
  REVOKE ALL ON TABLES FROM PUBLIC;
