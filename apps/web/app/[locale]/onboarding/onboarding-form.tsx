'use client';

import { useActionState } from 'react';
import { requestOtpAction, verifyOtpAction, type ActionState } from '../actions';

interface Labels {
  phoneLabel: string;
  sendCode: string;
  otpTitle: string;
  otpLabel: string;
  verify: string;
  consentTitle: string;
  consentBody: string;
  consentAgree: string;
  devNotice: string;
  error: string;
  /** Message keys resolved by the server component (ADR 0002: no literals here). */
  messages: Record<string, string>;
}

/**
 * One question per screen (§15): the number first, then the code and consent.
 * Consent is an explicit positive action — never a pre-ticked box.
 */
export function OnboardingForm({ locale, labels }: { locale: string; labels: Labels }) {
  const [requestState, requestAction, requesting] = useActionState<ActionState, FormData>(
    requestOtpAction,
    {},
  );
  const [verifyState, verifyActionState, verifying] = useActionState<ActionState, FormData>(
    verifyOtpAction,
    {},
  );

  if (!requestState.challengeId) {
    return (
      <form action={requestAction} className="card stack">
        <input type="hidden" name="locale" value={locale} />
        <label htmlFor="phone">{labels.phoneLabel}</label>
        <input
          id="phone"
          name="phone"
          className="field"
          inputMode="tel"
          autoComplete="tel"
          placeholder="01XXXXXXXXX"
          required
        />
        {requestState.error ? <p className="badge badge-danger">{labels.error}</p> : null}
        <button type="submit" className="btn btn-primary" disabled={requesting}>
          {labels.sendCode}
        </button>
      </form>
    );
  }

  return (
    <form action={verifyActionState} className="card stack">
      <input type="hidden" name="challengeId" value={requestState.challengeId} />
      <input type="hidden" name="locale" value={locale} />
      <h2 style={{ fontWeight: 600 }}>{labels.otpTitle}</h2>
      {requestState.devOtp ? (
        <p className="badge badge-warning">
          {labels.devNotice} — {requestState.devOtp}
        </p>
      ) : null}
      <label htmlFor="code">{labels.otpLabel}</label>
      <input
        id="code"
        name="code"
        className="field"
        inputMode="numeric"
        pattern="\d{6}"
        maxLength={6}
        autoComplete="one-time-code"
        required
      />

      <section className="card-muted stack">
        <h3 style={{ fontWeight: 600 }}>{labels.consentTitle}</h3>
        <p>{labels.consentBody}</p>
        <label className="flex items-center gap-3">
          <input type="checkbox" name="consent" required style={{ width: 24, height: 24 }} />
          <span>{labels.consentAgree}</span>
        </label>
      </section>

      {verifyState.error ? (
        <p className="badge badge-danger" role="alert">
          {labels.messages[verifyState.error] ?? labels.error}
        </p>
      ) : null}
      <button type="submit" className="btn btn-primary" disabled={verifying}>
        {labels.verify}
      </button>
    </form>
  );
}
