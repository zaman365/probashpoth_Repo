import type { Metadata } from 'next';
import { Badge, Card, Grid, Prose, Section } from '@probash/web-ui';
import { parseLocaleParam, translator } from '@/lib/i18n';
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
    path: '/about',
    title: t('site.aboutTitle'),
    description: t('site.aboutLead'),
  });
}

export function generateStaticParams() {
  return [{ locale: 'bn' }, { locale: 'en' }];
}

/** §14.1 — what this is, why it exists, and an honest inventory of what is built. */
export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: segment } = await params;
  const locale = parseLocaleParam(segment);
  const t = translator(locale);

  return (
    <>
      <Section
        headingLevel={1}
        surface="warm"
        eyebrow={t('site.tagline')}
        title={t('site.aboutTitle')}
        lead={t('site.aboutLead')}
      />

      <Section surface="default" title={t('site.aboutWhyTitle')} width="prose">
        <Prose>
          <p>{t('site.aboutWhy1')}</p>
          <p>{t('site.aboutWhy2')}</p>
          <p>
            <strong>{t('site.aboutWhy3')}</strong>
          </p>
        </Prose>
      </Section>

      <Section surface="muted" title={t('site.aboutBuildTitle')}>
        <Grid min={320}>
          <Card>
            <h3 className="card-title">{t('site.aboutBuildTitle')}</h3>
            <p>{t('site.aboutBuildBody')}</p>
          </Card>
          <Card tone="warm">
            <h3 className="card-title">{t('site.aboutNotBuiltTitle')}</h3>
            <p>{t('site.aboutNotBuiltBody')}</p>
            <Badge tone="warning">{t('common.demoDataWarning')}</Badge>
          </Card>
        </Grid>
      </Section>

      <Section surface="accent" title={t('site.trustTitle')} lead={t('site.trustLead')}>
        <Grid min={300}>
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <Card key={n}>
              <p>{t(`site.trust${n}`)}</p>
            </Card>
          ))}
        </Grid>
      </Section>
    </>
  );
}
