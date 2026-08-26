# Compliance

## What this platform does not claim

Written first, because most migration-sector harm starts with an overstated claim:

- It does **not** decide, influence or guarantee a visa, admission or work permit.
  Those decisions belong to the competent authority.
- It does **not** replace BMET / OEP or any government service. It is designed to
  integrate with them, not to substitute for them.
- It does **not** hold customer funds. It is not a wallet, an escrow, a remittance
  service or a lender (ADR 0004).
- It does **not** operate as a recruiting agency, an education agent, an immigration
  adviser or a law firm.
- No partnership, accreditation or government endorsement exists today. Nothing in
  this repository should be presented as one.

## Workstreams that gate scale (§70)

Each must be closed with named legal counsel and a written position before the
corresponding capability is enabled for real users.

| #   | Workstream                                                            | Gates                                            |
| --- | --------------------------------------------------------------------- | ------------------------------------------------ |
| 1   | Recruitment law and permitted worker-paid costs, per corridor         | Any cost line item marked `legallyAllowed: true` |
| 2   | Payment services licensing (bank / MFS / PSP / trust arrangement)     | Any non-mock payment provider                    |
| 3   | Data protection: lawful basis, retention, cross-border transfer       | Storing real personal data anywhere              |
| 4   | Government data sharing and its legal basis                           | Any government-facing reporting surface          |
| 5   | Employer and agency contracting, including liability for verification | Publishing a real job                            |
| 6   | Education-agent regulation in destination markets                     | The study-abroad engine                          |
| 7   | Consumer protection, complaints and dispute handling                  | Charging any user any amount                     |
| 8   | Anti-money-laundering / KYC obligations of the licensed partner       | Onboarding a payment partner                     |
| 9   | Accessibility conformance target and audit                            | Public launch                                    |
| 10  | Terms, privacy notice and consent copy — reviewed in **Bangla**       | Public launch                                    |

## Cost governance (§5)

Every cost item must state: `payer`, `payee`, `legalBasis`, `amount`, `currency`,
`refundability`, `source`, `valid_from`, `valid_to`, `receipt_required`.

An item whose legal basis is unresolved is shown to the user as **not confirmed** and
cannot be collected — the API refuses to create a payment intent for it. This is
enforced in code (`payments.service.ts`) and covered by tests, not left to policy.

Forbidden revenue, encoded as product constraints: selling worker contact data, lead
auctions, paid "verified" badges, paid ranking, undisclosed commissions, recruitment
charges hidden inside "processing", charging a worker for a job promise, arbitrage on
government fees, hidden FX spread, and fees to unlicensed intermediaries.

## Synthetic data

All data in this repository is synthetic and labelled. CI fails if a seeded record is
unlabelled or if anything resembling a real Bangladeshi mobile number or national
identifier appears under `data/`.
