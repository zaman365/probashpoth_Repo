'use client';

import { useState } from 'react';
import type { Locale } from '@probash/domain';
import type { ScanResultDto } from '@probash/contracts';
import { pick } from '@/lib/i18n';

interface Labels {
  publicIdLabel: string;
  pasteMessage: string;
  checkNow: string;
  whatWeChecked: string;
  whatWeCouldNotCheck: string;
  adviceTitle: string;
  aiNotice: string;
  error: string;
  verdicts: Record<string, string>;
}

const VERDICT_CLASS: Record<string, string> = {
  VERIFIED: 'badge-success',
  PARTIALLY_VERIFIED: 'badge-warning',
  MISMATCH: 'badge-warning',
  HIGH_RISK: 'badge-danger',
  UNKNOWN_HUMAN_CHECK_REQUIRED: 'badge-neutral',
};

export function ScannerForm({ locale, labels }: { locale: Locale; labels: Labels }) {
  const [result, setResult] = useState<ScanResultDto | undefined>();
  const [error, setError] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(false);
    try {
      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          publicJobId: String(form.get('publicJobId') ?? '') || undefined,
          messageText: String(form.get('messageText') ?? '') || undefined,
        }),
      });
      if (!response.ok) throw new Error('scan failed');
      setResult((await response.json()) as ScanResultDto);
    } catch {
      setError(true);
      setResult(undefined);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="stack-lg">
      <form onSubmit={onSubmit} className="card stack">
        <label htmlFor="publicJobId">{labels.publicIdLabel}</label>
        <input
          id="publicJobId"
          name="publicJobId"
          className="field"
          placeholder="BD-QA-2026-00000000"
        />
        <label htmlFor="messageText">{labels.pasteMessage}</label>
        <textarea id="messageText" name="messageText" className="field" rows={5} />
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {labels.checkNow}
        </button>
      </form>

      {error ? <p className="badge badge-danger">{labels.error}</p> : null}

      {result ? (
        <section className="card stack-lg" aria-live="polite">
          <p
            className={`badge ${VERDICT_CLASS[result.verdict]}`}
            style={{ fontSize: 'var(--font-size-body-large)' }}
          >
            {labels.verdicts[result.verdict]}
          </p>
          <p>{pick(result.explanation, locale)}</p>

          {result.signals.length > 0 ? (
            <div className="stack">
              <h2 style={{ fontWeight: 700 }}>{labels.adviceTitle}</h2>
              {result.signals.map((signal) => (
                <div key={signal.id} className="card-muted stack">
                  <span
                    className={`badge ${signal.level === 'critical' || signal.level === 'high' ? 'badge-danger' : 'badge-warning'}`}
                  >
                    {pick(signal.title, locale)}
                  </span>
                  <p>{pick(signal.explanation, locale)}</p>
                  <p style={{ fontWeight: 600 }}>{pick(signal.advice, locale)}</p>
                </div>
              ))}
            </div>
          ) : null}

          <details className="card-muted">
            <summary>{labels.whatWeChecked}</summary>
            <ul className="stack" style={{ marginTop: 'var(--space-md)' }}>
              {result.checksPerformed.map((check) => (
                <li key={check.key}>
                  <span aria-hidden="true">
                    {!check.performed
                      ? '•'
                      : check.passed === true
                        ? '✓'
                        : check.passed === false
                          ? '✗'
                          : '?'}
                  </span>{' '}
                  {pick(check.label, locale)}
                  {!check.performed ? (
                    <span className="muted"> — {labels.whatWeCouldNotCheck}</span>
                  ) : null}
                  {check.detail ? <div className="muted">{pick(check.detail, locale)}</div> : null}
                </li>
              ))}
            </ul>
          </details>

          <p className="muted">{labels.aiNotice}</p>
        </section>
      ) : null}
    </div>
  );
}
