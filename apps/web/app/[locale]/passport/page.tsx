import type { Metadata } from 'next';
import { Icon } from '@probash/web-ui';
import { localeSegment, parseLocaleParam, translator } from '@/lib/i18n';
import { canonicalMetadata } from '@/lib/seo';
import { PassportPlanner } from './passport-planner';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { getProfile } from '@/db/operations';
import { WorkspacePageShell } from '@/components/WorkspacePageShell';

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
    path: '/passport',
    title: t('passport.title'),
    description: t('passport.lead'),
  });
}

export default async function PassportPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ workspace?: string }>;
}) {
  const { locale: segment } = await params;
  const { workspace: workspaceMode } = await searchParams;
  const locale = parseLocaleParam(segment);
  const seg = localeSegment(locale);
  const t = translator(locale);
  const user = await getChatGPTUser();
  const profile = user ? await getProfile(user.userId) : null;

  return (
    <WorkspacePageShell active="passport" enabled={workspaceMode === '1'} locale={locale}>
      <div className="passport-page">
        <section className="passport-hero" aria-labelledby="passport-title">
          <div className="passport-hero-copy">
            <p className="pui-eyebrow">{t('passport.eyebrow')}</p>
            <h1 id="passport-title">{t('passport.title')}</h1>
            <p>{t('passport.lead')}</p>
          </div>
          <div className="passport-trust-panel">
            <span className="passport-trust-icon" aria-hidden="true">
              <Icon name="shield" size={24} />
            </span>
            <div>
              <strong>{t('passport.privacyTitle')}</strong>
              <p>{t('passport.privacyBody')}</p>
            </div>
          </div>
          <div className="passport-boundaries" aria-label={t('passport.notEligibility')}>
            <p>
              <Icon name="warning" size={18} />
              <span>{t('passport.notEligibility')}</span>
            </p>
            <p>
              <Icon name="verify" size={18} />
              <span>{t('passport.officialReview')}</span>
            </p>
          </div>
        </section>

        <PassportPlanner locale={locale} localeSegment={seg} initialPassport={profile?.passport} />
      </div>
    </WorkspacePageShell>
  );
}
