import type { Locale } from '@probash/domain';
import type { ScanResultDto } from '@probash/contracts';
import { Badge, Card, Disclosure } from '@probash/web-ui';
import { pick } from '@/lib/i18n';

/**
 * The scanner verdict, rendered identically whether the check ran on the server (a
 * plain form submission, no JavaScript) or in the browser. One component means the
 * two paths cannot drift into telling a worker different things.
 */
const VERDICT_TONE = {
  VERIFIED: 'success',
  PARTIALLY_VERIFIED: 'warning',
  MISMATCH: 'warning',
  HIGH_RISK: 'danger',
  UNKNOWN_HUMAN_CHECK_REQUIRED: 'neutral',
} as const;

export interface ScanLabels {
  whatWeChecked: string;
  whatWeCouldNotCheck: string;
  adviceTitle: string;
  aiNotice: string;
  verdicts: Record<string, string>;
}

export function ScanResult({
  result,
  locale,
  labels,
}: {
  result: ScanResultDto;
  locale: Locale;
  labels: ScanLabels;
}) {
  return (
    <section className="stack-lg" aria-live="polite">
      <Badge tone={VERDICT_TONE[result.verdict]}>{labels.verdicts[result.verdict]}</Badge>
      <p>{pick(result.explanation, locale)}</p>

      {result.signals.length > 0 ? (
        <div className="stack">
          <h2 style={{ fontWeight: 700 }}>{labels.adviceTitle}</h2>
          {result.signals.map((signal) => (
            <Card key={signal.id} tone="muted">
              <Badge
                tone={signal.level === 'critical' || signal.level === 'high' ? 'danger' : 'warning'}
              >
                {pick(signal.title, locale)}
              </Badge>
              <p>{pick(signal.explanation, locale)}</p>
              <p style={{ fontWeight: 600 }}>{pick(signal.advice, locale)}</p>
            </Card>
          ))}
        </div>
      ) : null}

      <Disclosure summary={labels.whatWeChecked}>
        <ul className="stack">
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
      </Disclosure>

      <p className="muted">{labels.aiNotice}</p>
    </section>
  );
}
