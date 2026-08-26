import Link from 'next/link';
import type { Metadata } from 'next';
import { Badge, ButtonLink, Icon } from '@probash/web-ui';
import { chatGPTSignOutPath, requireChatGPTUser } from '@/app/chatgpt-auth';
import { getProfile, getWorkspace } from '@/db/operations';
import { localeSegment, parseLocaleParam, translator } from '@/lib/i18n';
import { canonicalMetadata } from '@/lib/seo';
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

  return (
    <div className="account-page wide-page">
      <header className="account-page-hero">
        <div>
          <span className="talent-kicker">{t('account.privateWorkspace')}</span>
          <h1>{t('account.pageTitle')}</h1>
          <p>{t('account.pageLead')}</p>
        </div>
        <Badge tone="success">
          {t(path === 'work' ? 'account.workTalent' : 'account.studyTalent')}
        </Badge>
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
      </div>

      <div className="account-settings-grid">
        <form action={updateProfileDirectionAction} className="account-direction-card">
          <input type="hidden" name="locale" value={seg} />
          <header>
            <span>
              <Icon name="route" size={22} />
            </span>
            <div>
              <small>{t('account.journeySettings')}</small>
              <h2>{t('account.primaryJourney')}</h2>
            </div>
          </header>
          <p>{t('account.switchHelp')}</p>
          <div className="account-path-options">
            <label className={path === 'work' ? 'selected' : ''}>
              <input
                type="radio"
                name="path"
                value="work"
                defaultChecked={path === 'work'}
                required
              />
              <Icon name="work" size={20} />
              <span>
                <strong>{t('account.workTalent')}</strong>
                <small>{t('onboarding.workPathBody')}</small>
              </span>
            </label>
            <label className={path === 'study' ? 'selected' : ''}>
              <input
                type="radio"
                name="path"
                value="study"
                defaultChecked={path === 'study'}
                required
              />
              <Icon name="study" size={20} />
              <span>
                <strong>{t('account.studyTalent')}</strong>
                <small>{t('onboarding.studyPathBody')}</small>
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
  );
}
