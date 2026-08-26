# ADR 0004 — Payment custody boundary and double-entry ledger

- **Status:** Accepted
- **Date:** 2026-08-25
- **Blueprint refs:** §24, §25, §42.12, §76, §83

## Context

Milestone-controlled payment is the core anti-exploitation mechanism: money moves only when a
verified thing has happened. The naive implementation is a platform-held wallet. In Bangladesh,
holding customer funds is a regulated activity; building custody without the licence would be
both unlawful and the fastest way to destroy the platform's mission.

## Decision

1. **The platform does not custody user funds.** No platform wallet, no platform-held balance.
   Funds move between the payer and the licensed provider (bank / MFS / PSP / trust or settlement
   arrangement). The platform orchestrates and records; it does not hold.
2. **The ledger is the record of provider-confirmed reality, not a claim to funds.**
   `packages/ledger` implements strict double-entry: every journal entry balances per currency,
   entries are immutable, corrections are new reversing entries. A `payment.status` column is
   never financial truth (§25).
3. **Money is integer minor units + ISO currency.** Never floating point, never a bare number
   (§83). `Money` is a value object in `packages/domain`.
4. **Providers are adapters** behind one `PaymentProvider` port (create intent, status, refund,
   settlement instruction, verify webhook, reconcile). Development uses an explicit **mock**
   provider. We never fake bKash/Nagad APIs in production, and no live channel is enabled before
   commercial and legal onboarding with that licensed provider.
5. **Mutations are idempotent.** Every payment mutation and every provider webhook carries an
   idempotency key; replays are recorded, never double-posted. Webhooks are signature-verified.
6. **Milestones gate settlement, and milestones are evidence-backed** (job offer verified →
   contract signed → medical → permit/visa verified → clearance → departure → arrival →
   employment verified). Release rules are route-specific and contractual, and every failure mode
   in §25 has a deterministic allocation/refund rule.
7. **Every cost item names `payer`, `payee`, `legalBasis`, `refundable`, `receiptRequired`.**
   A cost that cannot state who receives it and under what basis cannot be charged.

## Consequences

- Settlement latency depends on the licensed partner; the product must communicate provider state
  honestly rather than showing an optimistic in-app balance.
- Reconciliation is a first-class module: provider transactions are matched to journal entries in
  batches, and unmatched items are an operational alert, not a silent drift.
- Until a licensed partner is onboarded, `PAYMENT_PROVIDER=mock` is the only permitted value
  outside development, and the UI must label sandbox transactions as such.
