# Unified mobility feature flags

All flags are validated strings (`true`/`false`) in `@probash/config`.

| Flag                               | Local default | Meaning / activation gate                                           |
| ---------------------------------- | ------------- | ------------------------------------------------------------------- |
| `FEATURE_UNIFIED_MOBILITY_CORE`    | on            | Shared unified projections and contracts.                           |
| `FEATURE_QUICK_CHECK`              | on            | Anonymous deterministic pre-account check.                          |
| `FEATURE_OFFICIAL_ACTION_HANDOFFS` | on            | Canonical links and user-confirmed tracking only.                   |
| `FEATURE_APPLICATION_QA_GATE`      | on            | Immutable deterministic QA/approval evidence.                       |
| `FEATURE_MOBILITY_ROI`             | on            | Informational integer-minor-unit range calculation.                 |
| `FEATURE_TRUST_CENTER`             | on            | Public methodology and operational freshness model.                 |
| `FEATURE_GROUNDED_COPILOT`         | on            | Deterministic grounded shell; no generative provider needed.        |
| `FEATURE_ADVISOR_NETWORK`          | off           | Named advisors, scope, complaints, payment/legal review.            |
| `FEATURE_SERVICE_NETWORK`          | off           | Verified offers, disclosures, refunds and owner.                    |
| `FEATURE_ARRIVAL_MODE`             | off           | Reviewed country packs, rights/emergency sources and support owner. |
| `FEATURE_JOURNEY_LEARNING`         | off           | Reviewed Bangla modules and accessibility evidence.                 |
| `FEATURE_MODERATED_COMMUNITY`      | off           | Moderation, safeguarding, retention and escalation team.            |
| `FEATURE_OPPORTUNITY_EVENTS`       | off           | Verified hosts, consent, attendance/support operations.             |
| `FEATURE_ASSISTED_CENTRES`         | off           | Centre vetting, audited sessions, cash/identity controls.           |
| `FEATURE_RETURN_REINTEGRATION`     | off           | Verified Bangladesh services and operating partners.                |

Core flags control bounded functionality; turning one on does not promote route
coverage or source confidence. P1/P2 flags stay off until capability-registry status,
evidence, operating owner, security and legal gates all agree. Live source fetch,
licensed payments and Temporal workflows remain false in code because no contracted
adapter is present.
