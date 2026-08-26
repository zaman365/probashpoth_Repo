import Link from 'next/link';
import type { Metadata } from 'next';
import type { CountrySummaryDto } from '@probash/contracts';
import { apiRequest } from '@/lib/api';
import { localeSegment, parseLocaleParam, pick, translator } from '@/lib/i18n';
import { canonicalMetadata } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: segment } = await params;
  const locale = parseLocaleParam(segment);
  const t = translator(locale);
  return canonicalMetadata({
    locale,
    path: '/countries',
    title: t('guide.countriesTitle'),
    description: t('guide.countriesIntro'),
  });
}

const STATUS_BADGE: Record<string, string> = {
  supported: 'badge-success',
  pilot: 'badge-info',
  researching: 'badge-neutral',
  restricted: 'badge-warning',
  paused: 'badge-warning',
  suspended: 'badge-danger',
};

/**
 * §14.1 — the public country index. No login, indexable, and honest: a country is
 * listed with its operational status, not as an implied invitation to apply.
 */
export default async function CountriesIndex({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: segment } = await params;
  const locale = parseLocaleParam(segment);
  const seg = localeSegment(locale);
  const t = translator(locale);

  const countries = await apiRequest<CountrySummaryDto[]>('/api/v1/countries?withRoutes=true', {
    locale,
  });

  return (
    <div className="wide-page stack-lg">
      <header className="stack">
        <h1 style={{ fontSize: 'var(--font-size-heading)', fontWeight: 700 }}>
          {t('guide.countriesTitle')}
        </h1>
        <p style={{ maxWidth: '60ch' }}>{t('guide.countriesIntro')}</p>
      </header>

      <ul className="grid-cards">
        {countries.map((country) => (
          <li key={country.code} className="card stack">
            <Link
              href={`/${seg}/countries/${country.code.toLowerCase()}`}
              style={{ fontWeight: 700, fontSize: 'var(--font-size-body-large)' }}
            >
              {pick(country.name, locale)}
            </Link>
            <div className="flex flex-wrap gap-2">
              <span className={`badge ${STATUS_BADGE[country.supportStatus] ?? 'badge-neutral'}`}>
                {country.supportStatus}
              </span>
              <span className="badge badge-neutral">
                {t('guide.routeCount', { count: country.routeCount })}
              </span>
            </div>
            {country.statusNotice ? (
              <p className="badge badge-warning">{pick(country.statusNotice, locale)}</p>
            ) : null}
          </li>
        ))}
      </ul>

      <p className="muted">{t('guide.sourceNote')}</p>
    </div>
  );
}
