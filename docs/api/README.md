# API

`openapi.json` in this directory is **generated from source** (§46):

```bash
pnpm --filter @probash/api openapi
```

CI regenerates it and fails the PR if the committed file has drifted, so the spec
cannot quietly fall behind the code.

- Base path: `/api/v1`
- Interactive docs while the API is running: `http://localhost:3001/api/v1/docs`
- Auth: `Authorization: Bearer <session token>`; the web app keeps that token in an
  httpOnly cookie and proxies requests server-side.
- Mutations that move money require an `Idempotency-Key`-style key in the body
  (`idempotencyKey`), and provider webhooks are signature-verified and replay-safe.

## Endpoint groups

| Group         | Notable behaviour                                                                                                                     |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `identity`    | Phone OTP only. Consent is required to create an account. The dev OTP is returned **only** outside production.                        |
| `catalogue`   | Countries carry an operational support status; routes are versioned and carry freshness.                                              |
| `eligibility` | Returns a decision trace with four outcomes; anonymous evaluation is supported and correctly returns `unknown`.                       |
| `jobs`        | `GET /verify/job/{publicId}` is public and answers for _any_ id, including `not_found`. Returns a signed, non-PII QR payload.         |
| `scanner`     | `POST /verify/offer` is public and unauthenticated by design. Verdicts are derived from deterministic checks.                         |
| `cases`       | Tasks and milestones are generated from the route; a paused route cannot start a case.                                                |
| `payments`    | Intents refuse unlawful or unconfirmed costs; only a confirmed webhook posts to the ledger; settlement requires a verified milestone. |
| `documents`   | Magic-number validation; uploads are stored `unverified` and `pending` scan.                                                          |
| `delegations` | Family co-pilot invitations, scoped permissions, revocation.                                                                          |

## Typed clients

`@probash/contracts` exports the Zod schemas **and** `createApiClient`, which validates
responses against the same schemas the API validates against. Web, mobile and the
operator desktop app all use it, so contract drift fails loudly at the boundary
instead of rendering as something plausible but wrong.
