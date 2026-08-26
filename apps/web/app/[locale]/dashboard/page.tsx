import type { Metadata } from 'next';
import { Badge, ButtonLink, Card, Grid, Icon, Section, Stat, StatGroup } from '@probash/web-ui';
import type { StudyDashboardDto, WorkDashboardDto } from '@probash/contracts';
import { tryAuthed } from '@/lib/api';
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
    path: '/dashboard',
    title: t('os.dashboardTitle'),
    description: t('os.dashboardLead'),
  });
}

export default async function JourneyDashboard({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: segment } = await params;
  const locale = parseLocaleParam(segment);
  const seg = localeSegment(locale);
  const t = translator(locale);
  const [work, study] = await Promise.all([
    tryAuthed<WorkDashboardDto>('/api/v1/work/dashboard', { locale }),
    tryAuthed<StudyDashboardDto>('/api/v1/study/dashboard', { locale }),
  ]);
  const connected = Boolean(work || study);
  const applications = (work?.applications.length ?? 0) + (study?.applications.length ?? 0);
  const cases = (work?.cases.length ?? 0) + (study?.cases.length ?? 0);
  const nextActions = [...(work?.nextActions ?? []), ...(study?.nextActions ?? [])];
  const safetyRail = [
    ['search', 'os.stepMatch'],
    ['verify', 'os.stepVerify'],
    ['money', 'os.stepCost'],
    ['document', 'os.stepPrepare'],
    ['route', 'os.stepTrack'],
    ['shield', 'os.stepProve'],
  ] as const;

  return (
    <>
      <Section
        surface="warm"
        headingLevel={1}
        eyebrow={t('os.dashboardEyebrow')}
        title={t('os.dashboardTitle')}
        lead={t('os.dashboardLead')}
      >
        {connected ? (
          <StatGroup>
            <Stat label={t('os.applications')} value={String(applications)} />
            <Stat label={t('os.activeCases')} value={String(cases)} />
            <Stat label={t('os.nextActions')} value={String(nextActions.length)} />
          </StatGroup>
        ) : (
          <Card tone="default" className="journey-signin-card">
            <Badge tone="info">{t('os.signedOutTitle')}</Badge>
            <p>{t('os.signedOutBody')}</p>
            <div className="hub-actions">
              <ButtonLink href={`/${seg}/passport`} icon={<Icon name="route" size={19} />}>
                {t('passport.startPassport')}
              </ButtonLink>
              <ButtonLink href={`/${seg}/onboarding`} variant="outline">
                {t('common.continue')}
              </ButtonLink>
            </div>
          </Card>
        )}
      </Section>

      <Section surface="default" title={t('os.sixSteps')}>
        <ol className="journey-rail">
          {safetyRail.map(([icon, label], index) => (
            <li key={label}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <Icon name={icon} size={23} />
              <strong>{t(label)}</strong>
            </li>
          ))}
        </ol>
      </Section>

      <Section surface="muted">
        <Grid min={340}>
          <Card className="journey-path-card">
            <span className="step-icon">
              <Icon name="work" size={26} />
            </span>
            <Badge tone="info">{t('intent.workTagline')}</Badge>
            <h2 className="card-title">{t('os.workJourney')}</h2>
            <p>{t('os.workJourneyBody')}</p>
            <div className="hub-actions">
              <ButtonLink href={`/${seg}/work`}>{t('intent.openWork')}</ButtonLink>
              <ButtonLink href={`/${seg}/jobs`} variant="ghost">
                {t('home.findWork')}
              </ButtonLink>
            </div>
          </Card>
          <Card className="journey-path-card">
            <span className="step-icon">
              <Icon name="study" size={26} />
            </span>
            <Badge tone="neutral">{t('intent.studyTagline')}</Badge>
            <h2 className="card-title">{t('os.studyJourney')}</h2>
            <p>{t('os.studyJourneyBody')}</p>
            <div className="hub-actions">
              <ButtonLink href={`/${seg}/study`}>{t('intent.openStudy')}</ButtonLink>
              <ButtonLink href={`/${seg}/countries`} variant="ghost">
                {t('guide.browseCountries')}
              </ButtonLink>
            </div>
          </Card>
        </Grid>
      </Section>

      <Section surface="default" title={t('os.nextActions')}>
        {nextActions.length === 0 ? <p className="muted">{t('os.noNextActions')}</p> : null}
        <Grid min={300}>
          {nextActions.map((action) => (
            <Card key={`${action.caseId}:${action.taskId}`}>
              <Badge tone="warning">{action.status}</Badge>
              <h3 className="card-title">{pick(action.label, locale)}</h3>
              <ButtonLink href={`/${seg}/cases/${action.caseId}`} variant="outline">
                {t('common.continue')}
              </ButtonLink>
            </Card>
          ))}
        </Grid>
      </Section>
    </>
  );
}
