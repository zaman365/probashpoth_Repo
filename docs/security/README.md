# Security

## Reporting a vulnerability

Report privately to the project security contact (set this to a monitored address
before the first external deployment — it is intentionally left unset here rather than
pointing at an address nobody reads). Please do not open a public issue.

Include: what you found, how to reproduce it, and the impact you believe it has. We
will acknowledge, investigate, and tell you what we changed.

## Target

- **OWASP ASVS Level 2** as the baseline.
- **Level 3-inspired controls** for identity, payments, documents and admin (§50).

## What is implemented in this slice

| Control                                                                  | Where                                              |
| ------------------------------------------------------------------------ | -------------------------------------------------- |
| Zod validation at every API boundary                                     | `apps/api/src/common/zod.pipe.ts`                  |
| Deny-by-default authorization with obligations (audit, masking, reason)  | `packages/auth`                                    |
| Immutable audit events, separate from application logs                   | `apps/api/src/core/audit.service.ts`               |
| Access audit on every sensitive read                                     | authorization obligations, honoured by controllers |
| Break-glass access requires a recorded reason                            | `packages/auth/src/authorize.ts`                   |
| Admin has no routine access to sensitive documents                       | same                                               |
| OTP throttling, attempt limits, constant-time code comparison            | `apps/api/src/modules/identity`                    |
| Session tokens stored hashed; httpOnly cookie on web                     | `session.guard.ts`, `apps/web/lib/api.ts`          |
| Idempotency keys on every payment mutation                               | `packages/ledger`, `payments.service.ts`           |
| Signature-verified, replay-safe provider webhooks                        | `payment-provider.ts`                              |
| File magic-number validation and size limits on upload                   | `documents.service.ts`                             |
| Signed, non-PII QR payloads with key id                                  | `modules/jobs/qr.service.ts`                       |
| Analytics payloads scanned for personal data                             | `packages/analytics`                               |
| Security headers (CSP-adjacent, nosniff, frame-deny, permissions policy) | `apps/web/next.config.ts`                          |
| Dependency audit, secret scan, SBOM, synthetic-data check                | `.github/workflows/ci.yml`                         |

## What is deliberately NOT implemented yet

Stated plainly so nobody assumes coverage that does not exist:

- **Malware scanning** of uploaded documents — documents are stored with
  `malwareScanStatus: "pending"` and no scan runs.
- **KMS envelope encryption and field-level encryption** of national identifiers — the
  schema has the ciphertext columns; the crypto is not wired.
- **Signed URLs / object storage** — the development driver writes to a local
  directory.
- **Rate limiting beyond OTP**, WAF, and egress allowlists for regulatory fetchers.
- **MFA enforcement** for institutional users (the authorization model already refuses
  them without it; no IAM is connected yet).

## Threat model summary

### Identity (§17, §42.11)

| Threat                    | Mitigation                                                                               | Residual                                         |
| ------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------ |
| OTP brute force           | 6-digit code, 5-attempt cap, 5-minute expiry, throttle per number, constant-time compare | Needs a distributed counter (Redis) before scale |
| SIM swap / number reuse   | Session bound to user, delegation is explicit and revocable                              | Recovery through verified identity is not built  |
| Assisted onboarding abuse | Consent recorded with capturing operator id and evidence kind                            | Operator identity assurance depends on IAM       |

### Payments (§25, ADR 0004)

| Threat                        | Mitigation                                                                                                       | Residual                                                         |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Double charge on retry        | Idempotency key required; replays return the original intent                                                     | —                                                                |
| Forged provider callback      | HMAC signature over a canonical field list; unknown transaction ids rejected                                     | Real providers need their own verification adapters              |
| Early release of funds        | Settlement refuses unless the milestone is verified; the ledger refuses again independently                      | Milestone attestation is platform-side in development            |
| Silent ledger drift           | Balanced entries enforced; entries immutable; corrections are reversing entries; trial balance asserted in tests | Reconciliation batches against provider statements are not built |
| Collecting an unlawful charge | An intent cannot be created for an item whose legal basis is `null` or `false`                                   | Legal basis must be sourced per corridor                         |

### Documents (§29)

| Threat                     | Mitigation                                                                                  | Residual                             |
| -------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------ |
| Malicious upload           | Magic-number check, declared-type match, 8 MB cap                                           | No malware scan yet                  |
| Over-exposure to employers | Sensitive types gated; consent required; sharing is scoped, expiring, revocable and audited | Watermarking and signed URLs pending |
| Quiet data retention       | Shares expire; revocation is a first-class action                                           | Retention/erasure jobs not built     |

## Never log

Full passport or NID values, bank details, visa documents, authentication secrets, or
raw document contents. Audit events carry identifiers and reasons — not payloads. The
offer scanner stores a digest of its input, never the message text.
