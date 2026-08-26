import type { Locale } from '@probash/domain';
import { pick, translator } from '@/lib/i18n';

interface Facet {
  key: string;
  label: { bn: string; en: string };
  checked: boolean;
  method: string;
  verifiedAt?: string;
  note?: { bn: string; en: string };
}

interface Props {
  level: string;
  facets: Facet[];
  notChecked: Facet[];
  lastVerifiedAt?: string;
  locale: Locale;
}

const LEVEL_KEY: Record<string, string> = {
  unverified: 'verification.levelUnverified',
  identity_verified: 'verification.levelIdentity',
  registry_verified: 'verification.levelRegistry',
  document_verified: 'verification.levelDocument',
  authority_verified: 'verification.levelAuthority',
  transaction_verified: 'verification.levelTransaction',
  post_outcome_verified: 'verification.levelOutcome',
};

/**
 * §75 — the badge is always expandable into exactly what was and was not verified.
 * A `<details>` element keeps that disclosure available with no JavaScript at all.
 */
export function VerifiedBadge({ level, facets, notChecked, lastVerifiedAt, locale }: Props) {
  const t = translator(locale);
  const strong =
    level === 'authority_verified' ||
    level === 'transaction_verified' ||
    level === 'post_outcome_verified';

  return (
    <details className="card-muted">
      <summary className="flex flex-wrap items-center gap-3 cursor-pointer">
        <span
          className={`badge ${strong ? 'badge-success' : level === 'unverified' ? 'badge-danger' : 'badge-info'}`}
        >
          {t(LEVEL_KEY[level] ?? 'verification.unverified')}
        </span>
        <span className="muted">{t('verification.whatWasVerified')}</span>
      </summary>

      <div className="stack" style={{ marginTop: 'var(--space-md)' }}>
        <ul className="stack">
          {facets.map((facet) => (
            <li key={facet.key} className="flex gap-2">
              <span aria-hidden="true">✓</span>
              <span>
                {pick(facet.label, locale)}
                {facet.note ? <span className="muted"> — {pick(facet.note, locale)}</span> : null}
              </span>
            </li>
          ))}
        </ul>

        {notChecked.length > 0 ? (
          <div>
            <p className="muted">{t('verification.whatWasNotVerified')}</p>
            <ul className="stack">
              {notChecked.map((facet) => (
                <li key={facet.key} className="flex gap-2">
                  <span aria-hidden="true">✗</span>
                  <span>
                    {pick(facet.label, locale)}
                    {facet.note ? (
                      <span className="muted"> — {pick(facet.note, locale)}</span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {lastVerifiedAt ? (
          <p className="muted">
            {t('verification.lastVerified')}: {new Date(lastVerifiedAt).toISOString().slice(0, 10)}
          </p>
        ) : null}
      </div>
    </details>
  );
}
