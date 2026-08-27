# Unified benchmark-strengthening implementation audit

Audit date: 2026-08-27
Specification: `Probashjatra_UNIFIED_Codex_Implementation_Guide.md`
Decision: extend the current product; do not replace its stack, brand, routes, or existing trust rail.

## 1. Existing architecture

Probashjatra is a TypeScript monorepo managed with pnpm and Turborepo.

- `apps/web`: Next.js App Router public site and authenticated applicant workspace, with Bangla and English routes. It also contains the current Cloudflare/D1 operational persistence path.
- `apps/api`: NestJS/Fastify API split into identity, catalogue, eligibility, passport, work, study, cases, documents, operations, supply, outcomes, payments, and scanner modules.
- `apps/mobile`: Android-first Expo Router client with offline cache/queue controls.
- `apps/ops-desktop`: Tauri operations-centre shell.
- `apps/document-worker`: isolated document-processing worker.
- `packages/domain`: framework-free mobility, source, verification, case, document, cost, consent, and matching primitives.
- `packages/contracts`: shared Zod API schemas and typed client.
- `packages/rules`: versioned three-valued eligibility DSL and decision traces.
- `packages/auth`: RBAC/ABAC permissions and masking/audit obligations.
- `packages/i18n`, `design-tokens`, `web-ui`, `analytics`, `config`, `ledger`, and `testing`: shared platform services.
- PostgreSQL is accessed through a typed storage port. Explicit SQL migrations create durable tables and a namespaced record store; memory storage supports tests/local development. Financial truth uses the shared double-entry ledger.
- Identity supports phone + OTP in the API. The web transition path supports the configured identity provider while preserving account-linking boundaries.
- Sensitive document upload is fail-closed behind identity, PostgreSQL, residency, quarantine, malware-scanning, audit, and approval gates.

There are currently two web/API data-access eras: the shared Nest API/storage port and a newer web-local Cloudflare/D1 workspace. This is an integration risk, so new shared domain concepts belong in `packages/` and the API; web projections must remain adapters rather than a third source of truth.

## 2. Existing features that match the unified guide

- Configurable Probashjatra identity; Bangla-first `bn`/`en` content and shared design tokens.
- Separate first-class Work Abroad and Higher Study discovery, profiles, applications, dashboards, outcomes, and Study-to-Work handoff.
- Phone-first OTP, explicit consent, session types, MFA markers, and account-scoped data access.
- Migration Passport, progressive profile, readiness assessments, preparation tasks, and explainable three-valued eligibility.
- Country/route catalogue, versioned regulatory rules, source citations, source freshness, and two-person publication review.
- Jobs, institutions, courses/programmes, scholarships, matching, shortlist, calendar, and evidence-only Work CV.
- Reusable document wallet, document shares, expiry metadata, access audit, scanning/risk signals, and conservative “potential issue” language.
- Mobility cases, tasks, milestones, costs, sandbox payment intents, receipts, immutable ledger entries, complaints, and human review.
- Provider organisations, licence evidence, verification facets, partner submissions, fee declarations, scoped candidate consent, and privacy-thresholded analytics.
- Agency/job verification foundations, offer scanner, public safety content, and complaint enforcement workflow.
- Applicant/family delegation with revocation and role-scoped permissions.
- Arrival state and outcome follow-ups in Work; pre-arrival/study tasks and post-study Work handoff.
- Analytics taxonomy with privacy guards; synthetic-data labelling and production blocking.

## 3. Gaps against the unified guide

### P0 gaps

- No explicit shared `MobilityGoal`, lifecycle-stage, coverage-maturity, route-coverage, or Bangladesh-accessibility models.
- No named QuickCheck contract that separates eligibility, fit, preparation gap, cost/time, and confidence before account creation.
- Existing sources lack the guide's trust-tier/status/effective-period fields; official actions and tracked handoffs do not exist.
- Existing cases need participants, events, deadlines, approvals, risk flags, responsibility/waiting-on metadata, and immutable submission snapshots.
- Application statuses and consent checks do not yet implement the complete QA gate.
- Cost infrastructure needs fee responsibility, official/provider/optional separation, ROI ranges, debt stress, assumptions, and confidence.
- Deadline/collection primitives are fragmented by Work/Study rather than universal.
- No explicit Trust Center methodology API/screen, coverage/data-freshness operations dashboard, fee checker, contract checker, or structured agency checker.
- Scholarship records need full eligibility/funding-gap/official-source metadata.
- No structured Visa Pathway OS, Departure Readiness plan, verified journey-story model, operational intelligence/update model, grounded Copilot response contract, or Smart Escalation result.
- Search aliases/transliterations and low-bandwidth/shared-device controls are not consistently exposed across every new route.
- Delegate permission names do not fully match the privacy-preserving unified permission matrix.

### P1 gaps

- Advisor profiles/specialisations, scoped sessions, notes, invoices, complaints, and Smart Escalation booking flow.
- Reusable service offers with public/free-first ordering and explicit inclusion/exclusion/refund/partner disclosures.
- Rich readiness-assessment types, journey micro-learning, arrival task packs/budget, moderated communities, Opportunity Days, partner sessions, and employer offer-to-case workflows.
- First-class finance, insurance, accommodation, recognition, relocation, and training comparison projections.
- Partner quality playbooks and expiring completion evidence.

### P2 gaps

- Audited assisted-centre sessions and centre performance controls.
- Return/reintegration journeys.
- Connector registry for authorized government/institution/employer/document-verification integrations.
- Advanced fraud-network and employer-mobility extension points.

External integrations, real provider supply, legal opinions, production AI/RAG, licensed payments, government status synchronization, and human-reviewed official data cannot be truthfully completed with repository code alone. The implementation must provide fail-closed adapters, review markers, flags, and operational gates without pretending those dependencies are live.

## 4. Entities to reuse

`RegulatorySource`, `RuleVersion`, `MobilityRouteVersion`, `Country`, `Occupation`, `Organization`, `OrganizationLicence`, `VerifiedJob`, `Institution`, `Course`, `MigrationPassport`, `ReadinessAssessment`, `RecommendationSet`, `CaseRecord`, `CaseTask`, `CaseMilestone`, `CostPlan`, `CostItem`, `Document`, `DocumentShare`, `Consent`, `Delegation`, `Complaint`, `HumanReview`, `PublicationChange`, `PartnerSubmission`, `PartnerFeeDeclaration`, `PartnerAccessGrant`, `WorkApplication`, `StudyApplication`, `AlertSubscription`, `WorkOutcome`, `StudyOutcome`, `OutcomeReview`, `AuditEvent`, and `OutboxEvent`.

## 5. Entities requiring extension

- Source: trust tier, jurisdiction, language, status, effective range, and content hash.
- Route: coverage maturity, nationality scope, support capabilities, coverage owner, accessibility, and official-action links.
- Organisation/provider: unified category/status mapping, verification expiry, relationship disclosures, risk signals, playbook completion.
- Job/programme/scholarship: availability, access state, provider relationship, complete fee/eligibility/source/expiry metadata.
- Case: lifecycle stage/status, blocker, next action, progress, opportunity/provider, target/actual departure/arrival.
- Application: full guide status state machine, QA checks, applicant approval, duplicate check, immutable snapshot.
- Cost: responsibility, charging party, official/mandatory/optional status, estimates/ranges, ROI assumptions and debt risk.
- Document: broader type taxonomy, issuer/country/language/translation/version/cases-used and verification evidence.
- Delegation: explicit permission matrix with messages and submission approval off by default.
- Notifications: unified category/priority/marketing preference and privacy-safe rendering.

## 6. New entities

`OfficialAction`, `OfficialActionCompletion`, `RouteCoverage`, `QuickCheckSession`, `SavedItem`, `UniversalDeadline`, `CaseParticipant`, `CaseEvent`, `CaseApproval`, `CaseRiskFlag`, `SubmissionSnapshot`, `ApplicationQaReview`, `MobilityRoiAssessment`, `DebtRiskAssessment`, `ProviderRiskSignal`, `VerificationEvidence`, `Scholarship`, `VisaPathway`, `DepartureReadinessPlan`, `JourneyStory`, `IntelligenceUpdate`, `CopilotAnswer`, `EscalationRequest`, `AdvisorProfile`, `AdvisorSession`, `ServiceOffer`, `ArrivalPlan`, `LearningModule`, `Community`, `CommunityPost`, `ModerationReport`, `OpportunityEvent`, `PartnerSession`, `PartnerPlaybookCompletion`, `AssistedCentre`, `AssistedSession`, `ReturnPlan`, and `IntegrationConnector`.

## 7. Routes/screens to add

Applicant/public:

- `/[locale]/quick-check`, `/opportunities`, `/pathways/[id]`, `/visa/[id]`
- `/trust`, `/safety/agency`, `/safety/offer`, `/safety/contract`, `/safety/fees`
- `/journey/[id]`, `/deadlines`, `/saved`, `/cost/roi`, `/departure`, `/arrival`
- `/funding`, `/intelligence`, `/stories`, `/learn`, `/advisors`, `/events`, `/community`
- privacy-safe `/account/sessions` and expanded `/family`

Operations/partner:

- coverage and freshness dashboards, provider verification/risk review, source/rule changes, official-action catalogue, complaints/moderation, advisors/services/events, playbooks, assisted centres, and connector readiness.

Existing URLs remain valid; new routes should reuse the current locale and workspace shells.

## 8. APIs/services to add

- QuickCheck and opportunity-explorer projections.
- Route coverage and official-action handoff/completion.
- Universal saved items and deadlines.
- Case command-centre projection, participant/approval/event/risk services.
- Application QA, applicant approval, assisted submission, and immutable snapshot service.
- ROI/debt/funding-gap calculator with conservative range semantics.
- Trust methodology, provider/agency/offer/contract/fee checker services.
- Visa/departure/arrival/return plan services.
- Intelligence updates and affected-case notification service.
- Grounded Copilot response and escalation contracts (deterministic retrieval shell; no unconstrained truth claims).
- Advisor, service network, learning, event, community/moderation, centre, and integration-registry services.

## 9. Migration plan

1. Add shared domain/contracts without changing existing response shapes.
2. Add a new explicit SQL migration for unified enums/relational audit tables and record-store namespaces.
3. Extend the storage port and both adapters; encrypt user/case/session-sensitive namespaces.
4. Add one bounded API module that composes existing services, then split only when operational ownership requires it.
5. Add adapter-backed web surfaces while retaining existing routes.
6. Backfill coverage/source/provider defaults as honest `RESEARCH_ONLY`, `NOT_CONFIRMED`, `UNKNOWN`, or inactive states.
7. Gate external connectors and transactions; do not migrate synthetic demo records into production claims.

Rollback: the migration is additive. Disable unified feature flags and stop writing new namespaces before dropping any new tables. Existing routes and records remain readable.

## 10. Risky changes

- Mapping existing case/application states to the richer state machines without breaking clients.
- Reconciling API/PostgreSQL and web/D1 operational persistence.
- Avoiding false completeness from synthetic route/provider/programme data.
- High-stakes eligibility, fraud, finance, and legal outputs.
- Delegate/advisor/employer/centre access to sensitive information.
- Rule changes that affect active cases.
- Multi-currency ROI calculations and salary/cost assumptions.
- Community, partner, centre, and user-generated content abuse.

Mitigations: additive adapters, unknown-preserving types, immutable snapshots, explicit consent, audit obligations, two-person review, cohort privacy, no raw public risk score, fail-closed integration flags, and `LEGAL_REVIEW_REQUIRED` markers.

## 11. Feature flags

Add flags for `unifiedMobilityCore`, `quickCheck`, `officialActionHandoffs`, `applicationQaGate`, `mobilityRoi`, `trustCenter`, `groundedCopilot`, `advisorNetwork`, `serviceNetwork`, `arrivalMode`, `journeyLearning`, `moderatedCommunity`, `opportunityEvents`, `assistedCentres`, `returnReintegration`, and each external connector. Foundations may default on in development/test; live connectors, payments, document authenticity, AI generation, and government sync default off.

## 12. External-data dependencies

- BMET/RAIMS, OEP, BOESL/BRMS, Ministry and destination-government official sources.
- Institution/programme/scholarship official data.
- Employer, vacancy, sponsorship, contract, salary, labour-market, and recognition evidence.
- Exchange rates, living costs, arrival requirements, emergency/rights contacts.
- Licensed communications/payment providers and secure document/malware/authenticity vendors.

No API is assumed. Manual/scheduled review plus canonical links is the default adapter.

## 13. Legal/regulatory dependencies

`LEGAL_REVIEW_REQUIRED` applies to government integrations, identity/biometrics, financial products or advice, automated high-stakes scoring, cross-border transfers, medical/background-check data, community moderation/retention, advisor recordings/transcripts, worker-paid fees, assisted-centre cash, and public outcome claims. Product copy must not imply government authority, guaranteed outcomes, licensed financial advice, or a conclusive fraud finding.

## 14. Recommended implementation order

1. Shared types, coverage/source/official-action/application/cost/deadline primitives and additive migration.
2. Storage adapters and API services with permission/audit tests.
3. QuickCheck, explorer, Trust Center/safety, Visa/departure, funding, and journey-command-centre P0 surfaces.
4. Rule-change/freshness operations and grounded Copilot/escalation shell.
5. P1 advisor/service/arrival/learning/community/event/playbook foundations.
6. P2 centre/return/connector/advanced-risk extension points.
7. Full typecheck/unit/integration/build/E2E verification and documentation handoff.
