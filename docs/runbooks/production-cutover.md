# Standalone production cutover runbook

This runbook does not authorize a domain change. Fill every named owner and evidence reference in the
change record before use.

## Roles

- Cutover commander: unassigned
- Database owner: unassigned
- Identity owner: unassigned
- Abort authority: unassigned
- Operations communications: unassigned

## Preconditions

1. `pnpm release:gate S2` passes; S3 is also required if document intake will open.
2. Staging has passed Bengali/English, mobile-network, accessibility and cross-tenant tests.
3. Clerk production authorized parties, redirects, webhook secret and MFA policies are verified.
4. Neon recovery point, encrypted export, R2 inventory and Worker configuration snapshot exist.
5. D1 export counts, ownership, checksums and final-delta procedure reconcile at 100%.
6. Sites rollback remains deployable and receives no ordinary traffic after a successful switch.

## Execution

1. Announce the write-freeze window and lower DNS TTL at the previously approved time.
2. Disable writes; record the last D1 sequence/timestamp and export the signed delta.
3. Import the delta into PostgreSQL and run count, ownership, referential and checksum reconciliation.
4. Switch the standalone Worker route. Do not change R2 public access; it remains disabled.
5. Smoke-test public deep links, Clerk sign-in/recovery, Work/Study switching, journeys, authorized and
   denied file access, webhooks, queue lag, logs and both locales.
6. End the freeze only after the commander records pass evidence.

## Immediate abort

Restore traffic to Sites and keep PostgreSQL writes frozen if an identity maps to the wrong user, any
cross-tenant access succeeds, reconciliation differs, audit/redaction is absent, the database or queue
breaches its threshold, or rollback is not available. Reconcile before another attempt.
