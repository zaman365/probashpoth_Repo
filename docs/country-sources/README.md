# Official source registry

Every route requirement, fee and status shown to a user must trace to an official
source with a retrieval time and a review cadence (§37, §38, §68). Sources live in
`data/seed/sources.json`; the API exposes them at `GET /api/v1/sources`, and the UI
renders them with a freshness badge.

## Freshness

`freshnessOf(lastReviewedAt, reviewCadenceDays)` computes:

| State     | Meaning                                                        |
| --------- | -------------------------------------------------------------- |
| `fresh`   | reviewed within the cadence                                    |
| `ageing`  | up to twice the cadence                                        |
| `stale`   | beyond twice the cadence — needs review before it is relied on |
| `unknown` | never reviewed. **Never** silently treated as fresh            |

## Review cadence (§68)

| Data                                | Cadence                                             |
| ----------------------------------- | --------------------------------------------------- |
| Critical visa / work-permit rules   | ≤ 7 days, or the source's own cadence               |
| Employer accreditation              | near-real-time / daily where the source supports it |
| Recruiter licence                   | daily / near-real-time where the source supports it |
| Financial amounts                   | on source change, plus scheduled review             |
| Institution sponsor / accreditation | regular official verification                       |
| Emergency contacts                  | quarterly minimum, and on change                    |

## Seeded sources

Bangladesh: BMET Overseas Employment Platform, Ministry of Expatriates' Welfare and
Overseas Employment, Wage Earners' Welfare Board, Probashi Kallyan Bank, Bangladesh
Bank, ILO fair-recruitment resources.

Destinations: Qatar (Ministry of Labour), Saudi Arabia (HRSD, Qiwa), UAE (MOHRE),
Singapore (MOM), Malaysia (Immigration Department), South Korea (EPS), Japan
(Immigration Services Agency / MOJ), Germany (Make it in Germany, German Embassy
Dhaka), United Kingdom (GOV.UK), Canada (IRCC), Australia (Home Affairs), New Zealand
(Immigration NZ).

## Rules for adding a source

1. Link the **official** domain. No aggregators, no blogs, no agency websites.
2. Record the authority in Bangla and English, plus a review cadence.
3. Store a hash and timestamp of each snapshot; never copy bulk copyrighted text into
   the repository — extract the specific facts you need and cite the source.
4. Requirements reference sources by id, so a source change surfaces everything that
   depends on it.

## Status of the ingestion pipeline

The pipeline shape (`source → snapshot → extract → diff → review → publish`) is fixed
by ADR 0003 and the schema supports it (`source_snapshot`, versioned rules and routes).
**No automated fetcher runs yet** — `liveOfficialSourceFetch` is off, and the seeded
route data is marked `verifiedBy: "seed:not-human-verified"` precisely so it cannot be
mistaken for reviewed production data.
