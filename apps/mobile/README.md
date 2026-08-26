# Worker/student mobile app (Expo)

**Status: engineering-complete mobile client; device evidence gate open.** The
Bangla-first client now covers OTP, Passport, matching, QR verification, cases,
documents, payments, alerts, family access, study applications and outcome follow-ups.

It is part of the root workspace and typechecked in the shared pipeline. Release still
requires low-memory Android, intermittent-network, camera, accessibility and store
review evidence; a green TypeScript build is not a device certification.

## Why Expo (§42.3)

Android first, low-memory phones, offline task/checklist data, camera document
capture, audio playback for the listen-aloud layer, push, deep links into the public
verification page.

## Running it

```bash
cd apps/mobile
pnpm install            # installs Expo into this app only
pnpm expo start
```

Point it at a local API with `EXPO_PUBLIC_API_BASE_URL=http://<your-lan-ip>:3001`.

## What must NOT drift

- No eligibility, cost or verification logic here. Those live in `packages/*` and are
  reached through the API (ADR 0001).
- No literal UI strings: copy comes from `@probash/i18n` (ADR 0002).
- Bangla is the default locale, English is the toggle — never the reverse.

## Release evidence still required

1. Maestro flows for OTP, offline recovery, camera mock and consent revocation.
2. Low-memory Android testing and Bangla screen-reader review.
3. Notification credentials, licensed SMS/payment integrations and store signing.
4. Secure lifecycle testing for cached files and queued document deletion.
