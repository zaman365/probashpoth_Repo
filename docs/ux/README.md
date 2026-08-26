# UX rules

The design target is persona **P1**: a worker on an inexpensive Android phone, on
intermittent connectivity, who may read limited Bangla and is the person fraud targets
hardest. Everything below follows from that.

## Non-negotiable interaction rules (§15)

- One main question per screen. The home screen is seven large actions, not a
  dashboard.
- Tap targets ≥ **48px**; primary actions **56px**. Enforced by a token and a test.
- Text **and** icon — never an icon alone for a critical function.
- Optional audio for every key instruction (`ListenButton`). Contracts, fee totals and
  risk warnings must be listenable.
- Amounts are rendered prominently, in their own larger type step.
- Refundable vs non-refundable is distinguished **visually and in the audio summary**.
- Confirmations require an explicit positive action. No pre-ticked consent.
- The offline state is shown, never silently stale.
- Never require email for worker onboarding. Phone OTP first.
- Family delegation is explicit, scoped and revocable.

## Copy principles (§74)

Never write:

- "Guaranteed visa", "100% chance", "Pay now to reserve visa"
- "Approved job" unless the approval source and state are shown

Use instead (the exact keys live in `packages/i18n`):

| Bangla                     | English                                  | Key                                     |
| -------------------------- | ---------------------------------------- | --------------------------------------- |
| যাচাইকৃত চাকরি             | Verified job                             | `job.verifiedJob`                       |
| সর্বশেষ যাচাই              | Last verified                            | `verification.lastVerified`             |
| এই তথ্যের সরকারি উৎস       | Official source for this information     | `verification.officialSource`           |
| আপনার মোট সম্ভাব্য খরচ     | Your total expected cost                 | `cost.title`                            |
| এই টাকা কাকে যাচ্ছে        | Who receives this money                  | `cost.whoGetsThisMoney`                 |
| ফেরতযোগ্য / ফেরতযোগ্য নয়  | Refundable / Not refundable              | `cost.refundable`, `cost.nonRefundable` |
| এখন টাকা দেওয়ার দরকার নেই | No payment is needed now                 | `cost.noPaymentNeededNow`               |
| মানব সহায়তা নিন           | Get human help                           | `eligibility.requestHumanReview`        |
| এই তথ্য এখনও যাচাই হচ্ছে   | This information is still being verified | `verification.pending`                  |

A test scans both catalogues for guarantee language outside the strings that exist to
_warn_ about it.

## The four eligibility answers (§19)

| Answer                  | When                                         | What the UI must do                   |
| ----------------------- | -------------------------------------------- | ------------------------------------- |
| You are eligible now    | every mandatory requirement is satisfied     | show the trace, still no visa promise |
| You may become eligible | every failing requirement is fixable         | show the preparation steps            |
| Not currently eligible  | a requirement cannot be fixed by preparation | explain exactly which one             |
| We cannot determine     | a fact or a source is missing                | offer a human, never guess            |

A probabilistic score is never displayed.

## Verification disclosure (§75)

A "Verified" badge is always expandable into _what exactly was verified_, by which
method, against which source, and — equally important — **what was not checked**. The
`VerifiedBadge` component uses `<details>` so this disclosure works with no JavaScript.

## Accessibility gates (§66)

- Automated axe checks and manual screen-reader passes.
- 200% zoom on web; keyboard operability everywhere.
- Contrast is verified by a unit test in `@probash/design-tokens`, not by eye.
- Bangla line height is larger than Latin — conjuncts need the room.
