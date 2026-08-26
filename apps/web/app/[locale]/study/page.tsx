import Link from 'next/link';
import type { Metadata } from 'next';
import { Badge, ButtonLink, Card, Grid, Icon, Section, Stat, StatGroup } from '@probash/web-ui';
import type { CountrySummaryDto, RouteSummaryDto } from '@probash/contracts';
import { apiRequest } from '@/lib/api';
import { money } from '@/lib/format';
import { localeSegment, parseLocaleParam, pick, translator } from '@/lib/i18n';
import { canonicalMetadata } from '@/lib/seo';
import { ScholarshipCard } from '@/components/ScholarshipCard';
import { SCHOLARSHIPS } from '@/lib/scholarships';
import { WorkspacePageShell } from '@/components/WorkspacePageShell';

export const dynamic = 'force-dynamic';

interface InstitutionDto {
  id: string;
  legalName: { bn: string; en: string };
  countryCode: string;
  institutionType: string;
  officialDomain: string;
  recognizedStatus: string;
  isSyntheticDemoData: boolean;
}

interface CourseDto {
  id: string;
  institutionId: string;
  title: { bn: string; en: string };
  degreeLevel: string;
  durationMonths: number;
  tuition: { minorUnits: string; currency: string };
  intakes: string[];
  languageRequirement?: { bn: string; en: string };
}

/**
 * §12.4 — the exams a student may need. Real exam names, listed for orientation with
 * an explicit caveat: which one applies is decided by the institution and the route,
 * and we do not yet hold that mapping as verified data.
 */
const EXAMS = [
  { name: 'IELTS Academic / UKVI', for: 'GB, CA, AU, NZ, IE' },
  { name: 'TOEFL iBT', for: 'US, CA' },
  { name: 'PTE Academic', for: 'AU, NZ, GB' },
  { name: 'Duolingo English Test', for: 'where the institution accepts it' },
  { name: 'TestDaF / Goethe / telc', for: 'DE, AT' },
  { name: 'JLPT / JFT-Basic', for: 'JP' },
  { name: 'TOPIK', for: 'KR' },
  { name: 'GRE / GMAT', for: 'graduate programmes' },
] as const;

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
    path: '/study',
    title: t('intent.study'),
    description: t('intent.studyHubLead'),
  });
}

export default async function StudyHub({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ workspace?: string }>;
}) {
  const { locale: segment } = await params;
  const { workspace: workspaceMode } = await searchParams;
  const locale = parseLocaleParam(segment);
  const seg = localeSegment(locale);
  const t = translator(locale);

  const [institutions, courses, routes, countries] = await Promise.all([
    apiRequest<InstitutionDto[]>('/api/v1/institutions', { locale }),
    apiRequest<CourseDto[]>('/api/v1/courses', { locale }),
    apiRequest<RouteSummaryDto[]>('/api/v1/routes?purpose=study', { locale }),
    apiRequest<CountrySummaryDto[]>('/api/v1/countries', { locale }),
  ]);

  const countryName = (code: string) =>
    pick(countries.find((c) => c.code === code)?.name, locale) || code;
  const institutionName = (id: string) =>
    pick(institutions.find((i) => i.id === id)?.legalName, locale) || id;
  const studyCountries = [...new Set(institutions.map((i) => i.countryCode))];

  const steps = [
    { icon: 'study' as const, title: t('site.how1Title'), body: t('site.how1Body') },
    { icon: 'money' as const, title: t('site.how2Title'), body: t('site.how2Body') },
    { icon: 'document' as const, title: t('site.how3Title'), body: t('site.how3Body') },
    { icon: 'shield' as const, title: t('site.how4Title'), body: t('site.how4Body') },
  ];

  return (
    <WorkspacePageShell active="study" enabled={workspaceMode === '1'} locale={locale}>
      <>
        <Section
          headingLevel={1}
          surface="warm"
          eyebrow={t('intent.studyTagline')}
          title={t('intent.study')}
          lead={t('intent.studyHubLead')}
        >
          <div className="hub-actions">
            <ButtonLink href={`/${seg}/passport`} size="lg" icon={<Icon name="route" size={20} />}>
              {t('passport.startPassport')}
            </ButtonLink>
            <ButtonLink href={`/${seg}/countries`} size="lg" icon={<Icon name="globe" size={20} />}>
              {t('guide.browseCountries')}
            </ButtonLink>
            <ButtonLink
              href={`/${seg}/scholarships`}
              size="lg"
              variant="secondary"
              icon={<Icon name="money" size={20} />}
            >
              {t('scholarships.heroCta')}
            </ButtonLink>
            <ButtonLink href={`/${seg}/verify`} size="lg" variant="outline">
              {t('home.verifyOffer')}
            </ButtonLink>
            <ButtonLink href={`/${seg}?intent=work`} size="lg" variant="ghost">
              {t('intent.openWork')}
            </ButtonLink>
          </div>
          <StatGroup>
            <Stat label={t('intent.routesFor')} value={String(routes.length)} />
            <Stat label={t('site.statCountries')} value={String(studyCountries.length)} />
            <Stat label={t('site.studyInstitutions')} value={String(institutions.length)} />
            <Stat label={t('site.studyCourses')} value={String(courses.length)} />
          </StatGroup>
          <p style={{ marginBlockStart: 'var(--space-lg)' }}>
            <Badge tone="warning">{t('site.studyStatus')}</Badge>
          </p>
        </Section>

        <Section surface="default" title={t('intent.stepsStudy')}>
          <Grid min={280}>
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

        <section
          className="study-scholarship-section"
          id="study-scholarships"
          aria-labelledby="study-scholarships-title"
        >
          <header>
            <div>
              <p className="scholarship-kicker">{t('scholarships.studySectionEyebrow')}</p>
              <h2 id="study-scholarships-title">{t('scholarships.studySectionTitle')}</h2>
            </div>
            <div>
              <p>{t('scholarships.studySectionLead')}</p>
              <ButtonLink href={`/${seg}/scholarships`} icon={<Icon name="arrow" size={18} />}>
                {t('scholarships.heroCta')}
              </ButtonLink>
            </div>
          </header>
          <div className="scholarship-grid">
            {SCHOLARSHIPS.slice(0, 3).map((scholarship) => (
              <ScholarshipCard
                key={scholarship.id}
                locale={locale}
                scholarship={scholarship}
                compact
              />
            ))}
          </div>
        </section>

        <Section surface="muted" title={t('intent.routesFor')} lead={t('guide.sourceNote')}>
          {routes.length === 0 ? <p>{t('guide.noRoutes')}</p> : null}
          <Grid min={320}>
            {routes.map((route) => (
              <Link key={route.id} href={`/${seg}/routes/${route.id}`} className="guide-link">
                <Card interactive>
                  <Badge tone="neutral">{countryName(route.destinationCountry)}</Badge>
                  <h3 className="card-title">{pick(route.officialName, locale)}</h3>
                  <p>{pick(route.summary, locale)}</p>
                  <span className="link-more">
                    {t('guide.readMore')} <Icon name="arrow" size={18} />
                  </span>
                </Card>
              </Link>
            ))}
          </Grid>
        </Section>

        <Section
          surface="default"
          title={t('intent.coursesAvailable')}
          headingId="study-programmes"
        >
          <Grid min={300}>
            {courses.map((course) => (
              <Link key={course.id} href={`/${seg}/programs/${course.id}`} className="guide-link">
                <Card interactive>
                  <h3 className="card-title">{pick(course.title, locale)}</h3>
                  <p className="muted">{institutionName(course.institutionId)}</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge tone="neutral">{course.degreeLevel}</Badge>
                    <Badge tone="neutral">{course.durationMonths}</Badge>
                  </div>
                  <p className="amount" style={{ fontSize: 'var(--font-size-title)' }}>
                    {money(course.tuition, locale)}
                  </p>
                  {course.languageRequirement ? (
                    <p className="muted">{pick(course.languageRequirement, locale)}</p>
                  ) : null}
                  <Badge tone="danger">{t('common.demoDataWarning')}</Badge>
                </Card>
              </Link>
            ))}
          </Grid>
        </Section>

        <Section surface="muted" title={t('intent.testsNeeded')} lead={t('intent.testsNote')}>
          <Grid min={240}>
            {EXAMS.map((exam) => (
              <Card key={exam.name} tone="default">
                <h3 className="card-title">{exam.name}</h3>
                <p className="muted">{exam.for}</p>
              </Card>
            ))}
          </Grid>
        </Section>

        <Section
          surface="accent"
          title={t('guide.safetyTitle')}
          lead={t('intent.compareRiskStudy')}
        >
          <div className="hub-actions">
            <ButtonLink href={`/${seg}/safety`} size="lg" icon={<Icon name="warning" size={20} />}>
              {t('guide.learnSafety')}
            </ButtonLink>
            <ButtonLink href={`/${seg}/verify`} size="lg" variant="secondary">
              {t('scanner.checkNow')}
            </ButtonLink>
          </div>
          <p style={{ marginBlockStart: 'var(--space-lg)' }}>
            <Badge tone="warning">{t('cost.payOnlyHere')}</Badge>
          </p>
        </Section>
      </>
    </WorkspacePageShell>
  );
}
