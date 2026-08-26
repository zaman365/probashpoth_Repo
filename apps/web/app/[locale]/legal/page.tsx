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
    path: '/legal',
    title: t('site.legalTitle'),
    description: t('site.legalNotTitle'),
  });
}

export function generateStaticParams() {
  return [{ locale: 'bn' }, { locale: 'en' }];
}

/**
 * §3 / docs/compliance — the "what this is not" list, published rather than buried.
 * Most harm in this sector starts with an overstated claim.
 */
export default async function LegalPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: segment } = await params;
  const locale = parseLocaleParam(segment);
  const t = translator(locale);

  return (
    <>
      <Section
        headingLevel={1}
        surface="warm"
        title={t('site.legalTitle')}
        lead={t('legal.noVisaGuarantee')}
      />

      <Section surface="default" title={t('site.legalNotTitle')}>
        <Grid min={300}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Card key={n} tone="muted">
              <p>{t(`site.legalNot${n}`)}</p>
            </Card>
          ))}
        </Grid>
      </Section>

      <Section surface="muted" title={t('site.legalStatusTitle')} width="prose">
        <Prose>
          <p>{t('site.legalStatusBody')}</p>
          <p>{t('legal.dataUse')}</p>
          <p>{t('legal.notGovernment')}</p>
        </Prose>
        <p style={{ marginBlockStart: 'var(--space-lg)' }}>
          <Badge tone="warning">{t('common.demoDataWarning')}</Badge>
        </p>
      </Section>
    </>
  );
}
