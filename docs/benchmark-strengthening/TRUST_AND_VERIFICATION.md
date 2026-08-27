# Trust and verification model

Probashjatra reports evidence, provenance and freshness; it does not issue government
approval, guarantee migration outcomes or make conclusive fraud findings.

## Evidence ladder

1. Tier 1 — official authority.
2. Tier 2 — regulator or public body.
3. Tier 3 — institution or employer.
4. Tier 4 — verified partner evidence.
5. Tier 5 — secondary reference.

Every high-stakes projection should include source identity, authority, last review,
status and confidence. `STALE`, `UNAVAILABLE` and `REVIEW_REQUIRED` are visible states,
not silently substituted by older or secondary claims.

## Verification outputs

- Route maturity says what the platform can support, not how attractive a route is.
- Bangladesh accessibility is separate from opportunity availability.
- Agency checks return matched evidence and uncertainty, never a raw public risk score.
- Fee checks separate official, provider, optional and unexplained amounts.
- Offer/contract checks report extracted facts, unverified claims, mismatches and
  potential issues. `conclusiveFraudFinding` is always false.
- Application QA is a deterministic checklist. It cannot make a visa/admission/job
  decision and cannot submit without the applicant's explicit approval.
- Copilot answers are a deterministic grounded shell with sources, official actions,
  confidence and escalation. It has no state-changing authority.

## Safety controls

Risk signals are evidence-linked and reviewed. Applicants see concrete warnings and
next actions. Organisation sanctions/publication changes use independent review.
Financial output is informational, range-based and assumption-visible. Synthetic
records are labelled and blocked in production.

The public Trust Center is backed by `GET /api/v1/trust-center`; operational freshness
requires a research/compliance/admin role and recent MFA at
`GET /api/v1/me/freshness-dashboard`.
