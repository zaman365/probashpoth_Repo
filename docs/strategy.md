# Platform strategy

**Working codename:** ProbashOS (configurable; never hard-coded)
**Primary market:** Bangladesh · **Primary language:** বাংলা · **Status:** trust rail built, nothing human-verified yet
**Last revised:** 26 August 2026

---

## 1. The problem, stated precisely

Bangladesh has already digitised much of overseas employment. BMET's Overseas
Employment Platform covers aspirant registration, employer and demand verification,
agency workflow, training, medical, emigration clearance and post-arrival stages.

So the gap is **not digitisation**. Adding another portal to a digitised process
solves nothing.

The gap is that a worker still cannot answer four questions before money leaves their
hands:

1. **Is this real?** The job, the employer, the agency licence, the offer letter.
2. **What should it cost?** The lawful total, itemised, before committing.
3. **Where is my money going?** To whom, under what rule, and can it come back.
4. **What do I do next?** The actual next step, in order, in language they can act on.

Every serious harm in this sector — the ৳500,000 paid for a job that never existed,
the visit visa sold as work, the contract that changed at the airport, the tuition
wired to a personal bKash number — happens in the space between those four questions
and the answers.

**A person financing migration by selling land does not need another list of
opportunities. They need to know which claim in front of them is true.**

---

## 2. Mission and promise

> **চাকরি বা পড়াশোনার সুযোগ যাচাই করুন। সঠিক খরচ জানুন। সঠিক পথে আবেদন করুন। নিরাপদে বিদেশ যান।**
>
> Verify the opportunity. Know the real cost. Apply through the right channel. Move
> abroad safely.

The platform succeeds only when a worker can say:

> *I know whether the opportunity is real, how much it costs, who I am paying, why I
> am paying, and exactly what I need to do next.*

Everything in the codebase is downstream of that sentence. Features that do not move a
person closer to being able to say it are not priorities, however attractive they look
in a demo.

---

## 3. Strategic position

**This is not** another overseas job board, a recruiting agency, a visa consultancy, an
education-agent lead marketplace, a remittance app, a lender, or a replacement for
BMET/OEP.

**This is** infrastructure for safe, transparent international labour and education
mobility: the layer that makes the lawful path *easier than the informal one*.

That framing is a constraint, not a slogan. It rules out the fastest revenue in the
sector — selling worker contact data, auctioning leads, ranking by payment — because
each of those converts the platform into the thing it exists to replace.

### The competitive insight

Brokers do not win because they are cheaper or faster. They win because they are
**present, personal and confident** at the moment of decision, and the lawful
alternative is confusing, slow and impersonal.

So the fight is not "platform vs broker". It is **certainty vs confidence**. A broker
offers confidence with nothing behind it. The platform must offer certainty — checkable,
sourced, and delivered with the same immediacy — or it loses to the man who already has
the family's trust.

---

## 4. Who it serves

| Who | What they get | Why they stay |
|---|---|---|
| Low-literacy worker (P1) | Verified opportunities, real cost, voice guidance, family visibility | It is the only place the numbers can be checked |
| Semi-skilled / skilled worker | Route selection, preparation plan, contract diff, milestone payments | The path is legible and the money is traceable |
| Student | Verified institution and offer, honest cost, exam and funding planning | Fraud in study migration is worse, and less policed |
| Family co-pilot | Progress and cost visibility, payment alerts | They are usually the ones paying |
| Foreign employer | Verified candidates, skills evidence, lower no-show and fraud risk, compliance record | Cheaper, safer hiring with an audit trail |
| Licensed agency | Compliance SaaS, digital contracts, audit-ready records, outcome-based reputation | Good agencies currently cannot prove they are good |
| Government / missions | Less informal cash leakage, faster investigation, real cost data, corridor intelligence | Enforcement gets cheaper and evidence-based |
| Institution | Verified applicants, direct payment, less agent fraud | Better applicant quality, fewer disputes |

---

## 5. The product, strategically: five rails

The platform is not a set of features. It is five rails, each of which must hold for
the next to be worth anything.

### Rail 1 — Verification
*Is this real?* A strict taxonomy (`unverified → identity → registry → document →
authority → transaction → outcome`), derived from checked facts, never asserted. Every
badge expands into **what exactly was verified and what was not**. A real agency licence
does not make a specific job real; a real university does not make a PDF offer real.

### Rail 2 — Cost transparency
*What should it cost?* Every line item names payer, payee, legal basis, refundability
and whether a receipt is required. A cost whose legal basis is unresolved **cannot be
collected** — the API refuses to create a payment intent for it. Employer-pays is
structurally supported, not merely encouraged.

### Rail 3 — Eligibility and routes
*Can I actually go?* Deterministic, versioned, source-backed rules with three-valued
logic. Four honest answers: eligible now, may become eligible, not currently eligible,
**cannot determine**. The fourth is the one that matters: a missing fact routes to a
human instead of becoming a confident guess.

### Rail 4 — Money movement
*Where is my money?* No custody. A double-entry mirror ledger records what a licensed
provider confirms; settlement releases only against verified milestones; every failure
mode has a deterministic refund rule. `payment.status` is never financial truth.

### Rail 5 — Protection
*Who helps when it goes wrong?* Fraud scanning against verified records, family
co-pilot, complaints that the accused organisation cannot delete, post-arrival
check-ins, and an assisted-service network for people who cannot self-serve.

**Sequencing matters.** Rails 1–3 make the platform believable. Rail 4 makes it
valuable. Rail 5 makes it trusted. Building 4 before 1–3 would have produced a payment
app with nothing worth paying for.

---

## 6. Design principles, and what each rules out

| Principle | What it rules out |
|---|---|
| **Bangla-first, low-literacy-first** | English-first UI translated later; icon-only controls; dense dashboards; paragraph instructions where a checklist works |
| **Provenance is user-facing** | Any fact without a source and a date; "requirements" as timeless truth |
| **Deterministic over AI** | An LLM answering eligibility; an AI upgrading a verification level; a probability score presented as a visa chance |
| **Unknown is a real answer** | Default-deny presented as a decision; silent gaps in requirement lists |
| **No custody without a licence** | An in-app wallet balance; escrow the platform holds |
| **No dark patterns** | Paid ranking, paid badges, lead sales, hidden commissions, urgency manufacturing |
| **Accessibility is a requirement** | Contrast decided by eye; controls below the touch minimum; motion that cannot be turned off |

These are enforced in code and tests wherever possible — contrast ratios, tap targets,
copy governance, the refusal to collect unconfirmed costs — because a principle that
lives only in a document is a principle that erodes under deadline.

---

## 7. Business model

**The core worker-safety product is free or near-free.** Revenue comes from the parties
who benefit from trust being real.

| Line | Payer | Priority |
|---|---|---|
| Recruitment / compliance fee per verified hire | Foreign employer | Highest |
| Agency compliance SaaS | Licensed recruiter | High |
| Employer SaaS (seats, hiring volume) | Foreign employer | High |
| Institution recruitment and verification workflow | Education institution | High |
| Government / PPP platform contract | Government | Strategic |
| Provider transaction and API fees | Authorised providers | Medium |
| Payment orchestration share (disclosed) | Financial partner | Medium |
| Regulated referral (insurance, financing) | Regulated partner | Secondary |

### Forbidden revenue

Selling worker contact data · lead auctions · paid "verified" badges · paid ranking ·
undisclosed commissions · recruitment charges hidden inside "processing" · charging a
worker for a job promise · arbitrage on government fees · hidden FX spread · fees to
unlicensed intermediaries.

**The test:** if a revenue line would change what a worker is shown, or what they are
told is true, it is not available to us at any price.

### The government pitch

Not "government earns more from migrants". It is: **formalise economic activity that
currently leaks into the informal market, and increase safe successful migration.**
Digitally collected official fees, better tax visibility for legitimate firms, less
fraud investigation overhead, recruitment-cost monitoring aligned with SDG 10.7.1, and
real bilateral negotiation data.

---

## 8. The moat

The moat is explicitly **not the code**. Any competent team could rebuild this
application. What compounds:

1. **The official source graph** — which authority governs which fact, and when it last
   changed.
2. **Versioned corridor rules** — years of effective-dated route history, which is what
   makes an answer defensible.
3. **The verification chain** — employer identity → licence → demand → contract → salary
   → lawful cost, per job.
4. **Outcome data** — which agencies and employers actually deliver, measured after
   arrival rather than promised before departure.
5. **Payment and reconciliation rails** with licensed partners.
6. **Skill Passports** that workers carry between employers.
7. **The assisted-service network** reaching people who cannot self-serve.
8. **Government integration** and, eventually, corridor-level regulatory linkage.

Each takes time and relationships rather than engineering. Together they form a
migration reputation and transaction graph that is expensive to replicate and
increasingly costly to be outside of.

**The long-term policy prize:** for a covered corridor, no final emigration clearance
without a verified job record and a traceable payment trail. That requires formal
government adoption; it cannot be imposed by a private product, and the strategy must
not assume it.

---

## 9. Where we actually are

**Built and tested:** the trust rail end to end — onboarding, source-backed routes,
verified jobs with public QR verification, deterministic eligibility with decision
traces, the cost engine, the fraud scanner, cases with tasks and milestones, the
double-entry ledger with milestone-gated settlement, the family co-pilot, document
wallet, and the public website with country vaults for eleven corridors.

**Deliberately not built, and flagged in the product rather than faked:** Temporal
workflows, the PostgreSQL adapter, live payment and government integrations, malware
scanning, field-level encryption, the full study engine, and the employer / agency /
admin / provider portals.

**The honest state of the data:** country vault figures are researched from official
sources and carry their year and citation, but `verifiedBy` reads
`research:not-human-verified` on every one. Fifteen figures are marked "not confirmed
yet" rather than guessed. All job, employer and agency records are synthetic and
labelled. Bangla critical copy is authored but unreviewed, and the release gate blocks
on it.

**Nothing here should be shown to a real worker as fact yet.** That is a data and
review problem, not an engineering one — which is the correct problem to have at this
stage.

---

## 10. Sequencing

| Phase | Objective | Gate to the next phase |
|---|---|---|
| **0. Foundation** *(done)* | Trust rail, vertical slice, public site | Tests green; nothing faked |
| **1. Verified truth** | Human review of route and vault data; real employer and agency verification for one corridor | A named reviewer stands behind every published figure |
| **2. Transaction rail** | Licensed payment partner; milestone settlement with real money | Legal sign-off on custody boundary and cost legality |
| **3. Corridor depth** | One corridor end to end with real workers and employers | Measured cost and outcome data, not sign-ups |
| **4. Institutional surfaces** | Employer, agency and provider portals | Demand from verified organisations |
| **5. Study engine** | Institution verification, offer authenticity, funding | Institution partnerships that permit verification |
| **6. National rail / PPP** | Government integration, corridor linkage | Formal adoption |

**The discipline:** each phase is gated on *evidence*, not on the previous phase's code
being finished. Phase 2 without Phase 1 is a payment app for unverified claims.

---

## 11. How success is measured

**Primary:** verified placements completed at or below the lawful cost, with the worker
still employed at 6 and 12 months.

**Safety and economic:**
- median and 90th-percentile total cost paid by a worker, per corridor
- share of payments made through traceable channels
- money recovered after a failed process
- complaints upheld, and time to resolution
- fraud attempts detected before payment

**Product:**
- share of users who complete a verification before their first payment
- eligibility answers that resolve to "cannot determine" (a data-quality signal, target
  falling)
- route data freshness against the §68 cadence
- Bangla critical copy at `human_reviewed`

**Explicitly not success metrics:** registrations, app installs, page views, jobs listed,
or "countries covered". Each can be inflated while the platform gets less safe, and the
last one is actively dangerous: 249 countries in a database is not 249 corridors we can
stand behind.

---

## 12. Strategic risks

| Risk | Why it is serious | Mitigation in the design |
|---|---|---|
| **Regulatory dependency** | Payment, recruitment and data-sharing all require permissions we do not hold | Provider abstraction, custody boundary in ADR 0004, compliance workstreams gate each capability |
| **Data freshness debt** | A stale requirement becomes a fraud vector as soon as the rule changes | Everything versioned and effective-dated; freshness shown to users; §68 review cadence |
| **Cold start on verified supply** | Workers come for verified jobs; employers come for verified workers | Lead with the free verification and cost tools, which have value with zero supply |
| **Fraud adapts** | Brokers will route around checks and around the platform | Deterministic taxonomy that can be extended; the scanner and the education page share one list; family alerts and receipts make off-platform payment visible |
| **Adoption by the least-served** | The people who most need this are least able to use software | Assisted-service network, voice, family co-pilot, no-JavaScript paths, phone-only onboarding |
| **Mission drift under revenue pressure** | The fastest money in this sector is the money that breaks the product | Forbidden-revenue list and trust invariants as constraints, not preferences |
| **Overclaiming** | One "verified" that turns out false costs more than a hundred honest gaps | Verification taxonomy, expandable badges, "not confirmed yet" as a first-class state |

---

## 13. Trust invariants

Non-negotiable. If a decision conflicts with one of these, the decision changes.

1. A worker can see every platform-known cost before committing.
2. A worker can see who earns every fee.
3. Commercial relationships are never hidden.
4. Search ranking is never sold.
5. Personal data is never sold.
6. Financial incentives never change an eligibility answer.
7. AI never upgrades a verification level.
8. A complaint cannot be deleted by the organisation complained about.
9. A suspended agency or employer triggers review of every affected case.
10. Route changes notify affected users.
11. Admin actions are audited.
12. **The company must be willing to lose revenue rather than route a worker into an
    unverified transaction.**

---

## 14. Open questions that need a human decision

These are not engineering choices, and the platform should not quietly settle them by
default:

1. **Which corridor goes first**, and on what basis — volume, risk, or the willingness
   of a specific employer and agency to be verified.
2. **Who signs off on published route data**, and what qualification that person needs.
3. **What the platform charges an employer**, and whether per-hire pricing creates any
   incentive to under-verify.
4. **Whether assisted-service operators are employees, franchisees or partners** —
   this determines liability when one of them takes cash.
5. **What happens to a worker mid-process when a route closes** — refund policy,
   whose balance sheet absorbs it.
6. **The data-sharing basis with government**, and the limits the platform will not
   cross even when asked.
7. **Whether to publish agency and employer outcome scores**, given the defamation and
   retaliation exposure that comes with being right.

---

## 15. The final test

When choosing between more features and more trust — **trust**.
Between AI convenience and source-backed determinism — **determinism**.
Between one clever universal app and interfaces built for a low-literacy worker, a
mobile student and a desk operator — **the specific interfaces**.
Between platform revenue and a fee structure that recreates broker exploitation —
**reject the revenue**.

The platform wins the day a worker in Narayanganj checks a job on their own phone,
sees the real cost, and walks away from the broker without needing anyone's permission.
