import Link from 'next/link';
import type { Metadata } from 'next';
import {
  CanvasPanel,
  ChipLink,
  Disclosure,
  FeaturePill,
  GlassCard,
  Icon,
  Reveal,
} from '@probash/web-ui';
import { apiRequest } from '@/lib/api';
import { localeSegment, parseLocaleParam, translator } from '@/lib/i18n';
import { canonicalMetadata, siteUrl } from '@/lib/seo';
import { IntentSwitch, parseIntent } from '@/components/IntentChooser';
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

  const title = t('site.heroTitle');
  const description = t('site.heroLead');
  const metadata = canonicalMetadata({
    locale,
    path: '',
    title,
    description,
  });

  return {
    ...metadata,
    openGraph: {
      ...metadata.openGraph,
      type: 'website',
      images: [{ url: `${siteUrl}/og.png`, width: 1731, height: 909, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`${siteUrl}/og.png`],
    },
  };
}

async function listOrEmpty<T>(path: string): Promise<T[]> {
  try {
    const rows = await apiRequest<T[]>(path);
    return Array.isArray(rows) ? rows : [];
  } catch {
    // The public front door must remain useful while the API is unavailable.
    return [];
  }
}

async function countOrZero(path: string): Promise<number> {
  return (await listOrEmpty(path)).length;
}

export default async function Landing({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ intent?: string }>;
}) {
  const { locale: segment } = await params;
  const { intent: intentParam } = await searchParams;
  const locale = parseLocaleParam(segment);
  const seg = localeSegment(locale);
  const t = translator(locale);
  const intent = parseIntent(intentParam);

  const [countries, routes, sources, jobs, workRoutes, studyRoutes, courses] = await Promise.all([
    countOrZero('/api/v1/countries'),
    countOrZero('/api/v1/routes'),
    countOrZero('/api/v1/sources'),
    countOrZero('/api/v1/jobs'),
    listOrEmpty<{ destinationCountry: string }>('/api/v1/routes?purpose=work'),
    listOrEmpty<{ destinationCountry: string }>('/api/v1/routes?purpose=study'),
    countOrZero('/api/v1/courses'),
  ]);

  const distinctCountries = (rows: { destinationCountry: string }[]) =>
    new Set(rows.map((row) => row.destinationCountry)).size;

  const questions = [
    {
      number: '01',
      icon: 'verify' as const,
      href: `/${seg}/verify`,
      title: t('experience.q1Title'),
      body: t('experience.q1Body'),
      cta: t('experience.q1Cta'),
      primary: true,
    },
    {
      number: '02',
      icon: 'money' as const,
      href: `/${seg}/explore`,
      title: t('experience.q2Title'),
      body: t('experience.q2Body'),
      cta: t('experience.q2Cta'),
    },
    {
      number: '03',
      icon: 'document' as const,
      href: `/${seg}/how-it-works`,
      title: t('experience.q3Title'),
      body: t('experience.q3Body'),
      cta: t('experience.q3Cta'),
    },
    {
      number: '04',
      icon: 'route' as const,
      href: `/${seg}/prepare`,
      title: t('experience.q4Title'),
      body: t('experience.q4Body'),
      cta: t('experience.q4Cta'),
    },
  ];

  const journeySteps = [
    {
      icon: 'search' as const,
      title: t('experience.step1Title'),
      body: t('experience.step1Body'),
    },
    {
      icon: 'shield' as const,
      title: t('experience.step2Title'),
      body: t('experience.step2Body'),
    },
    {
      icon: 'money' as const,
      title: t('experience.step3Title'),
      body: t('experience.step3Body'),
    },
    {
      icon: 'family' as const,
      title: t('experience.step4Title'),
      body: t('experience.step4Body'),
    },
  ];

  const trustRules = [1, 2, 3, 4, 5, 6].map((number) => t(`site.trust${number}`));

  const organizations = [
    {
      href: `/${seg}/for-employers`,
      number: '01',
      title: t('site.orgEmployers'),
      body: t('site.orgEmployersBody'),
    },
    {
      href: `/${seg}/for-agencies`,
      number: '02',
      title: t('site.orgAgencies'),
      body: t('site.orgAgenciesBody'),
    },
    {
      href: `/${seg}/for-government`,
      number: '03',
      title: t('site.orgGovernment'),
      body: t('site.orgGovernmentBody'),
    },
  ];

  const faqs = [1, 2, 4, 5].map((number) => ({
    question: t(`site.faq${number}Q`),
    answer: t(`site.faq${number}A`),
  }));

  return (
    <div className="experience-home">
      <section className="experience-hero" aria-labelledby="experience-hero-title">
        <div className="experience-shell">
          <div className="experience-hero-frame">
            <CanvasPanel className="experience-canvas">
              <div className="hero-grid">
                <div className="hero-copy">
                  <Reveal index={0}>
                    <span className="hero-eyebrow">{t('site.tagline')}</span>
                  </Reveal>
                  <Reveal index={1}>
                    <h1 id="experience-hero-title" className="hero-title">
                      {t('site.heroTitle')}
                    </h1>
                  </Reveal>
                  <Reveal index={2}>
                    <p className="hero-lead">{t('site.heroLead')}</p>
                  </Reveal>

                  <Reveal index={3}>
                    <div className="hero-actions">
                      <ChipLink href={`/${seg}/verify`} chip={<Icon name="arrow" size={18} />}>
                        {t('site.heroVerifyCta')}
                      </ChipLink>
                      <Link
                        href={`/${seg}/countries`}
                        className="experience-btn experience-btn-ghost"
                      >
                        <Icon name="globe" size={20} />
                        <span>{t('experience.exploreRoutes')}</span>
                      </Link>
                    </div>
                  </Reveal>

                  <Reveal index={4}>
                    <div className="hero-utility">
                      <ListenButton
                        text={`${t('site.heroTitle')}। ${t('site.heroLead')}`}
                        label={t('common.listen')}
                        lang={locale}
                      />
                      <p className="hero-note">{t('site.heroNote')}</p>
                    </div>
                  </Reveal>

                  <Reveal index={5}>
                    <ul className="hero-pills">
                      <FeaturePill icon={<Icon name="check" size={16} />}>
                        {t('site.pill1')}
                      </FeaturePill>
                      <FeaturePill icon={<Icon name="check" size={16} />}>
                        {t('site.pill2')}
                      </FeaturePill>
                      <FeaturePill icon={<Icon name="check" size={16} />}>
                        {t('site.pill3')}
                      </FeaturePill>
                    </ul>
                  </Reveal>
                </div>

                <Reveal index={2} className="hero-side">
                  <GlassCard as="article">
                    <span className="hero-side-icon" aria-hidden="true">
                      <Icon name="verify" size={22} />
                    </span>
                    <h2 id="quick-check-title" className="hero-side-title">
                      {t('experience.checkTitle')}
                    </h2>
                    <p>{t('experience.checkBody')}</p>

                    <form action={`/${seg}/verify`} method="get" className="hero-verify-form">
                      <label htmlFor="hero-public-id" className="hero-verify-label">
                        {t('scanner.publicIdLabel')}
                      </label>
                      <div className="hero-verify-row">
                        <input
                          id="hero-public-id"
                          name="publicId"
                          className="hero-verify-input"
                          placeholder="BD-QA-2026-00000000"
                          autoComplete="off"
                        />
                        <button type="submit" className="pui-btn pui-btn-primary pui-btn-md">
                          {t('scanner.checkNow')}
                        </button>
                      </div>
                    </form>

                    <dl className="hero-side-stats">
                      <div>
                        <dt>{t('intent.routesFor')}</dt>
                        <dd>{intent === 'study' ? studyRoutes.length : workRoutes.length}</dd>
                      </div>
                      <div>
                        <dt>{t('site.statCountries')}</dt>
                        <dd>{distinctCountries(intent === 'study' ? studyRoutes : workRoutes)}</dd>
                      </div>
                      <div>
                        <dt>{intent === 'study' ? t('site.studyCourses') : t('site.statJobs')}</dt>
                        <dd>{intent === 'study' ? courses : jobs}</dd>
                      </div>
                    </dl>

                    <p className="hero-warning">
                      <Icon name="warning" size={18} />
                      <span>{t('cost.payOnlyHere')}</span>
                    </p>
                  </GlassCard>
                </Reveal>
              </div>

              <div className="hero-intent-dock">
                <IntentSwitch locale={locale} intent={intent} tone="canvas" compact />
              </div>
            </CanvasPanel>
          </div>
        </div>
      </section>

      <section className="experience-talent-os" aria-labelledby="talent-os-title">
        <div className="experience-shell">
          <div className="talent-os-intro">
            <div>
              <p className="experience-section-kicker">{t('talentOs.eyebrow')}</p>
              <h2 id="talent-os-title">{t('talentOs.title')}</h2>
            </div>
            <div>
              <p>{t('talentOs.lead')}</p>
              <Link href={`/${seg}/onboarding`} className="experience-btn experience-btn-dark">
                <span>{t('talentOs.cta')}</span>
                <Icon name="arrow" size={19} />
              </Link>
            </div>
          </div>
          <div className="talent-os-principles">
            {(
              [
                ['01', 'route', 'talentOs.oneProfile', 'talentOs.oneProfileBody'],
                [
                  '02',
                  intent === 'study' ? 'study' : 'work',
                  'talentOs.oneJourney',
                  'talentOs.oneJourneyBody',
                ],
                ['03', 'verify', 'talentOs.oneTruth', 'talentOs.oneTruthBody'],
              ] as const
            ).map(([number, icon, title, body]) => (
              <article key={number}>
                <header>
                  <span>{number}</span>
                  <Icon name={icon} size={22} />
                </header>
                <h3>{t(title)}</h3>
                <p>{t(body)}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        className="experience-section experience-questions"
        aria-labelledby="questions-title"
      >
        <div className="experience-shell">
          <header className="experience-section-head experience-section-head-split">
            <div>
              <p className="experience-section-kicker">{t('experience.questionsEyebrow')}</p>
              <h2 id="questions-title">{t('experience.questionsTitle')}</h2>
            </div>
            <p>{t('experience.questionsLead')}</p>
          </header>

          <div className="experience-question-grid">
            {questions.map((question) => (
              <Link
                key={question.number}
                href={question.href}
                className={`experience-question-card${question.primary ? ' is-primary' : ''}`}
              >
                <div className="experience-card-topline">
                  <span>{question.number}</span>
                  <span className="experience-card-icon" aria-hidden="true">
                    <Icon name={question.icon} size={24} />
                  </span>
                </div>
                <h3>{question.title}</h3>
                <p>{question.body}</p>
                <span className="experience-text-link">
                  {question.cta} <Icon name="arrow" size={18} />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="experience-section experience-paths" aria-labelledby="paths-title">
        <div className="experience-shell">
          <header className="experience-section-head experience-section-head-centered">
            <p className="experience-section-kicker">{t('experience.pathsEyebrow')}</p>
            <h2 id="paths-title">{t('intent.chooseTitle')}</h2>
            <p>{t('experience.pathsLead')}</p>
          </header>

          <div className="experience-intent-switch">
            <IntentSwitch locale={locale} intent={intent} />
          </div>

          <div className="experience-path-grid">
            <article
              className={`experience-path-card work${intent === 'work' ? ' is-selected' : ''}`}
            >
              <div className="experience-path-visual" aria-hidden="true">
                <span className="experience-path-orbit" />
                <Icon name="work" size={38} />
              </div>
              <div className="experience-path-content">
                <span className="experience-path-label">{t('intent.workTagline')}</span>
                <h3>{t('intent.work')}</h3>
                <p>{t('intent.workSummary')}</p>
                <dl className="experience-path-facts">
                  <div>
                    <dt>{t('intent.routesFor')}</dt>
                    <dd>{workRoutes.length}</dd>
                  </div>
                  <div>
                    <dt>{t('site.statCountries')}</dt>
                    <dd>{distinctCountries(workRoutes)}</dd>
                  </div>
                  <div>
                    <dt>{t('site.statJobs')}</dt>
                    <dd>{jobs}</dd>
                  </div>
                </dl>
                <Link href={`/${seg}/work`} className="experience-btn experience-btn-dark">
                  <span>{t('intent.openWork')}</span>
                  <Icon name="arrow" size={19} />
                </Link>
              </div>
            </article>

            <article
              className={`experience-path-card study${intent === 'study' ? ' is-selected' : ''}`}
            >
              <div className="experience-path-visual" aria-hidden="true">
                <span className="experience-path-orbit" />
                <Icon name="study" size={38} />
              </div>
              <div className="experience-path-content">
                <span className="experience-path-label">{t('intent.studyTagline')}</span>
                <h3>{t('intent.study')}</h3>
                <p>{t('intent.studySummary')}</p>
                <dl className="experience-path-facts">
                  <div>
                    <dt>{t('intent.routesFor')}</dt>
                    <dd>{studyRoutes.length}</dd>
                  </div>
                  <div>
                    <dt>{t('site.statCountries')}</dt>
                    <dd>{distinctCountries(studyRoutes)}</dd>
                  </div>
                  <div>
                    <dt>{t('site.studyCourses')}</dt>
                    <dd>{courses}</dd>
                  </div>
                </dl>
                <Link href={`/${seg}/study`} className="experience-btn experience-btn-dark">
                  <span>{t('intent.openStudy')}</span>
                  <Icon name="arrow" size={19} />
                </Link>
              </div>
            </article>
          </div>

          <p className="experience-path-note">
            <Icon name="warning" size={19} />
            <span>{t('intent.notSure')}</span>
          </p>
        </div>
      </section>

      <section className="experience-section experience-journey" aria-labelledby="journey-title">
        <div className="experience-shell">
          <header className="experience-section-head experience-section-head-split">
            <div>
              <p className="experience-section-kicker">{t('experience.journeyEyebrow')}</p>
              <h2 id="journey-title">{t('experience.journeyTitle')}</h2>
            </div>
            <p>{t('experience.journeyLead')}</p>
          </header>

          <ol className="experience-journey-rail">
            {journeySteps.map((step, index) => (
              <li key={step.title}>
                <div className="experience-journey-marker">
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <Icon name={step.icon} size={24} />
                </div>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="experience-proof" aria-labelledby="proof-title">
        <div className="experience-shell">
          <div className="experience-proof-layout">
            <div className="experience-proof-intro">
              <p className="experience-section-kicker">{t('experience.proofEyebrow')}</p>
              <h2 id="proof-title">{t('experience.proofTitle')}</h2>
              <p>{t('experience.proofLead')}</p>
              <Link href={`/${seg}/how-it-works`} className="experience-btn experience-btn-light">
                <span>{t('site.howItWorksTitle')}</span>
                <Icon name="arrow" size={19} />
              </Link>
            </div>

            <div className="experience-proof-data" aria-label={t('site.statsTitle')}>
              <div className="experience-proof-number">
                <strong>{sources}</strong>
                <span>{t('site.statSources')}</span>
              </div>
              <div className="experience-proof-number">
                <strong>{routes}</strong>
                <span>{t('site.statRoutes')}</span>
              </div>
              <div className="experience-proof-number">
                <strong>{countries}</strong>
                <span>{t('site.statCountries')}</span>
              </div>
              <p className="experience-proof-disclosure">
                <Icon name="warning" size={19} />
                <span>{t('experience.proofDisclosure')}</span>
              </p>
            </div>
          </div>

          <div className="experience-trust-grid">
            {trustRules.map((rule, index) => (
              <div key={rule}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <p>{rule}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="experience-section experience-guides" aria-labelledby="guides-title">
        <div className="experience-shell">
          <header className="experience-section-head experience-section-head-split">
            <div>
              <p className="experience-section-kicker">{t('experience.guidesEyebrow')}</p>
              <h2 id="guides-title">{t('site.guidesTitle')}</h2>
            </div>
            <p>{t('site.guidesLead')}</p>
          </header>

          <div className="experience-guide-grid">
            <Link href={`/${seg}/countries`} className="experience-guide-card countries">
              <span className="experience-guide-icon" aria-hidden="true">
                <Icon name="globe" size={30} />
              </span>
              <div>
                <span className="experience-guide-count">{countries}</span>
                <h3>{t('site.guideCountries')}</h3>
                <p>{t('site.guideCountriesBody')}</p>
                <span className="experience-text-link">
                  {t('guide.readMore')} <Icon name="arrow" size={18} />
                </span>
              </div>
            </Link>

            <Link href={`/${seg}/occupations`} className="experience-guide-card occupations">
              <span className="experience-guide-icon" aria-hidden="true">
                <Icon name="work" size={30} />
              </span>
              <div>
                <h3>{t('site.guideOccupations')}</h3>
                <p>{t('site.guideOccupationsBody')}</p>
                <span className="experience-text-link">
                  {t('guide.readMore')} <Icon name="arrow" size={18} />
                </span>
              </div>
            </Link>

            <Link href={`/${seg}/safety`} className="experience-guide-card safety">
              <span className="experience-guide-icon" aria-hidden="true">
                <Icon name="warning" size={30} />
              </span>
              <div>
                <h3>{t('site.guideSafety')}</h3>
                <p>{t('site.guideSafetyBody')}</p>
                <span className="experience-text-link">
                  {t('guide.readMore')} <Icon name="arrow" size={18} />
                </span>
              </div>
            </Link>

            <article className="experience-guide-card family">
              <span className="experience-guide-icon" aria-hidden="true">
                <Icon name="family" size={30} />
              </span>
              <div>
                <h3>{t('experience.familyTitle')}</h3>
                <p>{t('experience.familyBody')}</p>
                <Link href={`/${seg}/cases`} className="experience-text-link">
                  {t('experience.familyCta')} <Icon name="arrow" size={18} />
                </Link>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section
        className="experience-section experience-organizations"
        aria-labelledby="organizations-title"
      >
        <div className="experience-shell">
          <header className="experience-section-head experience-section-head-split">
            <div>
              <p className="experience-section-kicker">{t('experience.organizationsEyebrow')}</p>
              <h2 id="organizations-title">{t('site.orgTitle')}</h2>
            </div>
            <p>{t('site.orgLead')}</p>
          </header>

          <div className="experience-organization-list">
            {organizations.map((organization) => (
              <Link key={organization.number} href={organization.href}>
                <span>{organization.number}</span>
                <div>
                  <h3>{organization.title}</h3>
                  <p>{organization.body}</p>
                </div>
                <Icon name="arrow" size={22} />
              </Link>
            ))}
          </div>
          <p className="experience-organization-note">{t('site.orgStatus')}</p>
        </div>
      </section>

      <section className="experience-section experience-faq" aria-labelledby="faq-title">
        <div className="experience-shell experience-faq-layout">
          <header className="experience-section-head">
            <p className="experience-section-kicker">{t('experience.faqEyebrow')}</p>
            <h2 id="faq-title">{t('site.faqTitle')}</h2>
            <p>{t('experience.faqLead')}</p>
            <Link href={`/${seg}/faq`} className="experience-text-link experience-faq-more">
              {t('site.faqPageTitle')} <Icon name="arrow" size={18} />
            </Link>
          </header>
          <div className="experience-faq-list">
            {faqs.map((faq, index) => (
              <Disclosure
                key={faq.question}
                summary={`${String(index + 1).padStart(2, '0')}  ${faq.question}`}
              >
                <p>{faq.answer}</p>
              </Disclosure>
            ))}
          </div>
        </div>
      </section>

      <section className="experience-final" aria-labelledby="final-title">
        <div className="experience-shell">
          <div className="experience-final-card">
            <div>
              <p className="experience-section-kicker">{t('experience.finalEyebrow')}</p>
              <h2 id="final-title">{t('site.ctaTitle')}</h2>
              <p>{t('site.ctaLead')}</p>
            </div>
            <div className="experience-final-actions">
              <Link href={`/${seg}/verify`} className="experience-btn experience-btn-dark">
                <span>{t('scanner.checkNow')}</span>
                <Icon name="arrow" size={20} />
              </Link>
              <Link href={`/${seg}/help`} className="experience-btn experience-btn-outline-dark">
                <Icon name="phone" size={20} />
                <span>{t('common.help')}</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="experience-status-footer" aria-label={t('experience.statusLabel')}>
        <div className="experience-status-strip" role="note">
          <div>
            <span className="experience-status-pulse" aria-hidden="true" />
            <strong>{t('experience.statusLabel')}</strong>
          </div>
          <p>{t('experience.statusBody')}</p>
          <Link href={`/${seg}/about`}>
            {t('experience.statusCta')} <Icon name="arrow" size={17} />
          </Link>
        </div>
      </section>
    </div>
  );
}
