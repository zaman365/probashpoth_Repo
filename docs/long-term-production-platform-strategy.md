# bdos.io long-term production platform strategy

- **Status:** Proposed target and migration plan
- **Date:** 2026-08-26
- **Decision horizon:** Before accepting sensitive documents or materially increasing traffic
- **Target stack:** standalone Cloudflare Workers + Clerk + EU PostgreSQL on Neon + private EU R2
- **Migration style:** gated, reversible, no big-bang rewrite

## Implementation checkpoint — 2026-08-26

The repository foundation is implemented: seven ADRs, Clerk server/session integration and auth
screens, provider-independent identity links and recovery records, a Hyperdrive PostgreSQL adapter,
explicit identity/workspace/RLS/document migrations, a private quarantine scanner Worker with Queue,
DLQ and outbox contracts, signed migration reconciliation tools, release-gate validation, health
checks, production cutover/incident runbooks and a production data map. SQL migrations execute in
order and the automated cross-tenant RLS test passes.

External activation is intentionally limited to isolated staging resources. On 2026-08-26 the
Cloudflare Queues `bdos-staging-document-scan` and `bdos-staging-document-scan-dlq` were created and
verified with no producers or consumers attached. A separate Clerk development application named
`bdos.io Staging` was created without changing Export HQ. A free Neon project named
`bdos-staging-eu` was created in AWS Europe Central 1 (Frankfurt); all nine repository migrations were
applied and verified, with row-level security enabled on 25 tables. The account still has no
Hyperdrive configuration, and R2 activation is waiting at Cloudflare's secure billing form because a
payment card and billing address are required for the usage-billed subscription. Production Clerk and
Neon projects, EU R2 jurisdiction, scanner service, vendor/legal approvals,
recovery/load/penetration exercises and named operational owners still require external provisioning
and recorded evidence. Consequently S1–S4 remain closed, sensitive uploads remain disabled, and this
implementation does not authorize a `bdos.io` cutover.

## 1. Executive decision

bdos.io should use the current Sites deployment only as a transitional public-product host.
It is suitable for demonstrating and refining non-sensitive journeys, but it must not become
the permanent trust boundary for passport, NID, visa, bank, medical, education or other
sensitive evidence.

The long-term production platform will be:

1. **Standalone Cloudflare Workers** for the public web experience, authenticated workspace
   and Worker-native API endpoints.
2. **Clerk** as the identity provider, with separate personal accounts for migrants/students
   and organizations for employers, agencies, institutions and operations teams.
3. **EU PostgreSQL on Neon** as the authoritative business database, accessed from Workers
   through a deliberately benchmarked connection path (Cloudflare Hyperdrive is the default
   candidate).
4. **Private Cloudflare R2 with EU jurisdiction** for documents, using quarantine, malware
   scanning, expiring authorization and auditable sharing.
5. **Cloudflare Queues** for asynchronous document and notification work. The existing
   Temporal decision remains in force for long-running case orchestration until a separate
   ADR explicitly replaces it.

The migration must finish its security, recovery and data-governance gates **before** real
sensitive documents are enabled. Infrastructure choice alone does not make document handling
safe.

## 2. Why this direction fits bdos.io

The repository already contains the right architectural seams:

- business truth lives in shared `packages/`, not in a hosting-specific UI;
- PostgreSQL is already the intended owner of business state;
- `STORAGE_DRIVER` makes persistence replaceable and fails closed outside development;
- explicit SQL migrations already exist;
- sensitive record envelopes already require AES-256-GCM field encryption;
- document sharing, consent, audit, identity, Work and Study are separate domain concepts;
- the security plan already identifies signed object access, malware scanning, KMS-backed
  secrets, WAF/rate limiting and recovery controls as launch gaps.

This plan therefore finishes the existing architecture instead of starting a second product.
It also takes the strongest pattern from Export HQ—independently controlled application,
identity, PostgreSQL and object storage—without copying its unfinished or illustrative parts.

## 3. Non-negotiable production rules

### 3.1 Sensitive-data gate

Until Gate S3 in section 9 passes, production must refuse uploads or entry of:

- passport or NID images and numbers;
- visa, residence permit and biometric records;
- bank statements, payment credentials or remittance evidence;
- medical or police-clearance documents;
- complete transcripts, certificates or employment records containing sensitive identifiers;
- any document uploaded on behalf of another person.

The UI may explain future document features, but it must not create a misleading upload path
or store these files in analytics, support tickets or logs.

### 3.2 Data ownership

- Clerk owns authentication identity and session state.
- PostgreSQL owns users' product records, profiles, consents, journeys, evidence metadata,
  decisions, cases, payments, audit references and organization relationships.
- R2 owns encrypted document objects; PostgreSQL owns their metadata and authorization state.
- No provider identifier is the primary domain identifier. `app_user.id` remains the stable
  internal identifier and maps to Clerk through an `identity_link` record.
- D1 is not a second source of truth after cutover.

### 3.3 Trust before growth

No traffic campaign, partner onboarding at scale or paid document workflow launches before:

- a restore exercise succeeds;
- cross-tenant authorization tests pass;
- incident response is rehearsed;
- privacy and retention decisions are approved;
- document quarantine and scanning work end to end;
- operational owners and an on-call path exist.

## 4. Target production architecture

```text
Users in Bangladesh and abroad
            │
            ▼
Cloudflare DNS · TLS · CDN · WAF · rate limits · Turnstile
            │
            ├──────────────► Public web Worker
            │                 country, job, study, scholarship and safety content
            │
            └──────────────► Authenticated app/API Worker
                              │
                    Clerk ────┤ identity, sessions, MFA, organization claims
                              │
                              ├── Hyperdrive ──► Neon PostgreSQL (EU)
                              │                   authoritative business state
                              │
                              ├── private R2 (EU)
                              │     quarantine + clean object areas
                              │
                              ├── Cloudflare Queues
                              │     scan, OCR, notifications, reconciliation
                              │
                              └── Temporal (pending ADR)
                                    multi-week cases and compensated workflows

Central operations: structured redacted logs · metrics · traces · audit events · alerts
```

### 4.1 Web and API deployment

Use independently deployable Workers, even if the first release keeps them in one repository:

- `www.bdos.io` / `bdos.io`: public and localized product routes;
- `app.bdos.io`: authenticated account workspace when separation becomes operationally useful;
- `api.bdos.io`: stable versioned REST API and webhook boundary;
- `ops.bdos.io`: separately authorized operator surface, never exposed by a role check in the
  consumer navigation alone.

The first migration may keep `bdos.io/bn/account` for continuity. Hostname separation is a
security and deployment option, not a reason to break the journey.

The current `apps/web` Worker configuration is a useful starting point. Before adopting it as
the permanent API runtime, run a compatibility spike against the NestJS/Fastify API. ADR 0001
currently specifies NestJS; a standalone-Workers target requires one of two explicit decisions:

1. keep domain packages and repository ports but add a small Worker-native HTTP adapter; or
2. retain NestJS on managed container compute and put it behind Cloudflare.

The target in this document prefers option 1, subject to a proof that OpenAPI generation,
validation, transactions, webhooks and observability remain equivalent. Do not quietly make
two APIs.

### 4.2 Identity with Clerk

Use Clerk as an identity boundary, not as the business database.

- Personal accounts represent workers, students and family co-pilots.
- A person may enable Work, Study or both in their bdos.io profile; this preference belongs in
  PostgreSQL, not in Clerk public metadata.
- Clerk Organizations are for employers, recruiters, educational institutions, service
  providers and internal operations teams.
- Organization roles are mapped to the repository's permission model at the API boundary.
- Operations, institutional publishing and sensitive-document review require MFA.
- Production and non-production use separate Clerk instances, keys, webhooks and redirect
  allowlists.
- Every protected request validates issuer, audience/authorized party, expiry and required
  role on the server. UI visibility is never authorization.

Existing Sites/ChatGPT identities cannot be assumed to equal Clerk identities. Migration uses
an `identity_link(provider, provider_subject, app_user_id, verified_at)` table. Existing users
claim their record through a one-time, expiring link after proving control of the same verified
email or completing a manual recovery path. Log every link and conflict resolution.

### 4.3 EU PostgreSQL on Neon

Provision distinct Neon projects for development, staging and production. Production must use
an EU region selected in the contract and console; Frankfurt is the initial candidate, not an
unreviewed default.

Required database controls:

- explicit SQL migrations only, reviewed and applied by CI/CD;
- separate migration, application read/write and read-only support roles;
- row-level security for user- and organization-owned records;
- least-privilege grants independent of RLS;
- field encryption for national identifiers and other defined high-risk values;
- append-only audit, journal and complaint invariants retained;
- statement timeouts, query limits and slow-query monitoring;
- no production data copied to development or ephemeral branches;
- tested point-in-time recovery and an independent encrypted export schedule;
- quarterly restore exercises with documented recovery time and recovery point results.

Cloudflare Hyperdrive is the default connection-path candidate because it pools connections
between globally executing Workers and a regional PostgreSQL origin. Benchmark it against
Neon's pooled connection endpoint under Bangladesh-to-EU traffic before deciding. Use one
pooling layer deliberately; avoid unmeasured nested pools. Database clients must be created
within Worker handlers, not kept as cross-request global I/O objects.

### 4.4 Private R2 document system

Create R2 buckets with the **EU jurisdiction restriction**, not merely a Western Europe
location hint. Jurisdiction is immutable after bucket creation, so validate it in automated
infrastructure checks.

Use at least these logical storage states:

```text
quarantine/{user}/{upload-id}   newly uploaded; unavailable to normal users and staff
clean/{user}/{document-id}      scanned, classified, authorized for case use
rejected/{upload-id}            minimal evidence/metadata; short automatic retention
exports/{request-id}            encrypted user export; short automatic retention
```

An upload flow must:

1. authenticate and authorize the uploader;
2. create a pending PostgreSQL document record and one-use upload intent;
3. issue a narrowly scoped, short-lived upload authorization;
4. enforce maximum bytes, declared type and checksum;
5. write only to quarantine;
6. emit an event to a Queue;
7. verify file signature/magic bytes and run malware scanning in an isolated scanner;
8. mark the record clean or rejected, never by client assertion;
9. provide downloads only after a fresh authorization check;
10. record upload, scan, view, share, download, revoke and delete events.

R2 remains private: disable `r2.dev` and public custom-domain access. Treat presigned URLs as
bearer tokens, keep their lifetimes short and never place them in logs or analytics. Apply
lifecycle policies to abandoned multipart uploads, rejected objects and temporary exports.

### 4.5 Asynchronous and long-running work

Use Queues for short, retryable, idempotent background work:

- document scanning and metadata extraction;
- OCR after a file is declared clean;
- email/SMS/push requests;
- webhook delivery and reconciliation;
- analytics events with PII removed;
- search/index projection updates.

Every consumer requires an idempotency key, bounded retry policy, dead-letter queue and alert.
Never place raw document bytes, identifiers or access URLs in queue messages.

Keep Temporal as the planned owner of multi-week migration cases, milestone waits and
compensating business workflows until an ADR compares it with Cloudflare Workflows. Queue
delivery and case state are different responsibilities.

## 5. Environment and delivery model

| Concern | Development                        | Staging                          | Production                        |
| ------- | ---------------------------------- | -------------------------------- | --------------------------------- |
| Domain  | localhost / preview                | `staging.bdos.io`                | `bdos.io`, app/API subdomains     |
| Clerk   | development instance               | separate non-production instance | production instance               |
| Neon    | local or isolated project/branch   | dedicated staging project        | dedicated EU project              |
| R2      | local/test bucket; synthetic files | dedicated EU staging buckets     | dedicated private EU buckets      |
| Data    | synthetic only                     | synthetic only                   | real data after the relevant gate |
| Secrets | local secret store                 | environment-scoped secrets       | production secrets with rotation  |

Manage Workers, routes, DNS, Hyperdrive, Queues and R2 policy as reviewed infrastructure as
code. Deploy from CI using short-lived or narrowly scoped credentials. Require approval for
production migrations and domain changes. Generate a software bill of materials, scan secrets
and dependencies, and sign or record the provenance of production artifacts.

## 6. Migration streams

### 6.1 Stream A — application/runtime

1. Freeze new hosting-specific business logic.
2. Inventory all D1/R2/Sites calls in `apps/web`.
3. Move business operations behind existing domain and repository ports.
4. Prove the Worker-native API adapter against authentication, PostgreSQL transactions,
   OpenAPI, webhooks, file authorization and request limits.
5. Deploy the standalone stack to an internal hostname.
6. Run browser, accessibility, locale and mobile-network tests before any domain cutover.

### 6.2 Stream B — identity

1. Define personal, household/delegated, institutional and operator identity journeys.
2. Create Clerk development and production instances with approved sign-in methods.
3. Implement server-side session validation, role mapping and MFA policy.
4. Add `identity_link` and account-link audit records.
5. Rehearse migrations with synthetic duplicates, changed emails and lost-email recovery.
6. Invite a small internal cohort, then existing users, then new users.
7. Remove legacy identity only after the link-success and recovery windows close.

### 6.3 Stream C — D1 to PostgreSQL

1. Inventory every table, row count, owner relation and retention class.
2. Finalize normalized PostgreSQL repositories behind `STORAGE_DRIVER=postgres`.
3. Map D1 identifiers to stable domain UUIDs; never infer ownership from email alone.
4. Export a signed snapshot, transform deterministically and import to staging.
5. Reconcile counts, referential integrity, checksums and domain invariants.
6. Shadow-read selected production requests from PostgreSQL and compare results without
   exposing shadow data to users.
7. Perform a rehearsed cutover: brief write freeze, final delta, reconciliation, feature-flag
   switch and smoke tests.
8. Keep the former D1 data read-only for the agreed rollback window, then delete it under an
   approved retention record.

Avoid long-lived dual writes. If a short dual-write window is unavoidable, write once to the
authoritative database and deliver the secondary update through an outbox with reconciliation.

### 6.4 Stream D — files

Before migration, classify existing R2 objects as synthetic, public, user-owned or unknown.
Unknown objects are not promoted. For permitted objects:

1. export with key, size, content type and checksum inventory;
2. copy into EU quarantine, not directly into clean storage;
3. rescan and reconcile checksums;
4. recreate PostgreSQL metadata and ownership links;
5. verify authorization with positive and negative tests;
6. remove the old copy only after the rollback window and deletion approval.

If current Sites storage cannot provide a complete export and audit trail, keep those objects
out of the new trust system and ask their owners to upload again after Gate S3.

### 6.5 Stream E — domain and production cutover

1. Keep Sites live on `bdos.io` while the standalone stack runs on an internal/staging domain.
2. Verify production Clerk DNS, webhook secrets, CSP and authorized-party settings.
3. Lower DNS TTL before the approved window.
4. Take pre-cutover database and configuration recovery points.
5. Freeze writes, migrate the final delta, switch traffic and run scripted smoke tests.
6. Monitor authentication, errors, latency, queue lag and database saturation continuously.
7. Roll back traffic and writes if any abort threshold is crossed.
8. Keep Sites available but read-only and inaccessible to ordinary traffic for 14–30 days.

The runbook must identify one cutover commander, one database owner, one identity owner and one
person with authority to abort. A domain change is not complete because the home page loads;
sign-in, account linking, file authorization, forms, webhooks and Bangla/English deep links must
all pass.

## 7. Security, privacy and compliance workstream

Treat this as product work, not paperwork after launch.

Required before Gate S3:

- complete data inventory and processing-purpose map;
- controller/processor and subprocessor review for Clerk, Neon and Cloudflare;
- signed data-processing agreements and international-transfer assessment;
- documented lawful basis, privacy notices and consent boundaries for every document class;
- data-protection impact assessment reviewed by qualified counsel/DPO;
- record-level retention schedule and automated deletion verification;
- user access, correction, export and erasure workflows;
- delegated/family access that is explicit, scoped, expiring and revocable;
- staff least privilege, joiner/mover/leaver process and hardware-backed MFA for privileged
  accounts;
- incident response, breach assessment and notification playbook;
- external penetration test covering identity, tenancy, API and document paths;
- dependency, secret, SAST and infrastructure scanning in CI;
- production logs tested to contain no passport, NID, bank, visa, auth token or raw document
  content.

EU data location helps with residency, but it does not by itself establish GDPR compliance or
remove international-transfer, access-control and purpose-limitation obligations.

## 8. Reliability and operational readiness

Define measurable service levels after staging load tests establish a baseline. At minimum,
production readiness includes:

- health checks for Workers, Clerk dependency, PostgreSQL, Hyperdrive and Queue consumers;
- structured, redacted logs with request and audit correlation IDs;
- error, latency, authentication failure, database connection and queue-lag dashboards;
- alerts tied to an owned response path, not an unattended mailbox;
- capacity tests from Bangladesh and Europe on constrained mobile connections;
- database recovery and R2 inventory reconciliation exercises;
- key rotation and compromised-credential runbooks;
- provider-outage behavior that fails safely without fabricating eligibility or payment state;
- a public status and support communication procedure.

Set recovery objectives by data class. A recommended starting policy is zero tolerated loss for
confirmed ledger/audit transactions, with explicit reconciliation for asynchronous projections.
The final RPO/RTO values require operational and commercial approval, then proof through drills.

## 9. Release gates

| Gate                         | What may be live                                                                      | Exit criteria                                                                                                                                 |
| ---------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **S0 — public preview**      | Public content and synthetic demonstrations                                           | No real PII; source labels; analytics redaction                                                                                               |
| **S1 — real accounts**       | Clerk accounts, Work/Study choice, non-sensitive preferences                          | Production Clerk; server authorization; account recovery; audit; rate limits                                                                  |
| **S2 — real journeys**       | Checklists, saved opportunities, readiness and appointments without sensitive uploads | EU Postgres; RLS tests; migration reconciliation; restore drill; retention and DSAR paths                                                     |
| **S3 — sensitive documents** | Approved document classes only                                                        | Private EU R2; quarantine; malware scan; field encryption; short-lived access; consent; DPIA/legal approval; penetration test; incident drill |
| **S4 — scale and partners**  | Higher traffic, employers/agencies/institutions and paid workflows                    | SLOs; load test; on-call; support operations; partner due diligence; cost and abuse controls                                                  |

Passing a gate requires recorded evidence and named approval from product, engineering,
security/privacy and operations. A feature flag is not approval evidence.

## 10. Indicative programme

The ranges below assume a small experienced product-engineering team and may overlap where
dependencies permit. Gates, not calendar dates, control release.

| Phase                     | Indicative duration | Outcome                                                                    |
| ------------------------- | ------------------: | -------------------------------------------------------------------------- |
| 0. Decision and inventory |           1–2 weeks | Accepted ADR backlog, data map, freeze on new hosting coupling             |
| 1. Standalone foundation  |           2–4 weeks | Environments, IaC, CI/CD, Worker/API compatibility proof                   |
| 2. Identity               |           3–5 weeks | Clerk, MFA/roles, account linking and recovery rehearsed                   |
| 3. PostgreSQL             |           4–7 weeks | Production repositories, RLS, migration and restore proven                 |
| 4. Private documents      |           4–7 weeks | EU R2 pipeline, scanning, retention and document audit proven              |
| 5. Shadow and pilot       |           2–4 weeks | Internal cohort and real-user pilot without sensitive-document scope creep |
| 6. Domain cutover         |           1–2 weeks | `bdos.io` on standalone Workers with tested rollback                       |
| 7. Stabilization          |           2–4 weeks | Legacy path retired after reconciliation and retention approval            |

A realistic first production cutover is approximately **4–6 months**, depending primarily on
identity migration, API runtime compatibility, document-scanning capability and legal review.
The sensitive-document launch can occur later than the web/domain cutover.

## 11. Team and decision ownership

Minimum accountable roles:

- **Product owner:** scope, release gates and user communication;
- **Technical lead:** target architecture, ADRs and cutover authority;
- **Backend/data owner:** Postgres repositories, RLS, migration and recovery;
- **Identity/application owner:** Clerk, account linking and user journeys;
- **Security/privacy owner:** threat model, vendor review, DPIA and incident response;
- **Platform/SRE owner:** Cloudflare, IaC, observability, queues and runbooks;
- **QA/accessibility owner:** Bengali/English, low-literacy, mobile and authorization testing;
- **Operations owner:** manual review, support and escalation workflows.

Independent legal/privacy review and an external penetration test are launch dependencies, not
roles to improvise inside the engineering team.

## 12. Success and abort measures

### Migration acceptance

- 100% of in-scope authoritative records reconcile by count and ownership.
- 100% of migrated files reconcile by checksum and authorized owner.
- No unresolved duplicate identity links.
- Zero cross-user or cross-organization access in automated and manual tests.
- Restore drill meets the approved RPO/RTO for each data class.
- All production secrets are environment-scoped and absent from source and logs.
- Bangla and English account, recovery and error paths pass usability review.

### Cutover abort conditions

- authentication or account linking produces unexpected users;
- authorization denies legitimate owners or exposes another user's data;
- reconciliation differs after the final delta;
- error rate, database saturation or queue lag breaches the runbook threshold;
- audit events or redaction are missing;
- rollback capability is unavailable.

Abort means returning traffic to the last known safe platform and reconciling before retrying;
it is a designed outcome, not a failed project.

## 13. Decisions that must become ADRs

1. Worker-native API adapter versus retaining NestJS on separate compute.
2. Clerk identity model, organization roles and legacy-account linking.
3. Neon region, plan, pooling path, RLS and backup/export policy.
4. R2 bucket topology, encryption/key management, scan service and retention.
5. Temporal versus Cloudflare Workflows for multi-week orchestration.
6. D1-to-PostgreSQL cutover and rollback protocol.
7. Public/app/API/ops hostname boundaries.

ADR 0001 should not be edited until the compatibility spike resolves item 1. The strategy sets
the destination; ADRs record the proven engineering choices used to reach it.

## 14. First 30 days

1. Approve this target and appoint the decision owners.
2. Keep sensitive document collection disabled in production.
3. Inventory Sites/D1/R2 data, current identities and all hosting-specific code paths.
4. Create the seven ADR work items above.
5. Build a standalone Worker proof on a non-production hostname.
6. Prove Clerk session validation and one protected route with `authorizedParties` restricted.
7. Provision a synthetic-only Neon EU staging project and benchmark direct Neon pooling against
   Hyperdrive from representative locations.
8. Run the PostgreSQL migrations and RLS cross-tenant test suite against that project.
9. Prototype the R2 quarantine-to-scan-to-clean pipeline with harmless test fixtures.
10. Produce the data map, vendor review, DPIA outline and cutover/rollback runbook skeleton.

At day 30, decide whether the Worker-native API path is viable. Do not spend the following
months implementing around an unresolved runtime boundary.

## 15. What this plan deliberately does not do

- It does not authorize a production-domain change.
- It does not turn on real-document uploads.
- It does not claim that EU hosting alone is legal compliance.
- It does not replace versioned, human-reviewed regulatory truth with AI output.
- It does not introduce microservices or Kubernetes.
- It does not treat Clerk metadata, D1 and PostgreSQL as competing sources of truth.
- It does not promise migration dates before the security and recovery gates pass.

## 16. Technical basis

The target relies on current official capabilities, which must be rechecked during each ADR:

- [Cloudflare Hyperdrive](https://developers.cloudflare.com/hyperdrive/) supports PostgreSQL,
  including Neon, and provides a Worker-accessible pooled connection path.
- [Hyperdrive connection lifecycle](https://developers.cloudflare.com/hyperdrive/concepts/connection-lifecycle/)
  requires Worker database clients to be created inside each handler rather than retained as
  cross-request I/O objects.
- [R2 data location](https://developers.cloudflare.com/r2/reference/data-location/) distinguishes
  best-effort location hints from jurisdictional restrictions and supports an EU jurisdiction.
- [R2 presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/) grant temporary
  bearer access and therefore require narrow operations and short expiries.
- [R2 lifecycle rules](https://developers.cloudflare.com/r2/buckets/object-lifecycles/) support
  automatic expiration of temporary objects.
- [Cloudflare Queues](https://developers.cloudflare.com/queues/) provides batching, retry, delay
  and dead-letter handling for work moved out of request paths.
- [Clerk production deployment](https://clerk.com/docs/guides/development/deployment/production)
  requires production-specific keys, OAuth credentials, webhooks and domain controls, and
  recommends restricting authorized request origins.
- [Clerk MFA session tasks](https://clerk.com/docs/guides/configure/session-tasks) can prevent a
  session from becoming active until required MFA setup is complete.
- [Clerk Organizations](https://clerk.com/docs/nextjs/guides/organizations/getting-started)
  supports server-side organization role and permission checks.
- [Neon connection pooling](https://neon.com/docs/connect/connection-pooling) uses transaction-mode
  pooling for serverless connection pressure.
- [Neon regional status documentation](https://neon.com/docs/introduction/status) lists European
  regions including Frankfurt; the contracted production region still requires verification.
- [Neon security and compliance](https://neon.com/security) publishes its compliance posture and
  DPA availability; bdos.io must perform its own vendor and legal review.
