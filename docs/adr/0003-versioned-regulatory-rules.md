# ADR 0003 — Versioned, source-backed regulatory rules

- **Status:** Accepted
- **Date:** 2026-08-25
- **Blueprint refs:** §7, §9, §37, §38, §48, §68, §75

## Context

Host-country migration requirements change without notice and differ per route, occupation and
year. A platform that hard-codes "Germany needs X" becomes a fraud vector the moment X changes.
An LLM that answers eligibility questions from memory is the same failure with better grammar.

## Decision

1. **A rule is data, not code.** Eligibility is expressed in a typed, Zod-validated JSON rule DSL
   (`packages/rules`) with a three-valued interpreter (true / false / **unknown**). Rules are never
   arbitrary JavaScript functions.
2. **Unknown is a first-class outcome.** Missing facts or incomplete sources produce
   `result: "unknown"` and route to human review — never a guess, never a default-deny presented
   as a decision (§19, "We cannot determine").
3. **Everything is versioned and effective-dated.** `route_version`, `rule_version`,
   `fee_rule`, `source_snapshot`. Nothing is stored as a timeless fact. Records carry
   `sourceIds`, `effectiveFrom`, `effectiveTo`, `verifiedAt`, `verifiedBy`, `publicationStatus`.
4. **Provenance is user-facing** (§38): every requirement, fee and status shown to a user can
   render its official source and last-verified time. Freshness state (`fresh | ageing | stale |
unknown`) is computed from the review cadence in §68 and shown, not hidden.
5. **Every evaluation emits a `DecisionTrace`** listing satisfied rules, unsatisfied rules, missing
   facts and source refs. The user-facing explanation is _generated from the trace_, never authored
   independently by a model.
6. **The ingestion pipeline is** `source → raw snapshot (hashed) → normalized extract → diff →
human review → version publish`. Publication is a permissioned, audited action.
7. **No probabilistic visa score is ever displayed.** AI may explain a trace; it cannot change a
   result or upgrade a verification level (§41, §76.7).

## Consequences

- Seeding a country is not "add a row"; it is sourcing, versioning and review. Slower on purpose.
- Route data can be legally defended and independently audited.
- The rule interpreter is small and boring by design — auditability beats expressiveness.
