# ProbasJatra — Human Talent Journey OS

Status: product and implementation strategy  
Date: 26 August 2026

## The product decision

ProbasJatra is not a directory of countries, jobs, courses, and articles. It is the evidence-led operating system that helps a person from Bangladesh turn one ambition into a safe, accountable journey to either foreign work or higher study.

Every account has one primary journey type:

- **Work talent** — a person preparing skills and evidence for a lawful foreign job.
- **Study talent** — a person preparing academic evidence and finance for higher study abroad.

People can explore both paths publicly and can change their primary path later, but their private workspace is deliberately organized around one current goal. This prevents a generic dashboard from mixing incompatible requirements, costs, risks, and timelines.

## USP

> **One verified talent profile. One clear journey. Every next step, cost, deadline, and proof in one place.**

Bangla expression:

> **স্বপ্ন থেকে প্রমাণিত যাত্রা—এক প্রোফাইল, একটি স্পষ্ট পথ, প্রতিটি ধাপে কাজ, খরচ, সময় ও প্রমাণ।**

The defensible difference is not another opportunity listing. It is the connected record that follows a person from first intention to verified outcome:

1. identify the right route;
2. understand personal readiness;
3. compare a real opportunity;
4. verify claims and costs;
5. prepare only the evidence required now;
6. track applications, decisions, money, and deadlines;
7. prepare departure and arrival; and
8. record whether the promised outcome actually happened.

## Product promise

At any moment, a user must be able to answer five questions without searching across the site:

1. Where am I in my journey?
2. What needs my attention now?
3. Why does it matter and what evidence supports it?
4. What will it cost and when is it due?
5. What is the next safe action?

No score, card, warning, or status is allowed to end without a useful next action or an honest explanation of what is not yet known.

## The core object: Talent Journey

A Talent Journey is:

> one person + one primary path + one target opportunity or exploration goal + one destination context + one evidence trail

It owns the person's tasks, documents, decisions, applications, costs, deadlines, verification requests, delegated family access, alerts, support, and eventual outcome.

### Work journey chapters

1. Direction — occupation, destination, and lawful route fit
2. Readiness — passport, skills, experience, language, and registration
3. Opportunity — job, employer, recruiter, demand, salary, and contract
4. Trust — source, licence, fee, claim, and payment verification
5. Application — submission, interview, offer, permit, and visa
6. Departure — documents, medical, training, travel, and contact plan
7. Arrival — employer handover, housing, first pay, and issue reporting
8. Outcome — actual role, pay, cost, safety, and repeat mobility

### Study journey chapters

1. Direction — degree level, subject, destination, and intake fit
2. Readiness — academic profile, language, documents, and timeline
3. Programme — institution, accreditation, admission rules, and deadlines
4. Funding — tuition, living cost, scholarship, and proof of funds
5. Application — materials, submission, decision, and conditions
6. Visa — official requirements, interview, payment, and evidence
7. Arrival — housing, insurance, enrolment, and first-term plan
8. Outcome — study progress, actual cost, work rights, and post-study route

## ExportHQ patterns adapted for people

| ExportHQ operating object | ProbasJatra equivalent                   | Product behavior                                                                 |
| ------------------------- | ---------------------------------------- | -------------------------------------------------------------------------------- |
| Organization account      | Personal talent account                  | Explicit top-right identity, primary path, privacy, and sign-out control         |
| Export Lane               | Talent Journey                           | Every task, document, cost, signal, and decision stays in one journey context    |
| Company/product profile   | Migration Passport                       | Reusable, person-owned evidence profile completed progressively                  |
| Opportunity engine        | Job/programme route intelligence         | Public value first; saving and personalization after sign-in                     |
| Readiness                 | Work/Study readiness                     | Conditional requirements, unknown allowed, evidence separated from self-claims   |
| Attention Center          | Needs you now                            | Ranked blockers and deadlines with reason, evidence, and next action             |
| Documents/requirements    | Evidence vault                           | Each file is linked to a requirement or journey, never an orphaned blob          |
| Export economics          | Migration/funding ledger                 | Official, expected, requested, and paid costs remain visibly distinct            |
| Buyer/deal pipeline       | Employer/university application pipeline | Every card opens detail and has an accountable next step                         |
| Shipment/proceeds         | Departure, arrival, and outcome          | The platform stays useful after visa approval and measures whether promises held |

Enterprise tenancy, subscription tiers, buyer CRM, and trade logistics are intentionally not copied. They do not serve the individual migration journey.

## Onboarding strategy

Onboarding is a short act of direction, not a long eligibility form.

It asks only:

1. **Which future are you building now?** Work abroad or higher study abroad. Exactly one is required.
2. **Where are you today?** Exploring, preparing, applying, or already progressing.
3. **What would make this journey real?** A short goal in the user's own words; optional and editable.

This creates the account classification and workspace defaults. Passport, qualifications, destination, costs, and evidence are requested later when they can produce an immediate useful result.

Changing the primary path never deletes the other journey's records. It only changes the account's home context, navigation emphasis, and recommended next actions.

## Account and navigation architecture

### Public navigation

- Verify
- Work
- Study
- Countries
- My journey
- Account / Sign in
- Help

### Account control

The top-right account control always shows:

- avatar or initials;
- user name or email;
- primary path badge: Work talent or Study talent;
- My journey;
- My account;
- Switch primary journey;
- Migration Passport;
- Sign out.

Signed-out visitors see **Sign in / Create profile** in the same location.

### Private journey home

The dashboard is a command center, not a catalogue of modules. Its information order is:

1. current chapter and journey progress;
2. one recommended next action;
3. needs-you signals and deadlines;
4. active journey cards;
5. evidence, cost, verification, and support tools;
6. secondary exploration routes.

## Storytelling interaction model

The user should feel movement through a story, not administration of a database.

- **Opening:** “You are building a work/study future.”
- **Chapter:** show the current stage in plain language.
- **Tension:** explain the most important blocker or unknown.
- **Action:** provide one clearly dominant next step.
- **Proof:** show what evidence changes the state.
- **Progress:** reveal completed chapters and the next milestone.
- **Outcome:** continue after departure so the real result can be compared with the original promise.

Operational terms appear only where they help. The interface says “Your next step,” not “task queue”; “Your evidence,” not “asset repository”; and “Journey chapter,” not “workflow stage.”

## Visual direction

The product combines three complementary references without imitating their brands:

- **monday.com:** immediate status scanning, colorful but disciplined state chips, modular work cards, and every summary opening the underlying work.
- **TREVV:** focused product density, restrained panels, compact labels, strong title hierarchy, and a persistent identity control.
- **ProbasJatra:** warm public-service trust, green as the primary signal, Bangla-first readability, safety language, and clear evidence boundaries.

Rules:

- warm white canvas, near-black type, and one confident green action color;
- large editorial headings paired with compact operational labels;
- 14–18px card radii, crisp 1px borders, and restrained shadows;
- rounded cards, but not rounded full-bleed hero edges;
- color communicates category or state, never decoration alone;
- work uses energetic green accents; study uses calm blue-violet accents;
- one primary action per panel;
- mobile cards stack in the same meaning order as desktop.

## Implementation phases

### Phase 1 — identity and direction

- Add an explicit account control to desktop and mobile navigation.
- Replace the legacy phone-OTP mock onboarding with authenticated Work/Study classification.
- Persist primary path, current stage, goal, and onboarding completion in D1.
- Create an account page where path and goal can be changed without losing records.

### Phase 2 — journey command center

- Make the dashboard path-specific by default.
- Add the eight-chapter journey rail and calculate progress from persisted tasks.
- Lead with the next incomplete action and explain why it matters.
- Surface deadlines, unread alerts, missing evidence, and pending reviews as “Needs you now.”
- Keep all cards navigable to the underlying journey or tool.

### Phase 3 — connected public-to-private story

- Frame Work and Study as two human-talent export pathways.
- Send “start” actions to onboarding when no primary path exists.
- Preserve public browsing and verification without an account.
- After onboarding, return users to a personal dashboard already oriented to their selected path.

### Phase 4 — operational maturity

- Add route-specific source freshness and requirement applicability.
- Add evidence review gates, owner/due metadata, and resolved/snoozed attention states.
- Add real partner adapters only after credentials, contracts, security review, and operational ownership exist.
- Add outcome feedback loops that improve route guidance using reviewed, privacy-protected aggregates.

## Non-negotiables

- Public exploration never requires an account.
- Private records never appear in previews.
- Work and study requirements are not mixed into one checklist.
- A user can say “I don't know” and continue.
- Completion requires the right evidence/review state, not only a checked box.
- AI may explain or suggest; it cannot verify a job, admission, visa, payment, or legal status.
- No live integration, approval, employer, institution, or partnership is implied without evidence.
- Every problem shown has a next action, source, or honest unresolved state.
- Account classification changes personalization; it does not silently delete history.

## Success measures

- sign-in to completed Work/Study classification;
- onboarding to first useful next action;
- profile/readiness evidence completion;
- blocker resolution time;
- verified opportunity to submitted application;
- promised versus actual migration cost;
- arrival and outcome-report completion; and
- users who can correctly identify their next action in one glance.
