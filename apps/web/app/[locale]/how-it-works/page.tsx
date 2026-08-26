import type { Metadata } from 'next';
import { ButtonLink, Card, Grid, Icon, Prose, Section } from '@probash/web-ui';
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
    path: '/how-it-works',
    title: t('site.howTitle'),
    description: t('site.howLead'),
  });
}

export function generateStaticParams() {
  return [{ locale: 'bn' }, { locale: 'en' }];
}

/** §14.1 — the four steps in detail, including what the platform refuses to do. */
export default async function HowItWorksPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: segment } = await params;
  const locale = parseLocaleParam(segment);
  const seg = localeSegment(locale);
  const t = translator(locale);

  const steps = [
    { icon: 'verify' as const, title: t('site.how1Title'), body: t('site.how1Body') },
    { icon: 'money' as const, title: t('site.how2Title'), body: t('site.how2Body') },
    { icon: 'route' as const, title: t('site.how3Title'), body: t('site.how3Body') },
    { icon: 'shield' as const, title: t('site.how4Title'), body: t('site.how4Body') },
  ];

  return (
    <>
      <Section
        headingLevel={1}
        surface="warm"
        eyebrow={t('site.tagline')}
        title={t('site.howTitle')}
        lead={t('site.howLead')}
      />

      <Section surface="default">
        <Grid min={280}>
          {steps.map((step) => (
            <Card key={step.title}>
              <span className="step-icon" aria-hidden="true">
                <Icon name={step.icon} size={24} />
              </span>
              <h2 className="card-title">{step.title}</h2>
              <p>{step.body}</p>
            </Card>
          ))}
        </Grid>
      </Section>

      {/* §19/§75 — the two honest limits, stated on the page that explains the product. */}
      <Section surface="muted" title={t('eligibility.unknown')} width="prose">
        <Prose>
          <p>{t('eligibility.unknownHelp')}</p>
          <p>
            {t('verification.whatWasNotVerified')} — {t('scanner.whatWeCouldNotCheck')}.
          </p>
          <p>
            <strong>{t('legal.noVisaGuarantee')}</strong>
          </p>
        </Prose>
      </Section>

      <Section surface="accent" width="prose">
        <div className="cta-block">
          <h2 className="pui-section-title">{t('site.ctaTitle')}</h2>
          <p className="pui-lead">{t('site.ctaLead')}</p>
          <ButtonLink href={`/${seg}/verify`} size="lg" icon={<Icon name="verify" size={22} />}>
            {t('scanner.checkNow')}
          </ButtonLink>
        </div>
      </Section>
    </>
  );
}
