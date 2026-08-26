# ProbasJatra Study Scholarship Journey — Implementation Plan

Status: implementation proposal  
Prepared: 26 August 2026

## Product decision

The scholarship product will not be a generic list or a black-box “chance calculator.” It will be a source-backed journey that connects:

> **one verified Study Profile → suitable countries and courses → relevant scholarships → an explainable readiness plan → deadlines, evidence, applications, and outcomes**

The user should always be able to see:

1. which scholarships fit their current profile;
2. which official rule produced every result;
3. which facts are confirmed, self-declared, missing, or stale;
4. what they can realistically improve;
5. what cannot be changed for the current scholarship or cycle; and
6. the next small action that moves the journey forward.

## What exists today

The repository already has useful foundations, but the deployed experience is not yet a scholarship system:

- the public Study hub reads 10 synthetic courses from 5 demo institutions;
- programme scholarship data is explicitly returned as `unknown` with no opportunities;
- scholarship discovery intentionally returns no results rather than inventing matches;
- the live Migration Passport has only a lightweight study profile;
- a richer academic profile, programme-fit model, shortlist, calendar, and application model exist in the API contracts and service, but they are not connected to the live Sites deployment;
- D1 already stores authenticated profiles, journeys, tasks, documents, alerts, and audit events; R2 is available for source snapshots and evidence files.

This is the right trust posture. The next phase should replace “unknown” with verified data and explainable rules without weakening it.

## USP

> **Find scholarships you can act on—not just scholarships that exist.**

Bangla expression:

> **শুধু স্কলারশিপের তালিকা নয়—আপনার যোগ্যতা, ঘাটতি ও পরবর্তী পদক্ষেপসহ একটি সম্পূর্ণ প্রস্তুতির যাত্রা।**

The differentiator is the connection between scholarship rules, country-specific courses, the candidate’s evidence, and a motivating preparation plan.

## Product boundaries

### The system will do

- discover current scholarships from authoritative sources;
- normalize nationality, residence, degree, field, age, language, experience, funding, and deadline rules;
- match those rules against a versioned Study Profile;
- distinguish eligibility from competitiveness and evidence completeness;
- connect scholarships to eligible countries, institutions, courses, degree levels, and subjects;
- turn missing or improvable requirements into checkable journey tasks;
- suggest adjacent scholarships, courses, countries, or future cycles when the first option is unsuitable;
- show the official source, last checked date, and unresolved conditions on every result;
- track shortlist, deadlines, documents, submission, decision, award, and actual funding outcome.

### The system will not do

- claim a probability of winning;
- treat a high score as admission or scholarship approval;
- scrape or republish a source when its terms do not permit it;
- let AI invent eligibility rules, deadlines, benefits, or participating courses;
- mark official or evidence-based requirements complete only because a user checked a box;
- imply that “complete geographic coverage” is permanent. Coverage will be measured and displayed by country, source, cycle, and freshness.

## Source and geographic strategy

There is no single global scholarship API. The product needs a governed **Source Registry** and one adapter per authoritative source.

### Source priority

1. Government, embassy, ministry, and national study portals.
2. Multilateral programmes such as Erasmus Mundus.
3. Official scholarship-awarding bodies and foundations.
4. Official institution and programme pages.
5. Bangladesh government scholarship circulars and nomination routes.

Aggregators may help discover a source but cannot become the source of truth.

### Initial source map

| Geography                 | Priority official sources                                                                                                                                                                                                                                                                          | Integration target                                                                                      |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Bangladesh applicant side | [Secondary and Higher Education Division scholarship notices](https://shed.gov.bd/pages/moedu-scholarships), [UGC Bangladesh](https://ugc.gov.bd/), [Economic Relations Division scholarship and fellowship information](https://erd.gov.bd/pages/static-pages/694032b635ce18e1c0560fe2)           | Bangladesh-specific calls, nomination routes, documents, and travel-grant opportunities                 |
| Germany                   | [DAAD Scholarship Database](https://www2.daad.de/deutschland/stipendium/datenbank/en/21148-scholarship-database/), DAAD programme calls, official university and foundation pages                                                                                                                  | Applicant-country, academic status, purpose, subject, deadline, benefit, and application-route rules    |
| European / multi-country  | [Erasmus Mundus Joint Masters](https://erasmus-plus.ec.europa.eu/opportunities/individuals/students/erasmus-mundus-joint-masters), [Study in Europe funding guidance](https://education.ec.europa.eu/study-in-europe/planning-your-studies/scholarships-and-funding), EURAXESS                     | Joint programmes, research funding, participating institutions, and country links                       |
| United Kingdom            | [GOV.UK international postgraduate scholarships](https://www.gov.uk/postgraduate-scholarships-international-students), Chevening, Commonwealth Scholarship Commission, official universities                                                                                                       | Nationality, degree, work experience, course, application-cycle, and institution rules                  |
| United States             | [EducationUSA Financial Aid](https://educationusa.state.gov/financial-aid), official university financial-aid pages                                                                                                                                                                                | Degree level, institution, award value, deadline, and international-student availability                |
| Canada                    | [EduCanada scholarship search](https://www.educanada.ca/scholarships-bourses/searchAll-rechercheTous.aspx?lang=eng), official institution pages                                                                                                                                                    | Applicant profile, programme type, institution nomination, and direct/indirect application route        |
| Australia                 | [Australian Government financial assistance](https://www.education.gov.au/international-education/financial-assistance-international-students), Australia Awards, [Research Training Program](https://www.education.gov.au/research-block-grants/research-training-program), official universities | Government awards, HDR eligibility, provider-level selection, stipend, fee offset, and allowances       |
| Japan                     | [Study in Japan scholarships](https://studyinjapan.go.jp/en/planning/scholarships/), [scholarship and tuition-reduction search](https://www.studyinjapan.go.jp/en/search-for-scholarships/tuition-reduction_search.php?lang=en), MEXT and JASSO                                                    | Government, university, local-government, private, pre-arrival, and tuition-reduction programmes        |
| South Korea               | [Study in Korea / GKS](https://www.studyinkorea.go.kr/en/plan/scholarship.do?tab=gks-tab4), official GKS notices and university files                                                                                                                                                              | Nationality, age, GPA, degree, track, participating university, and field rules                         |
| France                    | [Campus France scholarships](https://www.campusfrance.org/en/bursaries-foreign-students) and CampusBourses, official institutions                                                                                                                                                                  | Nationality, field, level, funder, and institution scope                                                |
| Netherlands               | [Study in NL / NL Scholarship](https://www.studyinnl.org/finances/nl-scholarship), participating institutions                                                                                                                                                                                      | Nationality, full-time bachelor/master, institution, value, and deadline                                |
| Sweden                    | Swedish Institute scholarships and University Admissions, official universities                                                                                                                                                                                                                    | Eligible countries, eligible master’s programmes, experience/leadership, and application cycle          |
| New Zealand               | [Manaaki New Zealand Scholarships](https://www.nzscholarships.govt.nz/check-eligibility-criteria/), Study with New Zealand, official institutions                                                                                                                                                  | Eligible citizenship, residence, experience, development alignment, subject, course, and language rules |

### Rollout sequence

The database should expand by verified coverage rather than by adding empty country names:

1. **Pilot:** Germany + Bangladesh-origin notices + Erasmus Mundus.
2. **High-demand destinations:** UK, Canada, Australia, Japan, South Korea, United States.
3. **European expansion:** France, Netherlands, Sweden, then the remaining Study in Europe countries.
4. **Asia and Gulf expansion:** China, Malaysia, Singapore, Brunei, India, Saudi Arabia, UAE, Qatar, Türkiye.
5. **Global completion:** New Zealand and remaining government, multilateral, institution, and foundation sources.

Each country will display its coverage state: `verified`, `partial`, `awaiting source permission`, `stale`, or `not covered`.

## Data acquisition and governance

### Adapter modes

Each Source Registry record declares one permitted acquisition mode:

- official API;
- published feed;
- official downloadable dataset;
- licensed partner feed;
- permission-based HTML extraction;
- human-reviewed entry with an official link.

No connector should assume that a searchable public website permits automated republication. DAAD, for example, explicitly asks applicants to confirm current third-party terms with the named programme contact. The initial Germany release must either use a permitted feed/partnership or store reviewed normalized facts with a deep link to the official call.

### Ingestion pipeline

```text
Source Registry
  → fetch permitted source
  → save immutable raw snapshot in R2
  → parse into staging records
  → validate required fields and rule vocabulary
  → compare with the last published version
  → human-review high-impact changes
  → publish a versioned record to D1
  → recalculate affected matches
  → alert shortlisted users about material changes
```

High-impact changes include deadline, nationality, age, degree, GPA, language, funding, participating institution/course, application route, or programme closure.

### Freshness rules

- open-cycle deadlines: check daily where the source and permission allow it;
- active scholarship programmes: check weekly;
- general country guidance: check monthly;
- institution-level funding: check every 7–14 days during admission cycles;
- if a record passes its freshness threshold, stop labeling it “open” and show “confirm with source” until rechecked;
- withdrawn or replaced calls remain in history but cannot appear as active matches.

Every published scholarship stores `source_url`, `source_authority`, `source_snapshot_id`, `source_checked_at`, `effective_from`, `effective_to`, and `review_state`.

## Canonical data model

### Geographic and education catalogue

- `countries` — ISO country, regions, currencies, study portal, coverage status;
- `country_subdivisions` — state/province/prefecture where a scholarship is geographically limited;
- `institutions` — legal identity, official domain, recognition/accreditation evidence;
- `programmes` — institution, degree level, ISCED-F subject, language, intake, duration, tuition;
- `programme_requirements` — structured admission rules and official source version;
- `source_registry` — authority, jurisdiction, acquisition mode, permission state, cadence, owner;
- `source_snapshots` — fetched time, content hash, parser version, R2 object key, review state.

### Scholarship catalogue

- `scholarships` — stable identity, funder, destination, overview, application route;
- `scholarship_cycles` — year/intake, open/close dates, status, cycle-specific official URL;
- `scholarship_scopes` — applicant citizenship/residence, destination, institution, programme, degree, and ISCED-F scope;
- `scholarship_rules` — normalized hard rule, comparator, value, evidence type, source excerpt location;
- `scholarship_benefits` — tuition, stipend, travel, visa, insurance, family, research, and duration;
- `scholarship_course_links` — direct programme IDs or constrained subject/degree/institution relationships;
- `scholarship_documents` — required form, certificate, transcript, recommendation, essay, proposal, or nomination;
- `scholarship_contacts` — official application and clarification channels.

### Candidate Study Profile

The deployed lightweight passport and the richer API academic profile should become one versioned model containing:

- citizenship, current residence, date of birth, and residence duration;
- target countries, degree level, fields, intake, and preferred study language;
- education history with institution, field, result type/value/scale, graduation year, credits, and evidence;
- normalized grades while preserving the original grading scale;
- transcript subject tags and prerequisites;
- language tests with overall/section scores and expiry;
- paid, unpaid, and volunteer work experience;
- research interests, publications, proposal, portfolio, awards, leadership, and community impact;
- budget, available funds, funding gap, scholarship need, sponsor, and proof-of-funds state;
- academic gaps and truthful explanation;
- previous scholarships or exclusions where a specific rule requires them;
- evidence status: self-declared, uploaded, pending review, verified, expired, or conflicting.

Sensitive eligibility attributes should only be collected when a real scholarship requires them, with field-level consent and a clear explanation.

### User workflow records

- `scholarship_matches` — candidate profile version, scholarship cycle version, engine version, outcome, evaluated time;
- `scholarship_match_factors` — rule, state, reason, evidence, next action, source;
- `scholarship_shortlists` — dream, target, backup, archived;
- `scholarship_journeys` — current stage and linked course/application;
- `scholarship_tasks` — actionable checklist item, due date, completion authority, evidence requirement;
- `scholarship_applications` — draft through decision and award;
- `scholarship_alerts` — deadline, changed rule, reopened cycle, stale source, missing evidence;
- `scholarship_outcomes` — applied, shortlisted, awarded, value received, actual cost, enrolment outcome.

Indexes should follow real queries: active cycle by destination/degree/field, scholarship rule by cycle, programme by institution/subject, user match by outcome, shortlist by user/deadline, and open task by user/due date.

## Matching engine

The engine must be deterministic, versioned, and explainable. AI may help translate or summarize official text for review, but cannot publish a rule or decide eligibility.

### Evaluation order

1. **Scope filter:** citizenship/residence, destination, level, field, institution/course, intake, and application route.
2. **Hard eligibility:** age, prior degree, result threshold, graduation date, experience, language, current enrolment, previous award, nomination, and other sourced conditions.
3. **Evidence coverage:** whether each candidate claim has the evidence the scholarship expects.
4. **Deadline feasibility:** remaining time compared with outstanding requirements and lead times.
5. **Funding fit:** benefit coverage, tuition/living cost, residual gap, and proof-of-funds implications.
6. **Competitive alignment:** academic strength, research/course alignment, experience, leadership, and impact—shown as strengths/gaps, never as a winning probability.

### Match outcomes

- `eligible_now` — all known hard rules are met; selection is still competitive;
- `potential_after_actions` — no immutable blocker, but one or more preparable requirements are missing;
- `not_eligible_current_cycle` — a hard current-cycle rule is not met;
- `eligible_future_cycle` — a date, graduation, experience, or preparation condition may be satisfied later;
- `manual_confirmation_required` — the official source is ambiguous or an institution/funder must decide;
- `closed_or_stale` — applications are closed or the source is no longer current.

### Scores shown to users

The interface should not show one misleading “fitness percentage.” It should show three separate measures:

- **Eligibility rules:** e.g. 8 of 10 met, 1 missing, 1 needs confirmation;
- **Evidence readiness:** e.g. 70% of required evidence attached or verified;
- **Application readiness:** e.g. 6 of 9 journey tasks complete.

Competitive strengths are displayed as qualitative evidence-backed factors, not probability.

### Explainability contract

Every factor must contain:

- rule label;
- state: meets, missing, conflicts, unknown, or not applicable;
- plain-language reason;
- candidate fact used;
- official rule source and last checked date;
- whether the user can change it;
- one next action where appropriate.

The match stores the candidate profile version, scholarship cycle version, and engine version so a result can be reproduced after rules change.

## “Not ready yet” logic

An unsuccessful match must never end at “not eligible.” The system classifies the gap and responds accordingly.

| Gap type                                              | Product response                                                                                                                         |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Missing document or unverified claim                  | Create an evidence task and show exactly what acceptable proof looks like                                                                |
| Language score below requirement                      | Show target overall/section score, expiry rules, preparation task, and realistic test deadline                                           |
| Missing work or leadership experience                 | Show required duration/type and a preparation path; never suggest fabrication                                                            |
| Academic prerequisite or subject-credit gap           | Show the missing subject/credit and official programme confirmation route                                                                |
| Statement, proposal, portfolio, or recommendation gap | Add staged drafting, review, referee, and finalization tasks                                                                             |
| Deadline too close                                    | Explain why the current cycle is unsafe and prepare for the next verified cycle                                                          |
| Immutable rule such as citizenship or age             | Explain the rule respectfully and do not present it as improvable                                                                        |
| Scholarship does not cover the linked course          | Suggest scholarships for that course, or eligible courses under the scholarship                                                          |
| Funding remains insufficient                          | Show the residual gap and alternatives: partial award, tuition waiver, lower-cost course, assistantship, sponsor, or another destination |
| Official rule is ambiguous                            | Mark “confirmation needed,” provide the official contact, and create a confirmation task                                                 |

Alternative recommendations should be ordered as:

1. same course + another scholarship;
2. same country and subject + another eligible course;
3. same scholarship + another eligible programme;
4. next cycle after specific preparation;
5. another country with a comparable course and stronger funding fit.

## Journey and checklist experience

### Study scholarship story

1. **Tell your study story** — education, ambition, evidence, funding need.
2. **Choose a destination and course direction** — country, level, field, intake.
3. **Discover your matches** — eligible now, prepare first, future cycle, confirm.
4. **Understand one scholarship** — benefits, rules, linked courses, source, deadline.
5. **Build your readiness plan** — the smallest set of actions that changes the result.
6. **Prepare the application** — evidence, essays, referees, nomination, course admission.
7. **Submit and follow the decision** — application status, interviews, conditions, alerts.
8. **Fund the real journey** — award, remaining gap, visa, departure, enrolment, outcome.

### Checklist behavior

- checklist sections: `Must be true`, `Your evidence`, `Improve your application`, `Deadline plan`, and `Submission`;
- show “3 actions to become ready,” not a wall of requirements;
- tasks may be `Now`, `Next`, or `Confirm`;
- user-completed actions can be checked by the user;
- evidence-locked tasks complete only when the required document or review state exists;
- official eligibility rules are system-controlled and cannot be overridden by a checkbox;
- each completed task visibly advances the scholarship journey and reveals the next action;
- a user can pause, dismiss, or move a scholarship to the next cycle without losing work.

Motivation comes from meaningful progress, not confetti on high-stakes decisions.

## Information architecture

### New private routes

- `/[locale]/study/profile` — full versioned Study Profile and evidence coverage;
- `/[locale]/study/scholarships` — personalized discovery and filters;
- `/[locale]/study/scholarships/[id]` — scholarship truth, match explanation, linked courses, and readiness journey;
- `/[locale]/study/shortlist` — dream/target/backup comparison;
- `/[locale]/study/calendar` — scholarship, programme, test, referee, and visa deadlines.

### Existing routes to upgrade

- Study dashboard: scholarship next action and nearest deadline become part of the existing Funding chapter;
- Study hub: personalized scholarship entry point plus public country/course browsing;
- country detail: verified scholarship coverage, source authorities, eligible courses, and freshness;
- programme detail: “Scholarships for this course” with personal qualification state;
- Migration Passport: progressively expand the Study Profile instead of duplicating forms;
- documents: link each file to the scholarship rule/task it satisfies;
- alerts: deadline and material source-change notifications.

Public visitors may browse verified scholarship facts. Personal matching, shortlist, checklists, alerts, and documents require the authenticated account.

## Technical implementation strategy

### Runtime choice

Use the live Sites application as the first operational surface:

- D1 is the canonical structured store for scholarship catalogue, rules, user profiles, matches, and tasks;
- R2 stores immutable raw source snapshots and user evidence files;
- shared Zod contracts define scholarship, rule, match, profile, and ingestion payloads;
- matching logic moves into a shared deterministic domain package so the live site and the existing API use the same engine;
- external source ingestion runs as a scheduled server-side pipeline, never during a visitor’s page request;
- source credentials and partner tokens stay in hosted secrets, never in code or client JavaScript.

The current synthetic `demo-api` course path should remain only for explicitly labeled development fixtures. Production Study and scholarship routes must read published D1 records.

### Security and privacy

- authorize every profile, match, shortlist, task, document, and application query by authenticated user ID;
- collect only scholarship-required personal attributes;
- separate self-declared facts from uploaded and reviewed evidence;
- encrypt transport, keep source credentials server-side, and retain audit events for rule changes and match recalculation;
- never send the complete candidate profile to third-party scholarship sources;
- do not submit external applications automatically;
- add retention and deletion controls for profile and evidence data.

### Operational review console

Before geographic scale, administrators need a small internal console for:

- source health and last successful fetch;
- parser failures and schema drift;
- new/changed/removed scholarship cycles;
- rule-diff review;
- stale and ambiguous records;
- duplicate resolution;
- source permission state;
- publish/withdraw action with audit trail;
- coverage by country, source, degree, and subject.

## Delivery phases

### Phase 0 — source permissions and taxonomy

- confirm acquisition rights and technical access for DAAD, SHED/UGC/ERD, and Erasmus sources;
- define ISO geography, ISCED-F subjects, degree levels, grade scales, rule operators, evidence types, benefit types, and freshness states;
- create the Source Registry and coverage ledger;
- define human-review and withdrawal policy.

**Exit gate:** every pilot source has an approved acquisition mode and operational owner.

### Phase 1 — canonical scholarship data and Germany pilot

- add D1/R2 schema and migrations;
- build ingestion, snapshots, parser validation, diffing, review, and publish flow;
- ingest Bangladesh-relevant Germany and Erasmus opportunities from permitted official sources;
- create public scholarship list/detail pages with sources, cycles, benefits, and linked courses;
- remove synthetic scholarship claims from production views.

**Exit gate:** every published record has an official source, cycle, freshness state, and review history.

### Phase 2 — complete Study Profile and explainable matcher

- merge the lightweight deployed passport with the richer academic-profile contract;
- add education, grades, transcript subjects, language scores, experience, research, leadership, preferences, and funding gap;
- implement the deterministic versioned rules engine;
- produce the six match outcomes and factor-by-factor explanation;
- add profile and rule fixtures for Bangladeshi SSC/HSC, diploma, bachelor, master, and doctoral pathways without inventing equivalence decisions.

**Exit gate:** tests prove hard blockers, preparable gaps, unknown rules, and evidence states are not conflated.

### Phase 3 — scholarship journey and course integration

- create matched discovery, scholarship detail, shortlist, and calendar;
- connect scholarship scope to country-specific courses and institutions;
- generate checkable `Now / Next / Confirm` tasks;
- integrate evidence, funding gap, deadlines, applications, alerts, and the Study dashboard Funding chapter;
- add alternative-course, alternative-scholarship, and next-cycle recommendations.

**Exit gate:** a user can move from profile to one actionable scholarship plan and always understand the source and next step.

### Phase 4 — high-demand destination expansion

- add UK, Canada, Australia, Japan, South Korea, and United States adapters and review queues;
- add France, Netherlands, Sweden, and country-specific institutional sources;
- add applicant-country notices from Bangladesh as a separate discovery lane;
- display coverage and freshness publicly.

**Exit gate:** each launched country meets the same source, review, matching, and stale-data standards as Germany.

### Phase 5 — operations and learning loop

- material-change alerts and automatic match recalculation;
- source health dashboards and coverage SLAs;
- reviewed outcome capture: applied, shortlisted, awarded, actual award, remaining cost, and enrolment;
- privacy-protected aggregate analysis to improve task ordering and identify common blockers;
- partner feeds only after contractual, security, and provenance review.

## Test strategy

- contract tests for every adapter and parser fixture;
- rule-engine unit tests for each comparator and unknown state;
- golden match tests using versioned profiles and scholarship cycles;
- permission/ownership tests for every private record;
- stale/closed/withdrawn scholarship tests;
- timezone and deadline tests;
- grade-scale and language-score boundary tests;
- source-diff tests for changed rules and deadlines;
- bilingual copy and accessibility tests;
- end-to-end journeys for eligible-now, preparable, immutable blocker, ambiguous rule, next-cycle, and funding-gap scenarios.

## Definition of done

The system is ready for a country only when:

- all visible scholarships have an official source and last-checked date;
- current-cycle status and deadline are source-backed;
- scholarship-to-course relationships are explicit rather than inferred from country alone;
- every match factor is explainable and reproducible;
- every preparable gap produces an actionable task;
- immutable blockers are not presented as fixable;
- closed or stale opportunities cannot be recommended as open;
- users can save progress and return on another device;
- account ownership and private evidence access are enforced server-side;
- English and Bangla experiences communicate the same meaning;
- operational staff can review, publish, withdraw, and audit records without code changes.

## Recommended first implementation slice

Build one end-to-end Germany scholarship journey before broad geographic expansion:

1. complete a Bangladesh-focused Study Profile;
2. browse a permitted, reviewed DAAD/Erasmus pilot catalogue;
3. receive an explainable match outcome;
4. open a scholarship linked to appropriate German courses;
5. see `Must be true`, `Your evidence`, `Improve`, and `Deadline` checklists;
6. complete one user task and one evidence-backed task;
7. receive an alternative when a hard rule blocks the current scholarship;
8. save the scholarship and see it in the Study dashboard and calendar.

This slice proves the differentiating product loop. Geographic expansion then becomes a repeatable source-adapter and review operation rather than a new product build for every country.
