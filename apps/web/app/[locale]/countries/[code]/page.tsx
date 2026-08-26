import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type {
  CountrySummaryDto,
  JobSummaryDto,
  RouteSummaryDto,
  SourceSummaryDto,
} from '@probash/contracts';
import { apiRequest } from '@/lib/api';
import { money } from '@/lib/format';
import { localeSegment, parseLocaleParam, pick, translator } from '@/lib/i18n';
import { canonicalMetadata, guideJsonLd, siteUrl } from '@/lib/seo';
import { SourceCitation } from '@/components/SourceCitation';

export const dynamic = 'force-dynamic';

async function loadCountry(code: string, locale: 'bn-BD' | 'en') {
  const countries = await apiRequest<CountrySummaryDto[]>('/api/v1/countries', { locale });
  return countries.find((c) => c.code === code.toUpperCase());
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; code: string }>;
}): Promise<Metadata> {
  const { locale: segment, code } = await params;
  const locale = parseLocaleParam(segment);
  const t = translator(locale);
  const country = await loadCountry(code, locale);
  if (!country) return {};

  const name = pick(country.name, locale);
  return canonicalMetadata({
    locale,
    path: `/countries/${code.toLowerCase()}`,
    title: `${name} — ${t('guide.countriesTitle')}`,
    description: `${name}: ${t('guide.routesInCountry')}, ${t('guide.whatYouNeed')}, ${t('verification.officialSource')}.`,
  });
}

const ROUTE_STATUS_KEY: Record<string, string> = {
  open: 'route.statusOpen',
  limited: 'route.statusLimited',
  quota: 'route.statusQuota',
  seasonal: 'route.statusSeasonal',
  employer_sponsored: 'route.statusEmployerSponsored',
  government_program: 'route.statusGovernmentProgram',
  temporarily_paused: 'route.statusTemporarilyPaused',
  closed: 'route.statusClosed',
  unknown_needs_review: 'route.statusUnknownNeedsReview',
};

/**
 * §14.1 — a country guide, readable without an account. It answers "what routes exist,
 * what do they need, what does it cost, and who says so" — and says plainly when the
 * answer is "no published route", instead of filling the page with encouragement.
 */
export default async function CountryGuide({
  params,
}: {
  params: Promise<{ locale: string; code: string }>;
}) {
  const { locale: segment, code } = await params;
  const locale = parseLocaleParam(segment);
  const seg = localeSegment(locale);
  const t = translator(locale);

  const country = await loadCountry(code, locale);
  if (!country) notFound();

  const upper = country.code.toUpperCase();
  const [routes, jobs, sources] = await Promise.all([
    apiRequest<RouteSummaryDto[]>(`/api/v1/countries/${upper}/routes`, { locale }),
    apiRequest<JobSummaryDto[]>(`/api/v1/jobs?country=${upper}`, { locale }),
    apiRequest<SourceSummaryDto[]>(`/api/v1/sources?country=${upper}`, { locale }),
  ]);

  const name = pick(country.name, locale);
  const occupations = [...new Set(jobs.map((job) => job.occupationKey))];

  return (
    <div className="wide-page stack-lg">
      <script
        type="application/ld+json"
        // Facts about the page itself; no claim about anyone's chances.
        dangerouslySetInnerHTML={{
          __html: guideJsonLd({
            name: `${name} — ${t('guide.countriesTitle')}`,
            description: t('guide.countriesIntro'),
            url: `${siteUrl}/${seg}/countries/${country.code.toLowerCase()}`,
          }),
        }}
      />

      <header className="hero">
        <div className="stack">
          <h1>{name}</h1>
          <p style={{ maxWidth: '60ch' }}>{t('guide.countriesIntro')}</p>
          {country.statusNotice ? (
            <p className="badge badge-warning">{pick(country.statusNotice, locale)}</p>
          ) : null}
        </div>
        <dl className="card grid grid-cols-2 gap-4">
          <div className="stat">
            <dt>{t('guide.supportStatus')}</dt>
            <dd>{country.supportStatus}</dd>
          </div>
          <div className="stat">
            <dt>{t('guide.routesInCountry')}</dt>
            <dd>{routes.length}</dd>
          </div>
          <div className="stat">
            <dt>{t('guide.jobsInCountry')}</dt>
            <dd>{jobs.length}</dd>
          </div>
          <div className="stat">
            <dt>{t('verification.officialSource')}</dt>
            <dd>{sources.length}</dd>
          </div>
        </dl>
      </header>

      <section className="stack" aria-labelledby="routes-heading">
        <h2 id="routes-heading" style={{ fontSize: 'var(--font-size-title)', fontWeight: 700 }}>
          {t('guide.routesInCountry')}
        </h2>
        {routes.length === 0 ? <p className="card">{t('guide.noRoutes')}</p> : null}
        <ul className="grid-cards">
          {routes.map((route) => (
            <li key={route.id} className="card stack">
              <Link href={`/${seg}/routes/${route.id}`} style={{ fontWeight: 600 }}>
                {pick(route.officialName, locale)}
              </Link>
              <p className="muted">{pick(route.summary, locale)}</p>
              <div className="flex flex-wrap gap-2">
                <span
                  className={`badge ${route.acceptsApplications ? 'badge-info' : 'badge-danger'}`}
                >
                  {t(ROUTE_STATUS_KEY[route.status] ?? 'route.statusUnknownNeedsReview')}
                </span>
                {route.expectedTimeline ? (
                  <span className="badge badge-neutral">
                    {t('route.timelineValue', {
                      min: route.expectedTimeline.minDays,
                      max: route.expectedTimeline.maxDays,
                    })}
                  </span>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {occupations.length > 0 ? (
        <section className="stack" aria-labelledby="occupations-heading">
          <h2
            id="occupations-heading"
            style={{ fontSize: 'var(--font-size-title)', fontWeight: 700 }}
          >
            {t('guide.occupationsInCountry')}
          </h2>
          <div className="flex flex-wrap gap-2">
            {occupations.map((key) => (
              <Link key={key} href={`/${seg}/occupations/${key}`} className="btn btn-secondary">
                {key}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="stack" aria-labelledby="jobs-heading">
        <h2 id="jobs-heading" style={{ fontSize: 'var(--font-size-title)', fontWeight: 700 }}>
          {t('guide.jobsInCountry')}
        </h2>
        {jobs.length === 0 ? <p className="card">{t('guide.noJobs')}</p> : null}
        <ul className="grid-cards">
          {jobs.map((job) => (
            <li key={job.id} className="card stack">
              <Link href={`/${seg}/jobs/${job.id}`} style={{ fontWeight: 600 }}>
                {pick(job.title, locale)}
              </Link>
              <span className="amount" style={{ fontSize: 'var(--font-size-title)' }}>
                {money(job.monthlySalary, locale)}
              </span>
              <span className="muted">
                {t('job.allowedWorkerCost')}: {money(job.allowedWorkerCost, locale)}
              </span>
              {job.isSyntheticDemoData ? (
                <span className="badge badge-danger">{t('common.demoDataWarning')}</span>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <SourceCitation sources={sources} locale={locale} />
      <p className="muted">{t('guide.sourceNote')}</p>
    </div>
  );
}
