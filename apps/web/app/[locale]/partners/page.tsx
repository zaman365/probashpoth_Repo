import type { Metadata } from 'next';
import { Badge, ButtonLink, Card, Grid, Icon, Section } from '@probash/web-ui';
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
    path: '/partners',
    title: t('supply.title'),
    description: t('supply.lead'),
  });
}

export default async function PartnerPortalsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: segment } = await params;
  const locale = parseLocaleParam(segment);
  const seg = localeSegment(locale);
  const t = translator(locale);
  const portals = [
    ['work', 'supply.employerTitle', 'supply.employerBody'],
    ['route', 'supply.recruiterTitle', 'supply.recruiterBody'],
    ['study', 'supply.institutionTitle', 'supply.institutionBody'],
    ['shield', 'supply.providerTitle', 'supply.providerBody'],
  ] as const;
  const workflow = ['supply.workflow1', 'supply.workflow2', 'supply.workflow3', 'supply.workflow4'];

  return (
    <>
      <Section
        surface="warm"
        headingLevel={1}
        eyebrow={t('supply.eyebrow')}
        title={t('supply.title')}
        lead={t('supply.lead')}
      >
        <div className="hub-actions">
          <ButtonLink href={`/${seg}/services`} icon={<Icon name="verify" size={19} />}>
            {t('nav.services')}
          </ButtonLink>
          <ButtonLink href={`/${seg}/outcomes`} variant="outline">
            {t('outcomeIntelligence.title')}
          </ButtonLink>
        </div>
      </Section>

      <Section surface="default" title={t('supply.portalTitle')}>
        <Grid min={280}>
          {portals.map(([icon, title, body]) => (
            <Card key={title} className="partner-portal-card">
              <span className="step-icon">
                <Icon name={icon} size={26} />
              </span>
              <h2 className="card-title">{t(title)}</h2>
              <p>{t(body)}</p>
              <Badge tone="warning">{t('supply.evidenceGate')}</Badge>
            </Card>
          ))}
        </Grid>
      </Section>

      <Section
        surface="muted"
        title={t('supply.governanceTitle')}
        lead={t('supply.governanceLead')}
      >
        <div className="governance-grid">
          <Card>
            <Badge tone="success">{t('supply.organic')}</Badge>
            <h3 className="card-title">{t('supply.organicTitle')}</h3>
            <p>{t('supply.organicBody')}</p>
          </Card>
          <Card>
            <Badge tone="neutral">{t('supply.promotion')}</Badge>
            <h3 className="card-title">{t('supply.promotionTitle')}</h3>
            <p>{t('supply.promotionBody')}</p>
          </Card>
          <Card>
            <Badge tone="danger">{t('supply.neverSold')}</Badge>
            <h3 className="card-title">{t('supply.neverSoldTitle')}</h3>
            <p>{t('supply.neverSoldBody')}</p>
          </Card>
        </div>
      </Section>

      <Section surface="default" title={t('supply.workflowTitle')}>
        <ol className="partner-workflow">
          {workflow.map((item, index) => (
            <li key={item}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <strong>{t(item)}</strong>
            </li>
          ))}
        </ol>
      </Section>
    </>
  );
}
