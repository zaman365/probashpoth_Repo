import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { CountrySummaryDto, JobSummaryDto, OccupationSummaryDto } from '@probash/contracts';
import { apiRequest } from '@/lib/api';
import { money } from '@/lib/format';
import { localeSegment, parseLocaleParam, pick, translator } from '@/lib/i18n';
import { canonicalMetadata, guideJsonLd, siteUrl } from '@/lib/seo';

export const dynamic = 'force-dynamic';

async function loadOccupation(key: string, locale: 'bn-BD' | 'en') {
  const occupations = await apiRequest<OccupationSummaryDto[]>('/api/v1/occupations', { locale });
  return occupations.find((o) => o.key === key);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; key: string }>;
}): Promise<Metadata> {
  const { locale: segment, key } = await params;
  const locale = parseLocaleParam(segment);
  const t = translator(locale);
  const occupation = await loadOccupation(key, locale);
  if (!occupation) return {};

  const title = pick(occupation.title, locale);
  return canonicalMetadata({
    locale,
    path: `/occupations/${key}`,
    title: `${title} — ${t('guide.occupationsTitle')}`,
    description: `${title}: ${t('guide.countriesWithThisJob')}, ${t('guide.typicalSalary')}, ${t('guide.whatYouNeed')}.`,
  });
}

/**
 * §14.1 — an occupation guide built from verified records rather than prose: the
 * countries actually hiring, the real salaries on those jobs, and the lawful cost
 * ceiling for each. Where there is no verified job, it says so.
 */
export default async function OccupationGuide({
  params,
}: {
  params: Promise<{ locale: string; key: string }>;
}) {
  const { locale: segment, key } = await params;
  const locale = parseLocaleParam(segment);
  const seg = localeSegment(locale);
  const t = translator(locale);

  const occupation = await loadOccupation(key, locale);
  if (!occupation) notFound();

  const [jobs, countries] = await Promise.all([
    apiRequest<JobSummaryDto[]>(`/api/v1/jobs?occupation=${encodeURIComponent(key)}`, { locale }),
    apiRequest<CountrySummaryDto[]>('/api/v1/countries', { locale }),
  ]);

  const byCountry = new Map<string, JobSummaryDto[]>();
  for (const job of jobs) {
    byCountry.set(job.destinationCountry, [...(byCountry.get(job.destinationCountry) ?? []), job]);
  }
  const countryName = (code: string) => {
    const match = countries.find((c) => c.code === code);
    return match ? pick(match.name, locale) : code;
  };

  const title = pick(occupation.title, locale);

  return (
    <div className="wide-page stack-lg">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: guideJsonLd({
            name: `${title} — ${t('guide.occupationsTitle')}`,
            description: t('guide.occupationsIntro'),
            url: `${siteUrl}/${seg}/occupations/${key}`,
          }),
        }}
      />

      <header className="hero">
        <div className="stack">
          <h1>{title}</h1>
          <p style={{ maxWidth: '60ch' }}>{t('guide.occupationsIntro')}</p>
        </div>
        <dl className="card grid grid-cols-2 gap-4">
          <div className="stat">
            <dt>{t('guide.isco')}</dt>
            <dd>{occupation.iscoCode}</dd>
          </div>
          <div className="stat">
            <dt>{t('guide.skillLevel')}</dt>
            <dd>{occupation.skillLevel}</dd>
          </div>
          <div className="stat">
            <dt>{t('guide.countriesWithThisJob')}</dt>
            <dd>{byCountry.size}</dd>
          </div>
          <div className="stat">
            <dt>{t('job.verifiedJob')}</dt>
            <dd>{jobs.length}</dd>
          </div>
        </dl>
      </header>

      <section className="stack" aria-labelledby="countries-heading">
        <h2 id="countries-heading" style={{ fontSize: 'var(--font-size-title)', fontWeight: 700 }}>
          {t('guide.countriesWithThisJob')}
        </h2>
        {byCountry.size === 0 ? <p className="card">{t('guide.noJobs')}</p> : null}
        <ul className="grid-cards">
          {[...byCountry.entries()].map(([code, countryJobs]) => (
            <li key={code} className="card stack">
              <Link
                href={`/${seg}/countries/${code.toLowerCase()}`}
                style={{ fontWeight: 700, fontSize: 'var(--font-size-body-large)' }}
              >
                {countryName(code)}
              </Link>
              <div className="stat">
                <dt className="muted">{t('guide.typicalSalary')}</dt>
                <dd className="amount" style={{ fontSize: 'var(--font-size-title)' }}>
                  {money(countryJobs[0]!.monthlySalary, locale)}
                </dd>
              </div>
              <span className="muted">
                {t('job.allowedWorkerCost')}: {money(countryJobs[0]!.allowedWorkerCost, locale)}
              </span>
              <ul className="stack">
                {countryJobs.map((job) => (
                  <li key={job.id}>
                    <Link href={`/${seg}/jobs/${job.id}`}>{pick(job.title, locale)}</Link>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </section>

      <p className="badge badge-info">{t('eligibility.noGuarantee')}</p>
      <p className="muted">{t('guide.sourceNote')}</p>
    </div>
  );
}
