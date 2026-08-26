# Worker/student mobile app (Expo)

**Status: scaffold.** Structure, navigation and the shared-package wiring are here;
the screens are the Bangla-first entry points, not the full product.

This app is deliberately **excluded from the root pnpm install** (see
`pnpm-workspace.yaml`) so the trust-rail slice installs and builds in seconds. Nothing
in CI builds it yet — that is stated plainly rather than implied by a green badge.

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

## Next steps (Epic 2–3 on mobile)

1. `expo-secure-store` session storage + phone OTP onboarding.
2. `expo-sqlite` offline cache for case tasks and downloaded country packs.
3. Document capture with client-side compression and deferred upload.
4. QR scanning that resolves against `/verify/job/:publicId`.
5. Maestro E2E flows: onboarding, offline, camera mock, voice fallback (§66).
