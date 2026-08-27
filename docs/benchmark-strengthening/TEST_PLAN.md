# Unified mobility test plan

## Automated gates

Run from the repository root:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm build
pnpm test
pnpm seed
pnpm --filter @probash/api openapi
pnpm --filter @probash/web exec playwright test e2e/unified-mobility.spec.ts
```

The unified domain suite covers coverage ordering, deterministic QA, conservative ROI
and community-safety phrasing. API E2E covers anonymous QuickCheck, official-action
catalogue, structured agency/fee checks, applicant-owned QA, ROI, deadlines/saves,
freshness authorization and honest P1/P2 capability status. Existing suites remain the
regression gate for OTP, eligibility, Work/Study, cases, documents, payments, ledger,
delegation, partner review and outcomes.

## Required assertions

- Missing facts stay unknown; synthetic routes stay `RESEARCH_ONLY`.
- QuickCheck works without an account and includes disclaimer, sources/confidence,
  costs/time when known and preparation gaps.
- Public opportunities never imply Bangladesh access without the explicit field.
- Official handoff/user confirmation never becomes authority-confirmed status.
- A QA snapshot cannot be updated/deleted and readiness requires every check plus
  applicant approval.
- Currency mismatch is rejected; all arithmetic uses integer minor units; debt warnings
  and assumptions are visible.
- User-owned saves, deadlines, cases, applications and sessions reject cross-user access.
- Privileged freshness requires role and recent MFA.
- Safety tools never return guaranteed/conclusive fraud, visa, job or admission claims.
- Bangla and English keys match; critical copy review gates still apply.

## Manual/operational gates before production

1. Run PostgreSQL migration/integration and RLS tests with two distinct application
   identities; verify immutable rules and encrypted namespace contents.
2. Review phone/low-bandwidth/shared-device flows on representative Android devices,
   keyboard-only web, screen reader and 200% zoom.
3. Validate every government URL and source snapshot with the named owner.
4. Review Bangla critical money, consent, safety, rights and official-handoff copy.
5. Threat model upload, delegation, advisor/centre, community, payments and connectors.
6. Confirm retention, DSAR, incident response, customer support and escalation runbooks.
7. Complete corridor/programme evidence before raising coverage maturity.

P1/P2 typed foundations and screens are not production-complete until their capability
registry entries are live and all listed external gates are evidenced.
