# Unified mobility data-model changes

This release is additive. Existing Work, Study, Passport, case, document, provider,
payment and outcome records remain authoritative; unified records compose them.

## Shared concepts

- `MobilityGoal`: Work, Study, Training or Explore.
- `MobilityLifecycleStage`: Discover through Return/Next Move.
- `CoverageMaturity`: Research Only through Transaction Supported. Synthetic routes
  default to `RESEARCH_ONLY` and are never promoted by inference.
- `BangladeshAccessibility`: an explicit vacancy/pathway access statement; public
  availability is not treated as access for Bangladeshis.
- `RouteCoverage`: capability booleans, launch checklist, owner and freshness evidence.
- `OfficialAction` and `OfficialActionCompletion`: external authority action plus a
  provenance-labelled local handoff/user confirmation.
- `UniversalDeadline`, `SavedItem`, `TransparentCostItem`, `PrivacySafeNotification`.
- `SubmissionSnapshot` and `ApplicationQaReview`: applicant-owned, append-only evidence
  for deterministic submission readiness.
- `MobilityRoiAssessment`: assumptions, ranges, debt stress, source IDs and confidence.
- Case participants, approvals, events and risk flags are typed extension records.

P1/P2 entities (`AdvisorProfile`, `AdvisorSession`, `ServiceOffer`, learning and
arrival plans, journey stories, intelligence updates, playbook completion, assisted
sessions, return plans and connectors) use a discriminated lifecycle-resource store.
They are typed foundations, not claims that an operating network is live.

## Existing model extensions

- Sources: trust tier, status, jurisdiction, language and effective range.
- Routes: coverage maturity, nationality scope, Bangladesh accessibility, official
  actions and coverage owner.
- Jobs: Bangladesh accessibility plus a plain-language reason.
- Documents: issuer, jurisdiction/language/translation/version/cases-used metadata and
  expanded mobility document types.
- Cases: goal, lifecycle stage, opportunity/provider, progress, blocker, next action,
  target and actual departure/arrival.
- Delegations: explicit permissions for document, draft, approval and message access.

## Persistence

Migration `0010_unified_mobility_core.sql` creates normalized route coverage,
official-action/completion, universal-deadline, immutable submission-snapshot and
immutable QA-review tables. User-owned tables have row-level security. Snapshot and
review update/delete operations are blocked at the database layer.

The general PostgreSQL adapter also has encrypted namespaces for user/case-sensitive
unified records. Memory storage mirrors the port for tests. Rollback is operational:
disable flags and stop new writes first. The migration does not alter or delete old
records.

## Invariants

1. Published versions are not mutated in place.
2. Missing facts remain unknown.
3. Monetary values are integer minor units with one declared currency per calculation.
4. Application readiness is deterministic and applicant approval is mandatory.
5. Official status is never inferred from a handoff or user confirmation.
6. Sensitive records are owner-scoped, audited and excluded from public projections.
