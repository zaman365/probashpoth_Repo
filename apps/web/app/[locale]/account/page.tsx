import Link from 'next/link';
import type { Metadata } from 'next';
import { ButtonLink, Icon } from '@probash/web-ui';
import { chatGPTSignOutPath, requireChatGPTUser } from '@/app/chatgpt-auth';
import { getProfile, getWorkspace } from '@/db/operations';
import { localeSegment, parseLocaleParam, translator } from '@/lib/i18n';
import { canonicalMetadata } from '@/lib/seo';
import { JourneyWorkspaceShell } from '@/components/JourneyWorkspaceShell';
import { updateProfileDirectionAction } from '../operational-actions';

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
    path: '/account',
    title: t('account.myAccount'),
    description: t('account.pageLead'),
  });
}

export default async function AccountPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { locale: segment } = await params;
  const { saved } = await searchParams;
  const locale = parseLocaleParam(segment);
  const seg = localeSegment(locale);
  const t = translator(locale);
  const user = await requireChatGPTUser(`/${seg}/account`);
  const [profile, workspace] = await Promise.all([
    getProfile(user.userId),
    getWorkspace(user.userId),
  ]);

  if (!profile?.onboardingCompletedAt) {
    return (
      <section className="account-empty wide-page">
        <span className="talent-kicker">{t('account.myAccount')}</span>
        <h1>{t('account.finishSetupTitle')}</h1>
        <p>{t('account.finishSetupBody')}</p>
        <ButtonLink href={`/${seg}/onboarding`} icon={<Icon name="route" size={19} />}>
          {t('account.completeOnboarding')}
        </ButtonLink>
      </section>
    );
  }

  const stages = ['exploring', 'preparing', 'applying', 'progressing'] as const;
  const path = profile.activePath === 'study' ? 'study' : 'work';
  const enabledSelection =
    profile.enabledPaths.includes('work') && profile.enabledPaths.includes('study')
      ? 'both'
      : (profile.enabledPaths[0] ?? path);
  const primaryJourney =
    workspace.journeys.find((journey) => journey.path === path && journey.status === 'active') ??
    workspace.journeys.find((journey) => journey.path === path) ??
    null;
  const completedTasks = primaryJourney?.tasks.filter((task) => task.status === 'done').length ?? 0;
  const progress = primaryJourney?.tasks.length
    ? Math.round((completedTasks / primaryJourney.tasks.length) * 100)
    : 0;
  const needsCount = [
    primaryJourney?.tasks.some((task) => task.status !== 'done'),
    workspace.unreadAlerts > 0,
    workspace.pendingVerifications > 0,
  ].filter(Boolean).length;
  const passportStarted = Boolean(
    profile.passport.identity.hasPassport !== undefined ||
    profile.passport.education.highestLevel ||
    profile.passport.professional.experienceMonths !== undefined ||
    profile.passport.study.target ||
    profile.passport.language.englishLevel ||
    profile.passport.preferences.destinationCountries.length,
  );
  const readinessItems = [
    { label: t('account.readinessAccount'), complete: true, href: `/${seg}/account` },
    { label: t('account.readinessPath'), complete: true, href: '#journey-settings' },
    {
      label: t('account.readinessGoal'),
      complete: Boolean(profile.goalTitle),
      href: '#journey-settings',
    },
    {
      label: t('account.readinessPassport'),
      complete: passportStarted,
      href: `/${seg}/passport`,
    },
    {
      label: t('account.readinessDocuments'),
      complete: workspace.documents.length > 0,
      href: `/${seg}/documents`,
    },
  ];
  const readinessCompleted = readinessItems.filter((item) => item.complete).length;
  const readinessProgress = Math.round((readinessCompleted / readinessItems.length) * 100);

  return (
    <JourneyWorkspaceShell
      active="account"
      locale={locale}
      needsCount={needsCount}
      profile={profile}
      progress={progress}
      user={user}
    >
      <div className="account-page">
        <header className="account-page-hero">
          <div>
            <span className="talent-kicker">{t('account.privateWorkspace')}</span>
            <h1>{t('account.pageTitle')}</h1>
            <p>{t('account.pageLead')}</p>
          </div>
        </header>

        {saved === '1' ? (
          <p className="account-saved" role="status">
            {t('account.saved')}
          </p>
        ) : null}

        <div className="account-overview-grid">
          <article>
            <small>{t('account.identity')}</small>
            <strong>{user.displayName}</strong>
            <span>{user.email}</span>
          </article>
          <article>
            <small>{t('account.activeJourneys')}</small>
            <strong>
              {workspace.journeys.filter((journey) => journey.status === 'active').length}
            </strong>
            <Link href={`/${seg}/dashboard`}>{t('nav.dashboard')} →</Link>
          </article>
          <article>
            <small>{t('workspace.documents')}</small>
            <strong>{workspace.documents.length}</strong>
            <Link href={`/${seg}/documents`}>{t('workspace.openDocuments')} →</Link>
          </article>
          {path === 'study' ? (
            <article className="account-scholarship-card">
              <small>{t('scholarships.eyebrow')}</small>
              <strong>{t('scholarships.accountTitle')}</strong>
              <span>{t('scholarships.accountBody')}</span>
              <Link href={`/${seg}/scholarships`}>{t('scholarships.heroCta')} →</Link>
            </article>
          ) : null}
        </div>

        <div className="account-settings-grid">
          <form
            action={updateProfileDirectionAction}
            className="account-direction-card"
            id="journey-settings"
          >
            <input type="hidden" name="locale" value={seg} />
            <input type="hidden" name="activePath" value={path} />
            <header>
              <span>
                <Icon name="route" size={22} />
              </span>
              <div>
                <small>{t('account.journeySettings')}</small>
                <h2>{t('account.enabledWorkspaces')}</h2>
              </div>
            </header>
            <p>{t('account.switchHelp')}</p>
            <div className="account-path-options">
              <label className={enabledSelection === 'work' ? 'selected' : ''}>
                <input
                  type="radio"
                  name="path"
                  value="work"
                  defaultChecked={enabledSelection === 'work'}
                  required
                />
                <Icon name="work" size={20} />
                <span>
                  <strong>{t('account.workTalent')}</strong>
                  <small>{t('onboarding.workPathBody')}</small>
                </span>
              </label>
              <label className={enabledSelection === 'study' ? 'selected' : ''}>
                <input
                  type="radio"
                  name="path"
                  value="study"
                  defaultChecked={enabledSelection === 'study'}
                  required
                />
                <Icon name="study" size={20} />
                <span>
                  <strong>{t('account.studyTalent')}</strong>
                  <small>{t('onboarding.studyPathBody')}</small>
                </span>
              </label>
              <label className={enabledSelection === 'both' ? 'selected' : ''}>
                <input
                  type="radio"
                  name="path"
                  value="both"
                  defaultChecked={enabledSelection === 'both'}
                  required
                />
                <Icon name="route" size={20} />
                <span>
                  <strong>{t('account.bothPaths')}</strong>
                  <small>{t('onboarding.bothPathBody')}</small>
                </span>
              </label>
            </div>
            <label className="account-field">
              <span>{t('onboarding.stageQuestion')}</span>
              <select name="stage" defaultValue={profile.journeyStage}>
                {stages.map((stage) => (
                  <option key={stage} value={stage}>
                    {t(`onboarding.stage.${stage}`)}
                  </option>
                ))}
              </select>
            </label>
            <label className="account-field">
              <span>{t('onboarding.goalQuestion')}</span>
              <input
                name="goalTitle"
                maxLength={180}
                defaultValue={profile.goalTitle ?? ''}
                placeholder={t('onboarding.goalPlaceholder')}
              />
            </label>
            <button type="submit" className="btn btn-primary">
              {t('account.saveChanges')}
            </button>
          </form>

          <div className="account-side-rail">
            <aside className="account-readiness-card">
              <header>
                <div>
                  <small>{t('account.readinessEyebrow')}</small>
                  <h2>{t('account.readinessTitle')}</h2>
                </div>
                <strong>{readinessProgress}%</strong>
              </header>
              <div className="account-readiness-progress" aria-hidden="true">
                <span style={{ width: `${readinessProgress}%` }} />
              </div>
              <ul>
                {readinessItems.map((item, index) => (
                  <li className={item.complete ? 'complete' : undefined} key={item.label}>
                    <span aria-hidden="true">{item.complete ? '✓' : index + 1}</span>
                    <Link href={item.href}>{item.label}</Link>
                  </li>
                ))}
              </ul>
              <p>
                {t('account.readinessCount', {
                  completed: readinessCompleted,
                  total: readinessItems.length,
                })}
              </p>
            </aside>

            <aside className="account-privacy-card">
              <span>
                <Icon name="shield" size={23} />
              </span>
              <small>{t('account.dataControl')}</small>
              <h2>{t('account.yourData')}</h2>
              <p>{t('account.yourDataBody')}</p>
              <ul>
                <li>
                  <Icon name="check" size={16} />
                  {t('account.dataRule1')}
                </li>
                <li>
                  <Icon name="check" size={16} />
                  {t('account.dataRule2')}
                </li>
                <li>
                  <Icon name="check" size={16} />
                  {t('account.dataRule3')}
                </li>
              </ul>
              <Link href={chatGPTSignOutPath(`/${seg}`)} className="account-signout-link">
                {t('account.signOut')} →
              </Link>
            </aside>
          </div>
        </div>
      </div>
    </JourneyWorkspaceShell>
  );
}
