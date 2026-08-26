import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Badge, ButtonLink, Card, Grid, Icon, Section } from '@probash/web-ui';
import type { SourceSummaryDto } from '@probash/contracts';
import { apiRequest } from '@/lib/api';
import { money } from '@/lib/format';
import { localeSegment, parseLocaleParam, pick, translator } from '@/lib/i18n';
import { canonicalMetadata } from '@/lib/seo';

export const dynamic = 'force-dynamic';

interface CourseDto {
  id: string;
  institutionId: string;
  title: { bn: string; en: string };
  degreeLevel: string;
  subjectIscedF: string;
  durationMonths: number;
  tuition: { minorUnits: string; currency: string };
  applicationFee?: { minorUnits: string; currency: string };
  languageRequirement?: { bn: string; en: string };
  intakes: string[];
  sourceIds: string[];
  isSyntheticDemoData: boolean;
}

interface InstitutionDto {
  id: string;
  legalName: { bn: string; en: string };
  countryCode: string;
  officialDomain: string;
  recognizedStatus: string;
  lastVerifiedAt?: string;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale: segment, id } = await params;
  const locale = parseLocaleParam(segment);
  const courses = await apiRequest<CourseDto[]>('/api/v1/courses', { locale });
  const course = courses.find((item) => item.id === id);
  const t = translator(locale);
  return canonicalMetadata({
    locale,
    path: `/programs/${id}`,
    title: course ? pick(course.title, locale) : t('os.programmeEyebrow'),
    description: t('os.programmeDataLimit'),
  });
}

export default async function ProgramPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: segment, id } = await params;
  const locale = parseLocaleParam(segment);
  const seg = localeSegment(locale);
  const t = translator(locale);
  const [courses, institutions, allSources] = await Promise.all([
    apiRequest<CourseDto[]>('/api/v1/courses', { locale }),
    apiRequest<InstitutionDto[]>('/api/v1/institutions', { locale }),
    apiRequest<SourceSummaryDto[]>('/api/v1/sources', { locale }),
  ]);
  const course = courses.find((item) => item.id === id);
  if (!course) notFound();
  const institution = institutions.find((item) => item.id === course.institutionId);
  if (!institution) notFound();
  const sources = allSources.filter((source) => course.sourceIds.includes(source.id));
  const unknowns = [1, 2, 3, 4, 5].map((number) => t(`os.unknownRule${number}`));

  return (
    <>
      <Section
        surface="warm"
        headingLevel={1}
        eyebrow={t('os.programmeEyebrow')}
        title={pick(course.title, locale)}
        lead={pick(institution.legalName, locale)}
      >
        <div className="programme-badges">
          <Badge tone="neutral">{course.degreeLevel}</Badge>
          <Badge tone="neutral">ISCED-F {course.subjectIscedF}</Badge>
          <Badge tone="info">{institution.countryCode}</Badge>
          <Badge tone="danger">{t('common.demoDataWarning')}</Badge>
        </div>
        <p className="programme-limit">
          <Icon name="warning" size={20} />
          {t('os.programmeDataLimit')}
        </p>
      </Section>
      <Section surface="default" title={t('os.knownFacts')}>
        <Grid min={250}>
          <Card>
            <p className="muted">{t('os.duration')}</p>
            <h2 className="card-title">{course.durationMonths} months</h2>
          </Card>
          <Card>
            <p className="muted">Tuition record</p>
            <h2 className="card-title">{money(course.tuition, locale)}</h2>
          </Card>
          <Card>
            <p className="muted">{t('os.intakes')}</p>
            <h2 className="card-title">{course.intakes.join(' · ')}</h2>
          </Card>
          <Card>
            <p className="muted">Language summary</p>
            <h2 className="card-title">
              {pick(course.languageRequirement, locale) || t('vault.notConfirmed')}
            </h2>
          </Card>
        </Grid>
      </Section>
      <Section surface="muted" title={t('os.unknownRules')}>
        <Grid min={300}>
          {unknowns.map((item) => (
            <Card key={item}>
              <Badge tone="warning">?</Badge>
              <h3 className="card-title">{item}</h3>
              <p>{t('passport.officialReview')}</p>
            </Card>
          ))}
        </Grid>
      </Section>
      <Section surface="default" title={t('guide.sourceNote')}>
        <div className="source-stack">
          {sources.map((source) => (
            <a
              key={source.id}
              href={source.url}
              target="_blank"
              rel="noreferrer"
              className="source-link"
            >
              <span>
                <strong>{pick(source.authority, locale)}</strong>
                <small>{pick(source.title, locale)}</small>
              </span>
              <Icon name="arrow" size={18} />
            </a>
          ))}
        </div>
        <div className="hub-actions">
          <ButtonLink href={`/${seg}/passport`}>{t('passport.startPassport')}</ButtonLink>
          <ButtonLink href={`/${seg}/dashboard`} variant="outline">
            {t('os.openDashboard')}
          </ButtonLink>
        </div>
      </Section>
    </>
  );
}
