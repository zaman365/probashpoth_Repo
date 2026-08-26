import type { Metadata } from 'next';
import { Badge, ButtonLink, Card, Grid, Icon, Section } from '@probash/web-ui';
import type { ServiceDirectoryEntryDto } from '@probash/contracts';
import { apiRequest } from '@/lib/api';
import { localeSegment, parseLocaleParam, pick, translator } from '@/lib/i18n';
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
    path: '/services',
    title: t('os.servicesTitle'),
    description: t('os.servicesLead'),
  });
}

const STATUS_TONE = {
  verified: 'success',
  partially_verified: 'info',
  unverified: 'warning',
  suspended: 'danger',
} as const;

export default async function ServicesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: segment } = await params;
  const locale = parseLocaleParam(segment);
  const seg = localeSegment(locale);
  const t = translator(locale);
  const entries = await apiRequest<ServiceDirectoryEntryDto[]>('/api/v1/services', { locale });
  const statusLabel = (status: ServiceDirectoryEntryDto['officialStatus']) =>
    t(`os.${status === 'partially_verified' ? 'partiallyVerified' : status}`);

  return (
    <>
      <Section
        surface="warm"
        headingLevel={1}
        eyebrow={t('os.servicesEyebrow')}
        title={t('os.servicesTitle')}
        lead={t('os.servicesLead')}
      >
        <div className="hub-actions">
          <ButtonLink href={`/${seg}/verify`} icon={<Icon name="verify" size={19} />}>
            {t('home.verifyOffer')}
          </ButtonLink>
          <ButtonLink href={`/${seg}/help`} variant="outline">
            {t('common.help')}
          </ButtonLink>
        </div>
      </Section>
      <Section surface="default">
        <Grid min={330}>
          {entries.map((entry) => (
            <Card key={entry.id}>
              <div className="directory-card-head">
                <Badge tone={STATUS_TONE[entry.officialStatus]}>
                  {statusLabel(entry.officialStatus)}
                </Badge>
                <span>{entry.countryCode}</span>
              </div>
              <h2 className="card-title">{pick(entry.legalName, locale)}</h2>
              <p className="muted">{entry.type.replaceAll('_', ' ')}</p>
              {entry.licences.map((licence) => (
                <p key={licence.number}>
                  <strong>{licence.number}</strong> · {licence.status}
                </p>
              ))}
              {entry.services.length === 0 ? (
                <p className="muted">{t('os.serviceUnknown')}</p>
              ) : null}
              <dl className="directory-metrics">
                <div>
                  <dt>{t('os.complaints')}</dt>
                  <dd>{entry.complaintCount}</dd>
                </div>
                <div>
                  <dt>{t('os.publishedIncidents')}</dt>
                  <dd>{entry.publishedSafetyIncidentCount}</dd>
                </div>
                <div>
                  <dt>{t('os.outcomes')}</dt>
                  <dd>{entry.outcomeCount}</dd>
                </div>
              </dl>
              {entry.sources.map((source) => (
                <a
                  key={source.id}
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="source-link"
                >
                  {pick(source.title, locale)} <Icon name="arrow" size={16} />
                </a>
              ))}
              {entry.isSyntheticDemoData ? (
                <Badge tone="danger">{t('common.demoDataWarning')}</Badge>
              ) : null}
            </Card>
          ))}
        </Grid>
      </Section>
    </>
  );
}
