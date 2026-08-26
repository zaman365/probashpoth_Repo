import type { Locale } from '@probash/domain';
import { Badge, ButtonLink, Card, Grid, Prose, Section } from '@probash/web-ui';
import { localeSegment, translator } from '@/lib/i18n';

/**
 * The three institutional pages share a shape (§14.5–§14.7): what the surface will
 * do, what it requires, and the publication boundary for evidence intake.
 */
export function OrganizationPage({
  locale,
  title,
  body,
  requirements,
}: {
  locale: Locale;
  title: string;
  body: string;
  requirements: string;
}) {
  const t = translator(locale);
  const seg = localeSegment(locale);

  return (
    <>
      <Section
        headingLevel={1}
        surface="warm"
        eyebrow={t('site.orgTitle')}
        title={title}
        lead={body}
      >
        <Badge tone="warning">{t('site.orgNotAvailable')}</Badge>
      </Section>

      <Section surface="default" title={t('site.orgWhatWeNeed')} width="prose">
        <Prose>
          <p>{requirements}</p>
          <p>{t('site.orgStatus')}</p>
        </Prose>
      </Section>

      <Section surface="muted" title={t('site.trustTitle')} lead={t('site.trustLead')}>
        <Grid min={300}>
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <Card key={n} tone="default">
              <p>{t(`site.trust${n}`)}</p>
            </Card>
          ))}
        </Grid>
      </Section>

      <Section surface="accent" width="prose">
        <div className="cta-block">
          <h2 className="pui-section-title">{t('site.orgIntakeTitle')}</h2>
          <p className="pui-lead">{t('site.orgIntakeLead')}</p>
          <ButtonLink href={`/${seg}/partners`} size="lg">
            {t('supply.submitEvidence')}
          </ButtonLink>
        </div>
      </Section>
    </>
  );
}
