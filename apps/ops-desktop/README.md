# Assisted-service desktop app (Tauri)

**Status: shell.** §14.4 is explicit that a worker desktop app must _not_ be built.
This app exists for the people who help workers: Digital Centre / assisted migration
desks, recruiting agency branches, and — if approved — government or mission desks.

Like `apps/mobile`, it is excluded from the root pnpm install and from CI. Nothing
here is production-ready, and this file says so rather than implying otherwise.

## Why Tauri (§42.4)

Small footprint on old branch machines, Windows/macOS/Linux, a controlled Rust
boundary for local device integrations (document scanner, receipt printer, webcam,
barcode/QR), and an offline queue for intermittent connectivity.

**Deliberate sequencing:** the web portal comes first. Native device capability is
activated only when a real desk workflow needs it — not because Tauri makes it
possible.

## Operator constraints this app must enforce (§27)

An assisted-service operator may explain, scan, upload, help fill forms, arrange
appointments and print. They may **not** collect recruitment money, alter a verified
cost, promise a visa, change a payee, modify a contract without audit, or impersonate
a worker's consent. `@probash/auth` already denies those actions server-side; the
desktop UI must never present them either.

## Running it

```bash
cd apps/ops-desktop
pnpm install
pnpm tauri dev          # requires the Rust toolchain
```

## Next steps

1. Operator sign-in with MFA against the same IAM as the portals (§42.11).
2. Consent capture on the worker's own device or with recorded in-person evidence.
3. Offline queue with explicit, visible sync state — never silent local truth.
4. Receipt printing from the API receipt payload (§24), including the SMS text.
