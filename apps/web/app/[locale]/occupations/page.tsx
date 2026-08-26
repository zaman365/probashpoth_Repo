import Link from 'next/link';
import type { Metadata } from 'next';
import type { OccupationSummaryDto } from '@probash/contracts';
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
    path: '/occupations',
    title: t('guide.occupationsTitle'),
    description: t('guide.occupationsIntro'),
  });
}

/** §11/§14.1 — occupations, grouped by family, anchored on ISCO-08. */
export default async function OccupationsIndex({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: segment } = await params;
  const locale = parseLocaleParam(segment);
  const seg = localeSegment(locale);
  const t = translator(locale);

  const occupations = await apiRequest<OccupationSummaryDto[]>('/api/v1/occupations', { locale });
  const families = [...new Set(occupations.map((o) => o.family))].sort();

  return (
    <div className="wide-page stack-lg">
      <header className="stack">
        <h1 style={{ fontSize: 'var(--font-size-heading)', fontWeight: 700 }}>
          {t('guide.occupationsTitle')}
        </h1>
        <p style={{ maxWidth: '60ch' }}>{t('guide.occupationsIntro')}</p>
      </header>

      {families.map((family) => (
        <section key={family} className="stack" aria-labelledby={`family-${family}`}>
          <h2
            id={`family-${family}`}
            style={{ fontSize: 'var(--font-size-title)', fontWeight: 600 }}
          >
            {family.replace(/_/g, ' ')}
          </h2>
          <ul className="grid-cards">
            {occupations
              .filter((occupation) => occupation.family === family)
              .map((occupation) => (
                <li key={occupation.id} className="card stack">
                  <Link href={`/${seg}/occupations/${occupation.key}`} style={{ fontWeight: 600 }}>
                    {pick(occupation.title, locale)}
                  </Link>
                  <span className="muted">
                    {t('guide.isco')}: {occupation.iscoCode}
                  </span>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
