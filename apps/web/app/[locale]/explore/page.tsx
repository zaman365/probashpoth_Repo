import Link from 'next/link';
import type { CountrySummaryDto, RouteSummaryDto } from '@probash/contracts';
import { apiRequest } from '@/lib/api';
import { localeSegment, parseLocaleParam, pick, translator } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

const STATUS_BADGE: Record<string, string> = {
  supported: 'badge-success',
  pilot: 'badge-info',
  researching: 'badge-neutral',
  information_only: 'badge-neutral',
  restricted: 'badge-warning',
  paused: 'badge-warning',
  suspended: 'badge-danger',
  unsupported: 'badge-neutral',
};

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
 * §7 — countries carry an operational status, and a country existing in the
 * database never implies a route is open.
 */
export default async function ExplorePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ purpose?: string }>;
}) {
  const { locale: segment } = await params;
  const { purpose } = await searchParams;
  const locale = parseLocaleParam(segment);
  const seg = localeSegment(locale);
  const t = translator(locale);

  const search = new URLSearchParams({ withRoutes: 'true' });
  if (purpose) search.set('purpose', purpose);

  const countries = await apiRequest<CountrySummaryDto[]>(
    `/api/v1/countries?${search.toString()}`,
    { locale },
  );
  const routes = await apiRequest<RouteSummaryDto[]>(
    `/api/v1/routes${purpose ? `?purpose=${purpose}` : ''}`,
    { locale },
  );

  return (
    <>
      <h1 style={{ fontSize: 'var(--font-size-heading)', fontWeight: 700 }}>
        {purpose === 'study' ? t('home.findStudy') : t('home.howMuchCost')}
      </h1>

      <ul className="stack">
        {countries.map((country) => {
          const countryRoutes = routes.filter((r) => r.destinationCountry === country.code);
          return (
            <li key={country.code} className="card stack">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 style={{ fontWeight: 700, fontSize: 'var(--font-size-body-large)' }}>
                  {pick(country.name, locale)}
                </h2>
                <span className={`badge ${STATUS_BADGE[country.supportStatus] ?? 'badge-neutral'}`}>
                  {country.supportStatus}
                </span>
              </div>

              {country.statusNotice ? (
                <p className="badge badge-warning">{pick(country.statusNotice, locale)}</p>
              ) : null}

              <ul className="stack">
                {countryRoutes.map((route) => (
                  <li key={route.id} className="card-muted stack">
                    <Link href={`/${seg}/routes/${route.id}`} style={{ fontWeight: 600 }}>
                      {pick(route.officialName, locale)}
                    </Link>
                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`badge ${route.acceptsApplications ? 'badge-info' : 'badge-danger'}`}
                      >
                        {t(ROUTE_STATUS_KEY[route.status] ?? 'route.statusUnknownNeedsReview')}
                      </span>
                      {route.expectedTimeline ? (
                        <span className="badge badge-neutral">
                          {t('route.timeline')}:{' '}
                          {t('route.timelineValue', {
                            min: route.expectedTimeline.minDays,
                            max: route.expectedTimeline.maxDays,
                          })}
                        </span>
                      ) : null}
                      <span
                        className={`badge ${
                          route.freshness === 'fresh'
                            ? 'badge-success'
                            : route.freshness === 'stale'
                              ? 'badge-danger'
                              : 'badge-warning'
                        }`}
                      >
                        {t(
                          route.freshness === 'fresh'
                            ? 'verification.freshnessFresh'
                            : route.freshness === 'ageing'
                              ? 'verification.freshnessAgeing'
                              : route.freshness === 'stale'
                                ? 'verification.freshnessStale'
                                : 'verification.freshnessUnknown',
                        )}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
    </>
  );
}
