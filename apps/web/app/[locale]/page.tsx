import Link from 'next/link';
import type { Metadata } from 'next';
import {
  Badge,
  ButtonLink,
  Card,
  Container,
  Disclosure,
  Grid,
  Icon,
  Section,
  Stat,
  StatGroup,
} from '@probash/web-ui';
import { apiRequest } from '@/lib/api';
import { localeSegment, parseLocaleParam, translator } from '@/lib/i18n';
import { canonicalMetadata } from '@/lib/seo';
import { HeroArt } from '@/components/HeroArt';
import { ListenButton } from '@/components/ListenButton';

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
    path: '',
    title: `${t('site.heroTitle')}`,
    description: t('site.heroLead'),
  });
}

async function countOrZero(path: string): Promise<number> {
  try {
    const rows = await apiRequest<unknown[]>(path);
    return Array.isArray(rows) ? rows.length : 0;
  } catch {
    return 0;
  }
}

/**
 * §14.1 + §15 — the landing page has to work as two things at once: a public website
 * that explains and is indexable, and a worker's front door. So the seven primary
 * actions sit directly under the hero, above everything a visitor merely reads.
 */
export default async function Landing({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: segment } = await params;
  const locale = parseLocaleParam(segment);
  const seg = localeSegment(locale);
  const t = translator(locale);

  const [countries, routes, sources, jobs] = await Promise.all([
    countOrZero('/api/v1/countries'),
    countOrZero('/api/v1/routes'),
    countOrZero('/api/v1/sources'),
    countOrZero('/api/v1/jobs'),
  ]);

  const actions = [
    { href: `/${seg}/jobs`, icon: 'work' as const, key: 'home.findWork' },
    { href: `/${seg}/study`, icon: 'study' as const, key: 'home.findStudy' },
    { href: `/${seg}/verify`, icon: 'verify' as const, key: 'home.verifyOffer' },
    { href: `/${seg}/cases`, icon: 'document' as const, key: 'home.myApplications' },
    { href: `/${seg}/explore`, icon: 'money' as const, key: 'home.howMuchCost' },
    { href: `/${seg}/prepare`, icon: 'route' as const, key: 'home.howToPrepare' },
    { href: `/${seg}/help`, icon: 'phone' as const, key: 'home.getHelp' },
  ];

  const steps = [
    { icon: 'verify' as const, title: t('site.how1Title'), body: t('site.how1Body') },
    { icon: 'money' as const, title: t('site.how2Title'), body: t('site.how2Body') },
    { icon: 'route' as const, title: t('site.how3Title'), body: t('site.how3Body') },
    { icon: 'shield' as const, title: t('site.how4Title'), body: t('site.how4Body') },
  ];

  const invariants = [1, 2, 3, 4, 5, 6].map((n) => t(`site.trust${n}`));

  const guides = [
    {
      href: `/${seg}/countries`,
      icon: 'globe' as const,
      title: t('site.guideCountries'),
      body: t('site.guideCountriesBody'),
    },
    {
      href: `/${seg}/occupations`,
      icon: 'work' as const,
      title: t('site.guideOccupations'),
      body: t('site.guideOccupationsBody'),
    },
    {
      href: `/${seg}/safety`,
      icon: 'warning' as const,
      title: t('site.guideSafety'),
      body: t('site.guideSafetyBody'),
    },
  ];

  const organizations = [
    {
      href: `/${seg}/for-employers`,
      title: t('site.orgEmployers'),
      body: t('site.orgEmployersBody'),
    },
    { href: `/${seg}/for-agencies`, title: t('site.orgAgencies'), body: t('site.orgAgenciesBody') },
    {
      href: `/${seg}/for-government`,
      title: t('site.orgGovernment'),
      body: t('site.orgGovernmentBody'),
    },
  ];

  const faqs = [1, 2, 3, 4, 5, 6].map((n) => ({
    question: t(`site.faq${n}Q`),
    answer: t(`site.faq${n}A`),
  }));

  return (
    <>
      <section className="pui-section pui-surface-warm hero-section">
        <Container width="site">
          <div className="hero-grid">
            <div className="hero-copy">
              <p className="pui-eyebrow">{t('site.tagline')}</p>
              <h1 className="hero-title">{t('site.heroTitle')}</h1>
              <p className="pui-lead">{t('site.heroLead')}</p>
              <div className="hero-actions">
                <ButtonLink
                  href={`/${seg}/verify`}
                  size="lg"
                  icon={<Icon name="verify" size={22} />}
                >
                  {t('site.heroVerifyCta')}
                </ButtonLink>
                <ButtonLink href={`/${seg}/jobs`} size="lg" variant="secondary">
                  {t('site.heroExploreCta')}
                </ButtonLink>
              </div>
              <p className="muted">{t('site.heroNote')}</p>
              <ListenButton
                text={`${t('site.heroTitle')}। ${t('site.heroLead')}`}
                label={t('common.listen')}
                lang={locale}
              />
            </div>
            <HeroArt />
          </div>
        </Container>
      </section>

      {/* §15 — the worker's own actions come before anything a visitor merely reads. */}
      <Section surface="default" title={t('site.actionsTitle')}>
        <nav aria-label={t('site.actionsTitle')}>
          <Grid min={260}>
            {actions.map((action) => (
              <Link key={action.key} href={action.href} className="action-tile">
                <Icon name={action.icon} size={26} />
                <span>{t(action.key)}</span>
              </Link>
            ))}
          </Grid>
        </nav>
      </Section>

      <Section surface="muted" title={t('site.statsTitle')} lead={t('site.statsNote')}>
        <StatGroup>
          <Stat label={t('site.statCountries')} value={String(countries)} />
          <Stat label={t('site.statRoutes')} value={String(routes)} />
          <Stat label={t('site.statSources')} value={String(sources)} />
          <Stat label={t('site.statJobs')} value={String(jobs)} />
        </StatGroup>
      </Section>

      <Section
        surface="default"
        eyebrow={t('site.tagline')}
        title={t('site.howTitle')}
        lead={t('site.howLead')}
      >
        <Grid min={260}>
          {steps.map((step) => (
            <Card key={step.title}>
              <span className="step-icon" aria-hidden="true">
                <Icon name={step.icon} size={24} />
              </span>
              <h3 className="card-title">{step.title}</h3>
              <p>{step.body}</p>
            </Card>
          ))}
        </Grid>
      </Section>

      <Section surface="accent" title={t('site.trustTitle')} lead={t('site.trustLead')}>
        <Grid min={300}>
          {invariants.map((line) => (
            <Card key={line} tone="default">
              <span className="check-mark" aria-hidden="true">
                <Icon name="check" size={20} />
              </span>
              <p>{line}</p>
            </Card>
          ))}
        </Grid>
      </Section>

      <Section surface="default" title={t('site.guidesTitle')} lead={t('site.guidesLead')}>
        <Grid min={300}>
          {guides.map((guide) => (
            <Link key={guide.href} href={guide.href} className="guide-link">
              <Card interactive>
                <Icon name={guide.icon} size={26} />
                <h3 className="card-title">{guide.title}</h3>
                <p>{guide.body}</p>
                <span className="link-more">
                  {t('guide.readMore')} <Icon name="arrow" size={18} />
                </span>
              </Card>
            </Link>
          ))}
        </Grid>
      </Section>

      <Section surface="muted" title={t('site.orgTitle')} lead={t('site.orgLead')}>
        <Grid min={300}>
          {organizations.map((org) => (
            <Link key={org.href} href={org.href} className="guide-link">
              <Card interactive>
                <h3 className="card-title">{org.title}</h3>
                <p>{org.body}</p>
                <span className="link-more">
                  {t('guide.readMore')} <Icon name="arrow" size={18} />
                </span>
              </Card>
            </Link>
          ))}
        </Grid>
        <p style={{ marginBlockStart: 'var(--space-lg)' }}>
          <Badge tone="warning">{t('site.orgStatus')}</Badge>
        </p>
      </Section>

      <Section surface="default" title={t('site.faqTitle')} width="prose">
        <div className="pui-stack pui-stack-sm">
          {faqs.map((faq) => (
            <Disclosure key={faq.question} summary={faq.question}>
              <p>{faq.answer}</p>
            </Disclosure>
          ))}
        </div>
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
