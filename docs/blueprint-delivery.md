# ProbasJatra master blueprint delivery matrix

This file translates the master product blueprint into verifiable code releases. A
feature is **complete** only when its domain rules, API contract, persistence shape,
user experience, tests, data-quality state, and operating owner all exist. A route or
programme being present in demo data never counts as a supported real pathway.

## Release sequence

| Release | Blueprint scope            | Engineering deliverable                                                                                                                                      | Evidence gate                                                                                           | Status                                              |
| ------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| R1      | §5–§7, §93–§99, §127–§129  | Shared Migration Passport, separate Work and academic profiles, explainable readiness, distinct matchers, versioned preparation tasks, alerts and comparison | Domain/API tests; unknown preserved; no generic winner                                                  | Engineering complete; evidence gate open            |
| R2      | §8–§13, §79–§85, §102–§110 | Country adapters, provenance publishing, trust graph, complaints, human review, provider directory, production security/storage adapters                     | PostgreSQL + object storage integration tests; two-person publication workflow; privacy/security review | Foundation complete; external integration gate open |
| R3      | §14–§38, §112, §120        | Complete Work Abroad OS from occupation discovery through arrival, rights and outcomes                                                                       | One human-reviewed corridor; real provider/job evidence; no synthetic records in production             | Core journey complete; corridor evidence gate open  |
| R4      | §39–§78, §113, §121        | Complete Higher Study OS from academic matching through post-study Work handoff                                                                              | One human-reviewed study country and institution/program set; verified programme rules                  | Core journey complete; programme evidence gate open |
| R5      | §86–§92, §122              | Employer, recruiter, institution and provider portals with marketplace governance                                                                            | Verified organisation demand and approved commercial/legal model                                        | Planned                                             |
| R6      | §123                       | Android-first mobile parity for Passport, Match, Verify, Cases, documents, payments, alerts and family access                                                | Low-bandwidth/device testing and accessibility review                                                   | Planned                                             |
| R7      | §124, §133–§136            | Outcome, promised-vs-actual, trust graph, aggregated cost intelligence and institutional analytics                                                           | 90/180-day outcome evidence; privacy-preserving aggregate thresholds                                    | Planned                                             |

## Non-code launch dependencies

The blueprint correctly includes work that cannot be manufactured in code. These are
release gates, not optional polish:

- named human reviewers for Bangla critical copy and every published legal/financial fact;
- verified official source snapshots and a monitored review cadence;
- employer, recruiter, institution and programme evidence;
- licensed payment and communications partners;
- legal approval for privacy, data retention, cross-border sharing and custody boundaries;
- malware-scanning, KMS and secure object-storage providers;
- customer-support and critical-safety operating teams.

The product must continue to label synthetic, unreviewed and unknown information until
these gates are satisfied.

## Implemented engineering evidence

- R1: authenticated shared Passport API, independent Work and academic profiles,
  deterministic readiness, gap tasks, separate transparent matchers, history and alerts.
- R2: real PostgreSQL migration runner, AES-256-GCM record envelopes, durable storage
  adapter, immutable complaint events, MFA human decisions, two-person publication
  approval and public service-directory facets.
- R3: Work discovery, source-backed eligibility, evidence-only CV, verified-job
  application/case creation, offer review and risk acknowledgement, arrival dashboard
  and consented outcome capture pending human review.
- R4: programme intelligence, shortlist/calendar, truthful statement review,
  application and student-route case, study outcomes and explicit Study-to-Work handoff.
- Web: a bilingual journey command centre, programme detail surfaces, service
  directory and clearer navigation across Work and Study.

The engineering status above is not a production-content claim. Synthetic records
remain clearly labelled, and missing programme rules, deadlines, scholarship data,
living costs and post-study conditions remain `unknown` rather than inferred.
