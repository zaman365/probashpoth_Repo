import type { Metadata } from 'next';
import { ButtonLink, Section } from '@probash/web-ui';
import { requireChatGPTUser } from '@/app/chatgpt-auth';
import { getProfile } from '@/db/operations';
import { MaterialsWorkbench } from '@/components/MaterialsWorkbench';
import { localeSegment, parseLocaleParam, translator } from '@/lib/i18n';
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
    path: '/materials',
    title: t('materials.title'),
    description: t('materials.lead'),
  });
}

export default async function MaterialsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: segment } = await params;
  const locale = parseLocaleParam(segment);
  const seg = localeSegment(locale);
  const t = translator(locale);
  const user = await requireChatGPTUser(`/${seg}/materials`);
  const profile = await getProfile(user.userId);

  return (
    <>
      <Section
        surface="warm"
        headingLevel={1}
        eyebrow={t('operations.protected')}
        title={t('materials.title')}
        lead={t('materials.lead')}
      >
        {!profile ? (
          <ButtonLink href={`/${seg}/passport`}>{t('passport.startPassport')}</ButtonLink>
        ) : null}
      </Section>
      {profile ? (
        <Section surface="default">
          <MaterialsWorkbench locale={locale} passport={profile.passport} />
        </Section>
      ) : null}
    </>
  );
}
