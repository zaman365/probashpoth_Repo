# Source and rules architecture

## Flow

```text
official URL -> immutable snapshot/hash -> normalized source record -> reviewed diff
             -> effective-dated route/rule draft -> independent approval -> publication
```

Sources are versioned evidence. Routes refer to source IDs and an eligibility-rule
version. The three-valued rules engine returns eligible, conditional, ineligible or
unknown with a decision trace; it never fills missing facts. AI is not in this path.

## Trust, status and freshness

A source carries authority, jurisdiction, language, trust tier, status, review cadence,
last review and effective dates. The coverage projection combines these with route
capabilities, but cannot upgrade evidence. Synthetic seed routes are always
`RESEARCH_ONLY`. An overdue source appears in the MFA-protected freshness dashboard.

## Change management

- Never edit a published rule/route version in place.
- Create a draft, attach source evidence, show the diff and affected routes/cases, then
  require a different reviewer to approve publication.
- Record the actor, time, reason, source snapshot and resulting version.
- Notify affected applicants using privacy-safe previews; users open the authenticated
  product for details.
- If a source disappears, mark it unavailable/review-required and lower the supported
  claim. Do not silently retain a “verified” label.

Live scraping/synchronization is deliberately off until an authorized adapter and an
operating owner exist. Manual reviewed publication is the safe default.
