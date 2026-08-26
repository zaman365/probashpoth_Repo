# ADR 0006 — Clerk identity and account linking

- Status: Accepted, Gate S1 pending
- Date: 2026-08-26

## Decision

Clerk owns authentication and sessions. PostgreSQL `app_user.id` remains the domain identity;
`identity_link` maps Clerk or transitional Sites subjects to it. Email is claim evidence, never an
automatic join key. Personal accounts can enable Work, Study or both. Clerk Organizations represent
institutions and operational teams, with server-side role mapping and MFA for privileged actions.

Existing users claim records through an expiring, audited process. Conflicts require manual recovery.
Production validates tokens against an exact authorized-party list and fails closed when keys are
missing. Sites identity remains only as a migration provider and is removed after the recovery window.
