import type { Metadata } from 'next';
import { ButtonLink, Card, Icon, Section } from '@probash/web-ui';
import { localeSegment, parseLocaleParam, translator } from '@/lib/i18n';
import { canonicalMetadata } from '@/lib/seo';

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
    path: '/prepare',
    title: t('home.howToPrepare'),
    description: t('passport.preparePageLead'),
  });
}

/**
 * §31 — preparation. The learning content itself is a later epic; what ships here is
 * the honest entry point, not a fake course catalogue.
 */
export default async function PreparePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: segment } = await params;
  const locale = parseLocaleParam(segment);
  const seg = localeSegment(locale);
  const t = translator(locale);

  return (
    <Section
      headingLevel={1}
      surface="warm"
      eyebrow={t('passport.eyebrow')}
      title={t('home.howToPrepare')}
      lead={t('passport.preparePageLead')}
    >
      <Card tone="default">
        <p>{t('passport.preparePageNote')}</p>
        <div className="hub-actions">
          <ButtonLink
            href={`/${seg}/passport#plan`}
            size="lg"
            icon={<Icon name="route" size={20} />}
          >
            {t('passport.startPassport')}
          </ButtonLink>
          <ButtonLink href={`/${seg}/countries`} size="lg" variant="outline">
            {t('passport.browseCountries')}
          </ButtonLink>
        </div>
      </Card>
    </Section>
  );
}
