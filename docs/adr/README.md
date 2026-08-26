# Architecture decision records

| ADR                                        | Decision                                                                                 | Why it matters                                                                                   |
| ------------------------------------------ | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| [0001](0001-platform-architecture.md)      | TypeScript monorepo, shared domain packages, per-surface runtimes, persistence as a port | Two surfaces disagreeing about a fee or an eligibility answer is a worker-harm event             |
| [0002](0002-bangla-first-accessibility.md) | Bangla-first, low-literacy-first, listen-aloud, critical copy gated on human review      | An English-first product translated later produces Bangla the most vulnerable user cannot act on |
| [0003](0003-versioned-regulatory-rules.md) | Rules are versioned, source-backed data with three-valued logic and a decision trace     | Hard-coded host-country requirements become a fraud vector the moment they change                |
| [0004](0004-payment-custody-boundary.md)   | No custody of user funds; double-entry mirror ledger; milestone-gated settlement         | Holding customer funds without a licence would be unlawful and would destroy the mission         |
| [0005](0005-worker-native-api.md)          | Incrementally port one contract-tested API to Fetch-native Workers                       | Prevents a second business API and framework-specific edge risk                                  |
| [0006](0006-clerk-identity.md)             | Clerk sessions map to stable PostgreSQL users through audited identity links             | Provider identifiers and email must not become unsafe domain keys                                |
| [0007](0007-neon-hyperdrive.md)            | EU Neon is authoritative; Hyperdrive is accepted after staging benchmark                 | Provides relational integrity, RLS and an intentional edge connection path                       |
| [0008](0008-private-r2-documents.md)       | Private EU R2 uses quarantine, isolated scanning and clean-only access                   | Sensitive bytes can never become downloadable on a client assertion                              |
| [0009](0009-temporal-workflows.md)         | Queues deliver short jobs; Temporal remains for long-running cases pending comparison    | Delivery retries and durable human business workflows are different responsibilities             |
| [0010](0010-d1-postgres-cutover.md)        | Signed export, shadow reconciliation, write freeze and explicit rollback                 | Avoids two sources of truth and makes aborting safe                                              |
| [0011](0011-hostname-boundaries.md)        | Separate public, app, API and operations hostnames progressively                         | Enables independent controls without breaking the current journey                                |

## Writing a new ADR

Copy the shape of an existing one: context, decision, consequences, alternatives
considered. An ADR is required for any change to the architecture rules above, to the
payment or identity boundary, or to how regulatory data is published (§83).
