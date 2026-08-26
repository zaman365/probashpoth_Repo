import type { Metadata } from 'next';
import type { OutcomeAggregateDto } from '@probash/contracts';
import { Badge, ButtonLink, Card, Grid, Icon, Section, Stat, StatGroup } from '@probash/web-ui';
import { apiRequest } from '@/lib/api';
import { localeSegment, parseLocaleParam, pick, translator } from '@/lib/i18n';
import { canonicalMetadata } from '@/lib/seo';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { getWorkspace } from '@/db/operations';
import { OutcomeReportForm } from '@/components/OperationalForms';

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
    path: '/outcomes',
    title: t('outcomeIntelligence.title'),
    description: t('outcomeIntelligence.lead'),
  });
}

export default async function OutcomesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: segment } = await params;
  const locale = parseLocaleParam(segment);
  const seg = localeSegment(locale);
  const t = translator(locale);
  const user = await getChatGPTUser();
  const [work, study, workspace] = await Promise.all([
    apiRequest<OutcomeAggregateDto>('/api/v1/public/outcomes/aggregates?path=work', { locale }),
    apiRequest<OutcomeAggregateDto>('/api/v1/public/outcomes/aggregates?path=study', { locale }),
    user ? getWorkspace(user.userId) : Promise.resolve(null),
  ]);
  const cohorts = [
    { key: 'work', data: work, title: t('outcomeIntelligence.workTitle') },
    { key: 'study', data: study, title: t('outcomeIntelligence.studyTitle') },
  ];

  return (
    <>
      <Section
        surface="warm"
        headingLevel={1}
        eyebrow={t('outcomeIntelligence.eyebrow')}
        title={t('outcomeIntelligence.title')}
        lead={t('outcomeIntelligence.lead')}
      >
        <div className="hub-actions">
          <ButtonLink href={`/${seg}/dashboard`} icon={<Icon name="route" size={19} />}>
            {t('nav.dashboard')}
          </ButtonLink>
          <ButtonLink href={`/${seg}/partners`} variant="outline">
            {t('supply.title')}
          </ButtonLink>
        </div>
      </Section>

      <Section surface="default" title={t('outcomeIntelligence.cohortTitle')}>
        <Grid min={360}>
          {cohorts.map(({ key, data, title }) => (
            <Card key={key} className="outcome-cohort-card">
              <div className="directory-card-head">
                <Badge tone={data.suppressed ? 'warning' : 'success'}>
                  {data.suppressed
                    ? t('outcomeIntelligence.privacyProtected')
                    : t('outcomeIntelligence.published')}
                </Badge>
                <span>
                  {data.reviewedCohortSize}/{data.minimumCohortSize}
                </span>
              </div>
              <h2 className="card-title">{title}</h2>
              <p>{pick(data.privacyNotice, locale)}</p>
              {data.metrics ? (
                <StatGroup>
                  <Stat
                    label={t('outcomeIntelligence.termsMatched')}
                    value={`${data.metrics.promisedTermsMatchedPercent ?? '—'}%`}
                  />
                  <Stat
                    label={t('outcomeIntelligence.positiveOutcome')}
                    value={`${data.metrics.positiveOutcomePercent ?? '—'}%`}
                  />
                </StatGroup>
              ) : (
                <div className="privacy-threshold">
                  <Icon name="shield" size={24} />
                  <strong>{t('outcomeIntelligence.threshold')}</strong>
                </div>
              )}
            </Card>
          ))}
        </Grid>
      </Section>

      <Section surface="muted" title={t('outcomeIntelligence.methodTitle')}>
        <Grid min={280}>
          {['consent', 'review', 'aggregate', 'rank'].map((key, index) => (
            <Card key={key}>
              <Badge tone="neutral">{String(index + 1).padStart(2, '0')}</Badge>
              <h3 className="card-title">{t(`outcomeIntelligence.${key}Title`)}</h3>
              <p>{t(`outcomeIntelligence.${key}Body`)}</p>
            </Card>
          ))}
        </Grid>
      </Section>
      <Section
        surface="warm"
        title={t('outcomeIntelligence.submitTitle')}
        lead={t('outcomeIntelligence.submitLead')}
      >
        <Grid min={360}>
          <OutcomeReportForm
            locale={locale}
            localeSegment={seg}
            journeys={workspace?.journeys.map(({ id, title, path }) => ({ id, title, path })) ?? []}
          />
          <div className="stack">
            {workspace?.outcomes.length === 0 ? (
              <Card tone="muted">
                <p>{t('outcomeIntelligence.noReports')}</p>
              </Card>
            ) : null}
            {workspace?.outcomes.map((outcome) => (
              <Card key={outcome.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Badge tone="warning">{outcome.reviewStatus}</Badge>
                  <Badge tone={outcome.path === 'work' ? 'info' : 'neutral'}>
                    {t(outcome.path === 'work' ? 'intent.work' : 'intent.study')}
                  </Badge>
                </div>
                <h3 className="card-title">
                  {t(`outcomeIntelligence.outcomeValue.${outcome.primaryOutcome}`)}
                </h3>
                <p>
                  {t('outcomeIntelligence.promiseMatched')}:{' '}
                  {t(`outcomeIntelligence.answer.${outcome.promiseMatched}`)}
                </p>
                {outcome.notes ? <p className="muted">{outcome.notes}</p> : null}
              </Card>
            ))}
          </div>
        </Grid>
      </Section>
    </>
  );
}
