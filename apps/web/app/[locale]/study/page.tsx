import Link from 'next/link';
import type { Metadata } from 'next';
import { Badge, ButtonLink, Card, Grid, Icon, Section } from '@probash/web-ui';
import type { CountrySummaryDto, RouteSummaryDto } from '@probash/contracts';
import { apiRequest } from '@/lib/api';
import { money } from '@/lib/format';
import { localeSegment, parseLocaleParam, pick, translator } from '@/lib/i18n';
import { canonicalMetadata } from '@/lib/seo';

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
    title: t('site.studyTitle'),
    description: t('site.studyLead'),
  });
}

/**
 * §12 — the study surface. The engine itself is a later epic, so this page shows what
 * genuinely exists (verified institutions, courses, study routes) and labels the rest.
 */
export default async function StudyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: segment } = await params;
  const locale = parseLocaleParam(segment);
  const seg = localeSegment(locale);
  const t = translator(locale);

  const [institutions, courses, routes, countries] = await Promise.all([
    apiRequest<InstitutionDto[]>('/api/v1/institutions', { locale }),
    apiRequest<CourseDto[]>('/api/v1/courses', { locale }),
    apiRequest<RouteSummaryDto[]>('/api/v1/routes?purpose=study', { locale }),
    apiRequest<CountrySummaryDto[]>('/api/v1/countries', { locale }),
  ]);

  const countryName = (code: string) => {
    const match = countries.find((c) => c.code === code);
    return match ? pick(match.name, locale) : code;
  };

  return (
    <>
      <Section
        headingLevel={1}
        surface="warm"
        eyebrow={t('site.tagline')}
        title={t('site.studyTitle')}
        lead={t('site.studyLead')}
      >
        <Badge tone="warning">{t('site.studyStatus')}</Badge>
      </Section>

      <Section surface="default" title={t('route.title')}>
        {routes.length === 0 ? <p>{t('guide.noRoutes')}</p> : null}
        <Grid min={300}>
          {routes.map((route) => (
            <Link key={route.id} href={`/${seg}/routes/${route.id}`} className="guide-link">
              <Card interactive>
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

      <Section surface="muted" title={t('site.studyInstitutions')}>
        <Grid min={280}>
          {institutions.map((institution) => (
            <Card key={institution.id}>
              <h3 className="card-title">{pick(institution.legalName, locale)}</h3>
              <p className="muted">{countryName(institution.countryCode)}</p>
              <p className="muted">{institution.officialDomain}</p>
              <Badge tone="danger">{t('common.demoDataWarning')}</Badge>
            </Card>
          ))}
        </Grid>
      </Section>

      <Section surface="default" title={t('site.studyCourses')}>
        <Grid min={280}>
          {courses.map((course) => (
            <Card key={course.id}>
              <h3 className="card-title">{pick(course.title, locale)}</h3>
              <p className="muted">{course.degreeLevel}</p>
              <p>
                <strong>{money(course.tuition, locale)}</strong>
              </p>
              {course.languageRequirement ? (
                <p className="muted">{pick(course.languageRequirement, locale)}</p>
              ) : null}
            </Card>
          ))}
        </Grid>
      </Section>

      <Section surface="accent" width="prose">
        <div className="cta-block">
          <h2 className="pui-section-title">{t('site.ctaTitle')}</h2>
          <p className="pui-lead">{t('scanner.help')}</p>
          <ButtonLink href={`/${seg}/verify`} size="lg">
            {t('scanner.checkNow')}
          </ButtonLink>
        </div>
      </Section>
    </>
  );
}
