import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { Badge, ButtonLink, Card, Icon, Section } from '@probash/web-ui';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { getWorkspace, type JourneyPath, type OperationalJourney } from '@/db/operations';
import { localeSegment, parseLocaleParam, pick, translator } from '@/lib/i18n';
import { canonicalMetadata } from '@/lib/seo';
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

const CHAPTER_ICONS = [
  'search',
  'route',
  'work',
  'verify',
  'document',
  'shield',
  'globe',
  'check',
] as const;

function journeyProgress(journey: OperationalJourney | null): {
  done: number;
  total: number;
  percent: number;
} {
  if (!journey || journey.tasks.length === 0) return { done: 0, total: 0, percent: 0 };
  const done = journey.tasks.filter((task) => task.status === 'done').length;
  return {
    done,
    total: journey.tasks.length,
    percent: Math.round((done / journey.tasks.length) * 100),
  };
}

function fallbackChapter(stage: string): number {
  if (stage === 'preparing') return 1;
  if (stage === 'applying') return 4;
  if (stage === 'progressing') return 6;
  return 0;
}

export default async function JourneyDashboard({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ welcome?: string }>;
}) {
  const { locale: segment } = await params;
  const { welcome } = await searchParams;
  const locale = parseLocaleParam(segment);
  const seg = localeSegment(locale);
  const t = translator(locale);
  const user = await getChatGPTUser();

  if (!user) {
    return (
      <Section
        surface="warm"
        headingLevel={1}
        eyebrow={t('os.dashboardEyebrow')}
        title={t('os.dashboardTitle')}
        lead={t('os.dashboardLead')}
      >
        <Card tone="default" className="journey-signin-card">
          <Badge tone="info">{t('os.signedOutTitle')}</Badge>
          <p>{t('os.signedOutBody')}</p>
          <div className="hub-actions">
            <ButtonLink href={`/${seg}/onboarding`} icon={<Icon name="route" size={19} />}>
              {t('account.signIn')}
            </ButtonLink>
            <ButtonLink href={`/${seg}/countries`} variant="outline">
              {t('guide.browseCountries')}
            </ButtonLink>
          </div>
        </Card>
      </Section>
    );
  }

  const workspace = await getWorkspace(user.userId);
  if (!workspace.profile?.onboardingCompletedAt) redirect(`/${seg}/onboarding`);

  const profile = workspace.profile;
  const path: JourneyPath = profile.activePath === 'study' ? 'study' : 'work';
  const otherPath: JourneyPath = path === 'work' ? 'study' : 'work';
  const pathJourneys = workspace.journeys.filter((journey) => journey.path === path);
  const primaryJourney =
    pathJourneys.find((journey) => journey.status === 'active') ?? pathJourneys[0] ?? null;
  const progress = journeyProgress(primaryJourney);
  const currentChapter = primaryJourney
    ? Math.min(7, Math.floor((progress.percent / 100) * 8))
    : fallbackChapter(profile.journeyStage);
  const nextTask = primaryJourney?.tasks.find((task) => task.status !== 'done') ?? null;
  const pathJourneyIds = new Set(pathJourneys.map((journey) => journey.id));
  const nextDeadline = workspace.records.find(
    (record) =>
      pathJourneyIds.has(record.journeyId) && record.dueAt && record.status !== 'completed',
  );
  const chapters = Array.from({ length: 8 }, (_, index) => ({
    title: t(`journey.${path}.chapter${index + 1}`),
    index,
  }));
  const firstName = user.displayName.split(/\s+/)[0] || user.displayName;
  const journeyGoal = profile.goalTitle || t(`journey.${path}.defaultGoal`);
  const needsCount = [
    nextTask,
    workspace.unreadAlerts > 0,
    workspace.pendingVerifications > 0,
    nextDeadline,
  ].filter(Boolean).length;

  return (
    <div className={`journey-command-page wide-page journey-${path}`}>
      {welcome === '1' ? (
        <div className="journey-welcome" role="status">
          <Icon name="check" size={18} />
          <span>{t('journey.welcome')}</span>
          <Link href={`/${seg}/account`}>{t('account.myAccount')} →</Link>
        </div>
      ) : null}

      <section className="journey-command-hero">
        <div className="journey-command-copy">
          <div className="journey-identity-line">
            <Badge tone={path === 'work' ? 'success' : 'info'}>
              {t(path === 'work' ? 'account.workTalent' : 'account.studyTalent')}
            </Badge>
            <span>{t(`onboarding.stage.${profile.journeyStage}`)}</span>
          </div>
          <p className="talent-kicker">{t('journey.commandCenter')}</p>
          <h1>{t('journey.greeting', { name: firstName })}</h1>
          <p className="journey-goal">{journeyGoal}</p>
          <div className="journey-hero-actions">
            {primaryJourney && nextTask ? (
              <ButtonLink
                href={`/${seg}/cases/${primaryJourney.id}`}
                icon={<Icon name="arrow" size={19} />}
              >
                {t('journey.continueChapter')}
              </ButtonLink>
            ) : primaryJourney ? (
              <ButtonLink
                href={`/${seg}/cases/${primaryJourney.id}`}
                icon={<Icon name="check" size={19} />}
              >
                {t('journey.openJourney')}
              </ButtonLink>
            ) : (
              <form action={startBlankJourneyAction}>
                <input type="hidden" name="locale" value={seg} />
                <input type="hidden" name="path" value={path} />
                <button className="btn btn-primary" type="submit">
                  <Icon name="route" size={19} /> {t('journey.startJourney')}
                </button>
              </form>
            )}
            <ButtonLink href={`/${seg}/passport`} variant="outline">
              {t('passport.title')}
            </ButtonLink>
          </div>
        </div>

        <aside className="journey-next-card">
          <header>
            <span>{t('journey.nextBestAction')}</span>
            <small>
              {needsCount} {t('journey.needsYouCount')}
            </small>
          </header>
          <span className="journey-next-icon">
            <Icon name={nextTask ? 'arrow' : 'route'} size={25} />
          </span>
          <h2>{nextTask ? pick(nextTask.title, locale) : t('journey.createFirstTitle')}</h2>
          <p>{nextTask ? pick(nextTask.detail, locale) : t(`journey.${path}.createFirstBody`)}</p>
          <div className="journey-why">
            <strong>{t('journey.whyThisMatters')}</strong>
            <span>{t(`journey.${path}.whyNow`)}</span>
          </div>
          {primaryJourney ? (
            <Link href={`/${seg}/cases/${primaryJourney.id}`}>{t('common.continue')} →</Link>
          ) : null}
        </aside>
      </section>

      <section className="journey-chapter-panel" aria-labelledby="journey-chapters-title">
        <header>
          <div>
            <span>{t('journey.yourStory')}</span>
            <h2 id="journey-chapters-title">{t(`journey.${path}.storyTitle`)}</h2>
          </div>
          <div className="journey-progress-copy">
            <strong>{progress.percent}%</strong>
            <small>
              {progress.done} / {progress.total || 8} {t('journey.stepsComplete')}
            </small>
          </div>
        </header>
        <ol className="journey-chapter-rail">
          {chapters.map((chapter) => {
            const state =
              chapter.index < currentChapter
                ? 'complete'
                : chapter.index === currentChapter
                  ? 'current'
                  : 'upcoming';
            return (
              <li key={chapter.title} className={state}>
                <span className="journey-chapter-marker">
                  {state === 'complete' ? (
                    <Icon name="check" size={16} />
                  ) : (
                    String(chapter.index + 1).padStart(2, '0')
                  )}
                </span>
                <Icon name={CHAPTER_ICONS[chapter.index] ?? 'route'} size={20} />
                <strong>{chapter.title}</strong>
                <small>{t(`journey.state.${state}`)}</small>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="journey-attention-section" aria-labelledby="journey-attention-title">
        <header>
          <div>
            <span>{t('journey.attentionKicker')}</span>
            <h2 id="journey-attention-title">{t('journey.needsYou')}</h2>
          </div>
          <p>{t('journey.needsYouLead')}</p>
        </header>
        <div className="journey-signal-grid">
          <Link
            href={primaryJourney ? `/${seg}/cases/${primaryJourney.id}` : `/${seg}/passport`}
            className="journey-signal primary"
          >
            <span>
              <Icon name="arrow" size={20} />
            </span>
            <div>
              <small>{t('journey.nextAction')}</small>
              <strong>
                {nextTask ? pick(nextTask.title, locale) : t('passport.startPassport')}
              </strong>
              <p>{nextTask ? pick(nextTask.detail, locale) : t('journey.profileSignal')}</p>
            </div>
            <b>→</b>
          </Link>
          <Link
            href={`/${seg}/alerts`}
            className={workspace.unreadAlerts > 0 ? 'journey-signal warning' : 'journey-signal'}
          >
            <span>
              <Icon name="warning" size={20} />
            </span>
            <div>
              <small>{t('operations.alertsTitle')}</small>
              <strong>
                {workspace.unreadAlerts} {t('operations.unread')}
              </strong>
              <p>{t('journey.alertSignal')}</p>
            </div>
            <b>→</b>
          </Link>
          <Link
            href={`/${seg}/verify`}
            className={
              workspace.pendingVerifications > 0 ? 'journey-signal review' : 'journey-signal'
            }
          >
            <span>
              <Icon name="verify" size={20} />
            </span>
            <div>
              <small>{t('workspace.review')}</small>
              <strong>
                {workspace.pendingVerifications} {t('journey.pendingReview')}
              </strong>
              <p>{t('journey.reviewSignal')}</p>
            </div>
            <b>→</b>
          </Link>
          <Link
            href={nextDeadline ? `/${seg}/cases/${nextDeadline.journeyId}` : `/${seg}/cases`}
            className="journey-signal"
          >
            <span>
              <Icon name="document" size={20} />
            </span>
            <div>
              <small>{t('journey.nextDeadline')}</small>
              <strong>{nextDeadline?.dueAt ?? t('journey.noDeadline')}</strong>
              <p>{nextDeadline?.title ?? t('journey.deadlineSignal')}</p>
            </div>
            <b>→</b>
          </Link>
        </div>
      </section>

      <section className="journey-workspace-section" aria-labelledby="journey-tools-title">
        <header>
          <div>
            <span>{t('workspace.toolsTitle')}</span>
            <h2 id="journey-tools-title">{t('journey.evidenceDesk')}</h2>
          </div>
          <p>{t('workspace.toolsLead')}</p>
        </header>
        <div className="journey-tool-grid">
          {(
            [
              [
                'document',
                'workspace.documents',
                'workspace.documentsBody',
                'documents',
                String(workspace.documents.length),
              ],
              [
                'money',
                'workspace.money',
                'workspace.moneyBody',
                'money',
                String(workspace.ledger.length),
              ],
              [
                'verify',
                'workspace.review',
                'workspace.reviewBody',
                'verify',
                String(workspace.pendingVerifications),
              ],
              [
                'family',
                'workspace.family',
                'workspace.familyBody',
                'family',
                String(workspace.activeDelegations),
              ],
            ] as const
          ).map(([icon, title, body, href, count]) => (
            <Link key={href} href={`/${seg}/${href}`} className="journey-tool-card">
              <span>
                <Icon name={icon} size={23} />
              </span>
              <small>{count}</small>
              <h3>{t(title)}</h3>
              <p>{t(body)}</p>
              <b>{t('common.continue')} →</b>
            </Link>
          ))}
        </div>
      </section>

      <section className="journey-secondary-path">
        <span>
          <Icon name={otherPath === 'work' ? 'work' : 'study'} size={24} />
        </span>
        <div>
          <small>{t('journey.secondaryKicker')}</small>
          <h2>{t(`journey.${otherPath}.secondaryTitle`)}</h2>
          <p>{t('journey.secondaryBody')}</p>
        </div>
        <Link href={`/${seg}/${otherPath}`}>
          {t(otherPath === 'work' ? 'intent.openWork' : 'intent.openStudy')} →
        </Link>
      </section>
    </div>
  );
}
