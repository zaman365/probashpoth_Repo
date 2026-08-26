import type { Metadata } from 'next';
import { Badge, ButtonLink, Card, Grid, Icon, Section, Stat, StatGroup } from '@probash/web-ui';
import type { StudyDashboardDto, WorkDashboardDto } from '@probash/contracts';
import { tryAuthed } from '@/lib/api';
import { localeSegment, parseLocaleParam, pick, translator } from '@/lib/i18n';
import { canonicalMetadata } from '@/lib/seo';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { getWorkspace } from '@/db/operations';
import { startBlankJourneyAction } from '../operational-actions';

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
  const user = await getChatGPTUser();
  const [work, study, workspace] = await Promise.all([
    tryAuthed<WorkDashboardDto>('/api/v1/work/dashboard', { locale }),
    tryAuthed<StudyDashboardDto>('/api/v1/study/dashboard', { locale }),
    user ? getWorkspace(user.userId) : Promise.resolve(null),
  ]);
  const connected = Boolean(user || work || study);
  const applications =
    workspace?.journeys.length ??
    (work?.applications.length ?? 0) + (study?.applications.length ?? 0);
  const cases =
    workspace?.journeys.filter((journey) => journey.status === 'active').length ??
    (work?.cases.length ?? 0) + (study?.cases.length ?? 0);
  const nextActions = [...(work?.nextActions ?? []), ...(study?.nextActions ?? [])];
  const operationalActions =
    workspace?.journeys.flatMap((journey) =>
      journey.tasks
        .filter((task) => task.status !== 'done')
        .slice(0, 1)
        .map((task) => ({ journey, task })),
    ) ?? [];
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
            <Stat
              label={t('os.nextActions')}
              value={String(operationalActions.length || nextActions.length)}
            />
            <Stat
              label={t('workspace.documents')}
              value={String(workspace?.documents.length ?? 0)}
            />
            <Stat label={t('operations.unread')} value={String(workspace?.unreadAlerts ?? 0)} />
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
            {connected && !workspace?.journeys.some((journey) => journey.path === 'work') ? (
              <form action={startBlankJourneyAction}>
                <input type="hidden" name="locale" value={seg} />
                <input type="hidden" name="path" value="work" />
                <button type="submit" className="btn btn-secondary">
                  {t('workspace.startWorkJourney')}
                </button>
              </form>
            ) : null}
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
            {connected && !workspace?.journeys.some((journey) => journey.path === 'study') ? (
              <form action={startBlankJourneyAction}>
                <input type="hidden" name="locale" value={seg} />
                <input type="hidden" name="path" value="study" />
                <button type="submit" className="btn btn-secondary">
                  {t('workspace.startStudyJourney')}
                </button>
              </form>
            ) : null}
          </Card>
        </Grid>
      </Section>

      {connected ? (
        <Section surface="warm" title={t('workspace.toolsTitle')} lead={t('workspace.toolsLead')}>
          <Grid min={220}>
            <Card>
              <Icon name="document" size={24} />
              <h3 className="card-title">{t('workspace.documents')}</h3>
              <p>{t('workspace.documentsBody')}</p>
              <ButtonLink href={`/${seg}/documents`} variant="outline">
                {t('workspace.openDocuments')}
              </ButtonLink>
            </Card>
            <Card>
              <Icon name="money" size={24} />
              <h3 className="card-title">{t('workspace.money')}</h3>
              <p>{t('workspace.moneyBody')}</p>
              <ButtonLink href={`/${seg}/money`} variant="outline">
                {t('workspace.openMoney')}
              </ButtonLink>
            </Card>
            <Card>
              <Icon name="family" size={24} />
              <h3 className="card-title">{t('workspace.family')}</h3>
              <p>{t('workspace.familyBody')}</p>
              <ButtonLink href={`/${seg}/family`} variant="outline">
                {t('workspace.openFamily')}
              </ButtonLink>
            </Card>
            <Card>
              <Icon name="verify" size={24} />
              <h3 className="card-title">{t('workspace.review')}</h3>
              <p>{t('workspace.reviewBody')}</p>
              <ButtonLink href={`/${seg}/verify`} variant="outline">
                {t('workspace.openReview')}
              </ButtonLink>
            </Card>
            <Card>
              <Icon name="warning" size={24} />
              <h3 className="card-title">{t('operations.alertsTitle')}</h3>
              <p>{t('operations.alertsLead')}</p>
              <ButtonLink href={`/${seg}/alerts`} variant="outline">
                {t('common.continue')}
              </ButtonLink>
            </Card>
            <Card>
              <Icon name="document" size={24} />
              <h3 className="card-title">{t('materials.title')}</h3>
              <p>{t('materials.lead')}</p>
              <ButtonLink href={`/${seg}/materials`} variant="outline">
                {t('common.continue')}
              </ButtonLink>
            </Card>
          </Grid>
        </Section>
      ) : null}

      <Section surface="default" title={t('os.ecosystemTitle')}>
        <Grid min={340}>
          <Card>
            <Badge tone="success">{t('outcomeIntelligence.privacyProtected')}</Badge>
            <h2 className="card-title">{t('outcomeIntelligence.title')}</h2>
            <p>{t('outcomeIntelligence.dashboardBody')}</p>
            <ButtonLink href={`/${seg}/outcomes`} variant="outline">
              {t('outcomeIntelligence.open')}
            </ButtonLink>
          </Card>
          <Card>
            <Badge tone="neutral">{t('supply.evidenceGate')}</Badge>
            <h2 className="card-title">{t('supply.title')}</h2>
            <p>{t('supply.dashboardBody')}</p>
            <ButtonLink href={`/${seg}/partners`} variant="outline">
              {t('supply.open')}
            </ButtonLink>
          </Card>
        </Grid>
      </Section>

      <Section surface="default" title={t('os.nextActions')}>
        {operationalActions.length === 0 && nextActions.length === 0 ? (
          <p className="muted">{t('os.noNextActions')}</p>
        ) : null}
        <Grid min={300}>
          {operationalActions.map(({ journey, task }) => (
            <Card key={`${journey.id}:${task.id}`}>
              <Badge tone={journey.path === 'work' ? 'info' : 'neutral'}>
                {t(journey.path === 'work' ? 'intent.work' : 'intent.study')}
              </Badge>
              <h3 className="card-title">{pick(task.title, locale)}</h3>
              <p>{pick(task.detail, locale)}</p>
              <ButtonLink href={`/${seg}/cases/${journey.id}`} variant="outline">
                {t('common.continue')}
              </ButtonLink>
            </Card>
          ))}
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
