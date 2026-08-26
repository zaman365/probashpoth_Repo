# Architecture decision records

| ADR                                        | Decision                                                                                 | Why it matters                                                                                   |
| ------------------------------------------ | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| [0001](0001-platform-architecture.md)      | TypeScript monorepo, shared domain packages, per-surface runtimes, persistence as a port | Two surfaces disagreeing about a fee or an eligibility answer is a worker-harm event             |
| [0002](0002-bangla-first-accessibility.md) | Bangla-first, low-literacy-first, listen-aloud, critical copy gated on human review      | An English-first product translated later produces Bangla the most vulnerable user cannot act on |
| [0003](0003-versioned-regulatory-rules.md) | Rules are versioned, source-backed data with three-valued logic and a decision trace     | Hard-coded host-country requirements become a fraud vector the moment they change                |
| [0004](0004-payment-custody-boundary.md)   | No custody of user funds; double-entry mirror ledger; milestone-gated settlement         | Holding customer funds without a licence would be unlawful and would destroy the mission         |

## Writing a new ADR

Copy the shape of an existing one: context, decision, consequences, alternatives
considered. An ADR is required for any change to the architecture rules above, to the
payment or identity boundary, or to how regulatory data is published (§83).
