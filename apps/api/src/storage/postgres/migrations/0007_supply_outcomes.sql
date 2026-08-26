-- Supply portals and privacy-preserving outcome intelligence (blueprint P3/P5).
-- Runtime collections use the encrypted record store while these indexes make the
-- durable ownership and review boundaries explicit for the normalized migration path.

CREATE INDEX IF NOT EXISTS app_record_store_partner_submission_idx
  ON app_record_store ((payload ->> 'organizationId'))
  WHERE namespace = 'partner_submission';

CREATE INDEX IF NOT EXISTS app_record_store_partner_access_idx
  ON app_record_store ((payload ->> 'organizationId'), (payload ->> 'applicationId'))
  WHERE namespace = 'partner_access_grant';

CREATE INDEX IF NOT EXISTS app_record_store_outcome_review_idx
  ON app_record_store ((payload ->> 'path'), (payload ->> 'outcomeId'))
  WHERE namespace = 'outcome_review';
