import type { Locale } from '@probash/domain';
import { pick, translator } from '@/lib/i18n';

export interface SourceSummary {
  id: string;
  authority: { bn: string; en: string };
  title: { bn: string; en: string };
  url: string;
  lastReviewedAt?: string;
  freshness: 'fresh' | 'ageing' | 'stale' | 'unknown';
}

const FRESHNESS_CLASS: Record<SourceSummary['freshness'], string> = {
  fresh: 'badge-success',
  ageing: 'badge-warning',
  stale: 'badge-danger',
  unknown: 'badge-neutral',
};

const FRESHNESS_KEY: Record<SourceSummary['freshness'], string> = {
  fresh: 'verification.freshnessFresh',
  ageing: 'verification.freshnessAgeing',
  stale: 'verification.freshnessStale',
  unknown: 'verification.freshnessUnknown',
};

/** §38 — provenance is user-facing: source, authority and freshness, always. */
export function SourceCitation({ sources, locale }: { sources: SourceSummary[]; locale: Locale }) {
  const t = translator(locale);
  if (sources.length === 0) return null;

  return (
    <section className="card-muted stack" aria-labelledby="sources-heading">
      <h3 id="sources-heading" style={{ fontWeight: 'var(--font-weight-semibold)' }}>
        {t('verification.officialSource')}
      </h3>
      <ul className="stack">
        {sources.map((source) => (
          <li key={source.id} className="flex flex-wrap items-center gap-2">
            <a href={source.url} target="_blank" rel="noreferrer noopener" className="underline">
              {pick(source.authority, locale)} — {pick(source.title, locale)}
            </a>
            <span className={`badge ${FRESHNESS_CLASS[source.freshness]}`}>
              {t(FRESHNESS_KEY[source.freshness])}
            </span>
            {source.lastReviewedAt ? (
              <span className="muted">
                {t('verification.lastVerified')}: {source.lastReviewedAt.slice(0, 10)}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
