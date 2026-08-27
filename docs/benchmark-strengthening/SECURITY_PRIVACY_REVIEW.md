# Security and privacy review

## Controls implemented

- Phone OTP with consent, challenge expiry, attempt limits and request throttling.
- Hashed bearer tokens, expiry/revocation, explicit assisted/delegated session types,
  recent MFA for privileged operational reads, and privacy-safe session listing and
  revocation for shared devices.
- RBAC/ABAC and owner checks at service boundaries; organisation scope is explicit.
- Row-level security for new user-owned normalized tables.
- Field-encrypted PostgreSQL namespaces for sensitive unified records.
- Immutable submission snapshots and QA reviews; applicant approval is recorded.
- Audit records for OTP failures, session revocation, official handoffs, QA and other
  high-impact actions; outbox events contain references rather than raw sensitive data.
- Delegation is permission-specific and revocable. Submission approval is not implied.
- Push/notification types require privacy-safe preview copy.
- Sensitive document upload remains fail-closed unless identity, durable storage,
  residency, quarantine, malware scanning, download audit and approval evidence pass.

## Data minimization

Public QuickCheck needs no account and stores no profile. Public safety tools accept
only structured verification inputs. API responses do not expose phone numbers, token
hashes, document contents, raw risk scores or unrelated case data. Analytics events use
coarse facts and identifiers suitable for pseudonymization.

## Required external review

`LEGAL_REVIEW_REQUIRED`: retention/deletion schedule, DSAR process, cross-border
transfers, identity/biometrics, medical/background data, financial-product advice,
worker-paid fees, government connectors, community moderation, advisor recordings,
assisted-centre cash and public outcome claims.

Before enabling P1/P2 flags, complete threat modelling, penetration testing, mobile
shared-device testing, Bangla accessibility review, incident/support runbooks and named
data-controller/processor responsibilities. No repository flag substitutes for those
approvals.
