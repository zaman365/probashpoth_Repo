import Link from 'next/link';
import type { Metadata } from 'next';
import { Badge, ButtonLink, Card, Grid, Icon, Section, Stat, StatGroup } from '@probash/web-ui';
import type {
  CountrySummaryDto,
  JobSummaryDto,
  OccupationSummaryDto,
  RouteSummaryDto,
} from '@probash/contracts';
import { apiRequest } from '@/lib/api';
import { money } from '@/lib/format';
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
    path: '/work',
    title: t('intent.work'),
    description: t('intent.workHubLead'),
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
 * §14.1 — the work path in one place: what the route is, where the demand is, what it
 * costs you, and how to check an offer before paying anyone.
 */
export default async function WorkHub({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: segment } = await params;
  const locale = parseLocaleParam(segment);
  const seg = localeSegment(locale);
  const t = translator(locale);

  const [routes, jobs, countries, occupations] = await Promise.all([
    apiRequest<RouteSummaryDto[]>('/api/v1/routes?purpose=work', { locale }),
    apiRequest<JobSummaryDto[]>('/api/v1/jobs', { locale }),
    apiRequest<CountrySummaryDto[]>('/api/v1/countries?withRoutes=true', { locale }),
    apiRequest<OccupationSummaryDto[]>('/api/v1/occupations', { locale }),
  ]);

  const countryName = (code: string) =>
    pick(countries.find((c) => c.code === code)?.name, locale) || code;

  const demandKeys = [...new Set(jobs.map((job) => job.occupationKey))];
  const inDemand = occupations.filter((occupation) => demandKeys.includes(occupation.key));
  const workCountries = [...new Set(routes.map((route) => route.destinationCountry))];

  const steps = [
    { icon: 'verify' as const, title: t('site.how1Title'), body: t('site.how1Body') },
    { icon: 'money' as const, title: t('site.how2Title'), body: t('site.how2Body') },
    { icon: 'route' as const, title: t('site.how3Title'), body: t('site.how3Body') },
    { icon: 'shield' as const, title: t('site.how4Title'), body: t('site.how4Body') },
  ];

  return (
    <>
      <Section
        headingLevel={1}
        surface="warm"
        eyebrow={t('intent.workTagline')}
        title={t('intent.work')}
        lead={t('intent.workHubLead')}
      >
        <div className="hub-actions">
          <ButtonLink href={`/${seg}/jobs`} size="lg" icon={<Icon name="work" size={20} />}>
            {t('home.findWork')}
          </ButtonLink>
          <ButtonLink href={`/${seg}/verify`} size="lg" variant="secondary">
            {t('home.verifyOffer')}
          </ButtonLink>
          <ButtonLink href={`/${seg}?intent=study`} size="lg" variant="ghost">
            {t('intent.openStudy')}
          </ButtonLink>
        </div>
        <StatGroup>
          <Stat label={t('intent.routesFor')} value={String(routes.length)} />
          <Stat label={t('site.statCountries')} value={String(workCountries.length)} />
          <Stat label={t('job.verifiedJob')} value={String(jobs.length)} />
          <Stat label={t('guide.occupationsTitle')} value={String(inDemand.length)} />
        </StatGroup>
      </Section>

      <Section surface="default" title={t('intent.stepsWork')}>
        <Grid min={280}>
          {steps.map((step) => (
            <Card key={step.title}>
              <span className="step-icon" aria-hidden="true">
                <Icon name={step.icon} size={24} />
              </span>
              <h3 className="card-title">{step.title}</h3>
              <p>{step.body}</p>
            </Card>
          ))}
        </Grid>
      </Section>

      <Section surface="muted" title={t('intent.routesFor')} lead={t('guide.sourceNote')}>
        {routes.length === 0 ? <p>{t('guide.noRoutes')}</p> : null}
        <Grid min={320}>
          {routes.map((route) => (
            <Link key={route.id} href={`/${seg}/routes/${route.id}`} className="guide-link">
              <Card interactive>
                <Badge tone="neutral">{countryName(route.destinationCountry)}</Badge>
                <h3 className="card-title">{pick(route.officialName, locale)}</h3>
                <p>{pick(route.summary, locale)}</p>
                <Badge tone={route.acceptsApplications ? 'info' : 'danger'}>
                  {t(ROUTE_STATUS_KEY[route.status] ?? 'route.statusUnknownNeedsReview')}
                </Badge>
              </Card>
            </Link>
          ))}
        </Grid>
      </Section>

      <Section surface="default" title={t('intent.occupationsInDemand')}>
        <Grid min={260}>
          {inDemand.map((occupation) => {
            const example = jobs.find((job) => job.occupationKey === occupation.key);
            return (
              <Link
                key={occupation.id}
                href={`/${seg}/occupations/${occupation.key}`}
                className="guide-link"
              >
                <Card interactive>
                  <h3 className="card-title">{pick(occupation.title, locale)}</h3>
                  {example ? (
                    <>
                      <p className="amount" style={{ fontSize: 'var(--font-size-title)' }}>
                        {money(example.monthlySalary, locale)}
                      </p>
                      <p className="muted">
                        {t('job.allowedWorkerCost')}: {money(example.allowedWorkerCost, locale)}
                      </p>
                    </>
                  ) : null}
                  <span className="link-more">
                    {t('guide.readMore')} <Icon name="arrow" size={18} />
                  </span>
                </Card>
              </Link>
            );
          })}
        </Grid>
      </Section>

      <Section surface="accent" title={t('guide.safetyTitle')} lead={t('intent.compareRiskWork')}>
        <div className="hub-actions">
          <ButtonLink href={`/${seg}/safety`} size="lg" icon={<Icon name="warning" size={20} />}>
            {t('guide.learnSafety')}
          </ButtonLink>
          <ButtonLink href={`/${seg}/verify`} size="lg" variant="secondary">
            {t('scanner.checkNow')}
          </ButtonLink>
        </div>
        <p style={{ marginBlockStart: 'var(--space-lg)' }}>
          <Badge tone="warning">{t('cost.payOnlyHere')}</Badge>
        </p>
      </Section>
    </>
  );
}
