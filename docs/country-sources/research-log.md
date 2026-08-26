# Country research log

What was gathered for the country vaults (`data/seed/country-profiles.json`), where it
came from, and what is still open. Every figure in the vault carries its source id and
the year it applied to; anything not confirmed against an official page is stored as
`needs_verification` with **no value**, so the platform never guesses (ADR 0003).

Researched 26 August 2026. `verifiedBy` on every profile is
`research:not-human-verified` — a person has not reviewed these yet, and the UI says so
on the page.

## Confirmed figures

| Country   | Path  | Fact                                      | Value                  | Source                                                                                                                                    |
| --------- | ----- | ----------------------------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Germany   | study | Blocked account, minimum balance          | €11,904                | [German Embassy Dhaka](https://dhaka.diplo.de/bd-en/service/2685884-2685884)                                                              |
| Germany   | study | Monthly withdrawal                        | €992                   | [German Embassy Dhaka](https://dhaka.diplo.de/bd-en/service/2128822-2128822)                                                              |
| Germany   | work  | EU Blue Card, standard threshold          | €50,700/yr             | [Make it in Germany](https://www.make-it-in-germany.com/en/visa-residence/types/eu-blue-card)                                             |
| Germany   | work  | EU Blue Card, shortage / new entrant / IT | €45,934.20/yr          | [Make it in Germany](https://www.make-it-in-germany.com/en/visa-residence/types/eu-blue-card)                                             |
| Germany   | work  | Opportunity Card, points needed           | 6+                     | [Make it in Germany](https://www.make-it-in-germany.com/en/visa-residence/types/job-search-opportunity-card)                              |
| Germany   | work  | Opportunity Card, monthly funds           | €1,091                 | [German Embassy Dhaka](https://dhaka.diplo.de/bd-en/service/2685670-2685670)                                                              |
| UK        | work  | Skilled Worker standard salary            | £41,700/yr             | [GOV.UK](https://www.gov.uk/skilled-worker-visa/your-job)                                                                                 |
| UK        | work  | Absolute salary floor                     | £25,000/yr             | [GOV.UK](https://www.gov.uk/skilled-worker-visa/your-job)                                                                                 |
| UK        | work  | Discounted rate (new entrant)             | £33,400/yr             | [GOV.UK](https://www.gov.uk/skilled-worker-visa/when-you-can-be-paid-less)                                                                |
| Canada    | study | Living costs outside Quebec               | CAD 20,635/yr          | [IRCC](https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit/get-documents/financial-support.html) |
| Canada    | study | PGWP minimum programme length             | 8 months               | [IRCC](https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/work/after-graduation/eligibility.html)            |
| Japan     | work  | Specified industry fields                 | 19                     | [Immigration Services Agency](https://www.isa.go.jp/en/policies/ssw/nyuukokukanri01_00127.html)                                           |
| Japan     | work  | Language requirement                      | JLPT N4 / JFT-Basic A2 | [Immigration Services Agency](https://www.isa.go.jp/en/policies/ssw/nyuukokukanri01_00127.html)                                           |
| Singapore | work  | NTS Occupation List minimum salary        | S$2,000/month          | [MOM](https://www.mom.gov.sg/passes-and-permits/work-permit-for-foreign-worker/sector-specific-rules)                                     |

## Open questions, carried in the vault as unconfirmed

These are shown to users as "not confirmed yet" with the official page to check. They
are not omitted, because a missing requirement is how someone gets caught out.

| Country             | Path  | What is missing                                       | Why                                                                               |
| ------------------- | ----- | ----------------------------------------------------- | --------------------------------------------------------------------------------- |
| UK                  | study | Maintenance funds figure                              | Differs inside/outside London and changes; not confirmed from the rules page      |
| Australia           | study | Financial capacity amount                             | Structure confirmed (12 months of costs, or the income test); figure not surfaced |
| Australia           | work  | TSMIT                                                 | Indexed annually; current figure not confirmed                                    |
| Canada              | work  | Express Entry proof of funds                          | Varies by family size, updated yearly                                             |
| Korea               | work  | Age limit and registration schedule                   | Set per annual announcement, via BOESL in Bangladesh                              |
| Korea               | study | Tuition, funds, TOPIK level                           | Institution-specific                                                              |
| Japan               | study | Tuition and living costs                              | Institution- and city-specific                                                    |
| Singapore           | work  | Sector quota and levy rates                           | Depend on sector and the employer's dependency ratio                              |
| Malaysia            | work  | Current corridor status                               | Can be paused or reopened by government decision                                  |
| Saudi / Qatar / UAE | work  | Lawful recruitment-cost ceiling; employer-borne costs | Corridor- and occupation-specific; belongs to the cost engine per verified job    |

## Method, and its limits

- Official government sources only for figures: mission pages, immigration authorities,
  labour ministries. A Bangladeshi community site was read for **orientation** — which
  questions people actually ask about Germany — and none of its text or figures were
  copied.
- No bulk text is stored. Each vault entry is a short factual statement plus a link.
- Coverage is uneven on purpose: Germany is deep because it was researched first and
  serves as the template; the Gulf corridors carry process and risk rather than figures,
  because the numbers that matter there are per-job and belong to the cost engine.

## Before any of this is shown as verified

1. A named reviewer confirms each figure against the cited page and records the date.
2. `verifiedBy` changes from `research:not-human-verified` to that person.
3. The review cadence in §68 starts: 7 days for critical visa and permit rules.
