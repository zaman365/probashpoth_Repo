import type { Locale } from '@probash/domain';
import { pick } from '@/lib/i18n';

type Severity = 'info' | 'caution' | 'warning' | 'severe';

const CLASS: Record<Severity, string> = {
  info: 'badge-info',
  caution: 'badge-info',
  warning: 'badge-warning',
  severe: 'badge-danger',
};

const ICON: Record<Severity, string> = {
  info: 'ℹ️',
  caution: '⚠️',
  warning: '⚠️',
  severe: '⛔',
};

/** §52 — status is never colour-only: icon + text carry the meaning too. */
export function RiskNotice({
  severity,
  title,
  body,
  locale,
}: {
  severity: Severity;
  title: { bn: string; en: string };
  body: { bn: string; en: string };
  locale: Locale;
}) {
  return (
    <div className="card-muted stack" role="note">
      <div className="flex items-center gap-2">
        <span aria-hidden="true">{ICON[severity]}</span>
        <span className={`badge ${CLASS[severity]}`}>{pick(title, locale)}</span>
      </div>
      <p>{pick(body, locale)}</p>
    </div>
  );
}
