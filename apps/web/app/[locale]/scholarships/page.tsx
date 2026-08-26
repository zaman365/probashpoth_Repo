import Link from 'next/link';
import type { Metadata } from 'next';
import { Badge, ButtonLink, Icon } from '@probash/web-ui';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { ScholarshipCard } from '@/components/ScholarshipCard';
import { ScholarshipReadinessChecklist } from '@/components/ScholarshipReadinessChecklist';
import { getProfile } from '@/db/operations';
import { localeSegment, parseLocaleParam, translator } from '@/lib/i18n';
import {
  evaluateScholarship,
  SCHOLARSHIPS,
  scholarshipCountries,
  scholarshipText,
  type ScholarshipDegree,
} from '@/lib/scholarships';
import { canonicalMetadata } from '@/lib/seo';
import { WorkspacePageShell } from '@/components/WorkspacePageShell';

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
    path: '/scholarships',
    title: t('scholarships.title'),
    description: t('scholarships.lead'),
  });
}

export default async function ScholarshipsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    country?: string;
    level?: string;
    funding?: string;
    workspace?: string;
  }>;
}) {
  const { locale: segment } = await params;
  const filters = await searchParams;
  const locale = parseLocaleParam(segment);
  const seg = localeSegment(locale);
  const t = translator(locale);
  const user = await getChatGPTUser();
  const profile = user ? await getProfile(user.userId) : null;
  const country = scholarshipCountries().includes(filters.country ?? '') ? filters.country : '';
  const levels: ScholarshipDegree[] = ['bachelor', 'master', 'phd', 'research'];
  const level = levels.includes(filters.level as ScholarshipDegree)
    ? (filters.level as ScholarshipDegree)
    : '';
  const funding = ['full', 'partial', 'varies'].includes(filters.funding ?? '')
    ? filters.funding
    : '';
  const results = SCHOLARSHIPS.filter(
    (scholarship) =>
      (!country || scholarship.destinations.includes(country)) &&
      (!level || scholarship.degrees.includes(level)) &&
      (!funding || scholarship.fundingType === funding),
  );
  const matches = results.map((scholarship) => ({
    scholarship,
    match: evaluateScholarship(scholarship, profile?.passport),
  }));
  const bestMatch = [...matches].sort((a, b) => b.match.score - a.match.score)[0];
  const sourceCount = new Set(SCHOLARSHIPS.map((scholarship) => scholarship.sourceName)).size;
  const checklistItems = Array.from({ length: 6 }, (_, index) =>
    t(`scholarships.check${index + 1}`),
  );

  return (
    <WorkspacePageShell active="scholarships" enabled={filters.workspace === '1'} locale={locale}>
      <div className="scholarship-page wide-page">
        <section className="scholarship-hero" aria-labelledby="scholarship-title">
          <div>
            <p className="scholarship-kicker">{t('scholarships.eyebrow')}</p>
            <h1 id="scholarship-title">{t('scholarships.title')}</h1>
            <p>{t('scholarships.lead')}</p>
            <div className="hub-actions">
              <ButtonLink href="#scholarship-results" icon={<Icon name="search" size={19} />}>
                {t('scholarships.heroCta')}
              </ButtonLink>
              <ButtonLink href={`/${seg}/passport`} variant="outline">
                {t('scholarships.updatePassport')}
              </ButtonLink>
            </div>
          </div>
          <dl className="scholarship-hero-stats">
            <div>
              <dt>{t('scholarships.resultCount', { count: SCHOLARSHIPS.length })}</dt>
              <dd>{SCHOLARSHIPS.length}</dd>
            </div>
            <div>
              <dt>{t('site.statCountries')}</dt>
              <dd>{scholarshipCountries().length}</dd>
            </div>
            <div>
              <dt>{t('verification.officialSource')}</dt>
              <dd>{sourceCount}</dd>
            </div>
          </dl>
        </section>

        <ScholarshipReadinessChecklist
          items={checklistItems}
          labels={{
            title: t('scholarships.checklistTitle'),
            lead: t('scholarships.checklistLead'),
            progress: t('scholarships.checklistProgress'),
            passport: t('scholarships.updatePassport'),
          }}
          passportHref={`/${seg}/passport`}
        />

        <section className="scholarship-profile-panel" aria-labelledby="scholarship-profile-title">
          <div>
            <p className="scholarship-kicker">{t('journey.pathWorkspace')}</p>
            <h2 id="scholarship-profile-title">{t('scholarships.profileTitle')}</h2>
            <p>{profile ? t('scholarships.profileLead') : t('scholarships.noProfile')}</p>
          </div>
          {profile && bestMatch ? (
            <Link href={`/${seg}/scholarships/${bestMatch.scholarship.id}`}>
              <span>{t(`scholarships.match.${bestMatch.match.state}`)}</span>
              <strong>{bestMatch.match.score}%</strong>
              <small>{scholarshipText(bestMatch.scholarship.name, locale)}</small>
              <b>{t('common.continue')} →</b>
            </Link>
          ) : (
            <ButtonLink href={`/${seg}/passport`} icon={<Icon name="route" size={18} />}>
              {t('passport.startPassport')}
            </ButtonLink>
          )}
        </section>

        <section className="scholarship-catalogue" id="scholarship-results">
          <header>
            <div>
              <p className="scholarship-kicker">{t('scholarships.eyebrow')}</p>
              <h2>{t('scholarships.browseTitle')}</h2>
            </div>
            <p>{t('scholarships.browseLead')}</p>
          </header>

          <form className="scholarship-filters" method="get">
            <label>
              <span>{t('scholarships.countryFilter')}</span>
              <select name="country" defaultValue={country}>
                <option value="">{t('scholarships.allCountries')}</option>
                {scholarshipCountries().map((code) => {
                  const sample = SCHOLARSHIPS.find((item) => item.destinations.includes(code));
                  return (
                    <option key={code} value={code}>
                      {sample ? scholarshipText(sample.destinationLabel, locale) : code}
                    </option>
                  );
                })}
              </select>
            </label>
            <label>
              <span>{t('scholarships.levelFilter')}</span>
              <select name="level" defaultValue={level}>
                <option value="">{t('scholarships.allLevels')}</option>
                {levels.map((item) => (
                  <option key={item} value={item}>
                    {item.toUpperCase()}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{t('scholarships.fundingFilter')}</span>
              <select name="funding" defaultValue={funding}>
                <option value="">{t('scholarships.allFunding')}</option>
                {(['full', 'partial', 'varies'] as const).map((item) => (
                  <option key={item} value={item}>
                    {t(`scholarships.${item}`)}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="btn btn-primary">
              <Icon name="search" size={18} /> {t('scholarships.applyFilters')}
            </button>
            {country || level || funding ? (
              <Link href={`/${seg}/scholarships`}>{t('scholarships.resetFilters')}</Link>
            ) : null}
          </form>

          <div className="scholarship-results-heading">
            <strong>{t('scholarships.resultCount', { count: results.length })}</strong>
            <Badge tone="warning">{t('scholarships.sourceNotice')}</Badge>
          </div>
          {results.length === 0 ? (
            <p className="scholarship-empty">{t('scholarships.noResults')}</p>
          ) : null}
          <div className="scholarship-grid">
            {matches.map(({ scholarship, match }) => (
              <ScholarshipCard
                key={scholarship.id}
                locale={locale}
                scholarship={scholarship}
                match={profile ? match : undefined}
              />
            ))}
          </div>
        </section>

        <section className="scholarship-source-network">
          <header>
            <span className="scholarship-step-mark">
              <Icon name="shield" size={20} />
            </span>
            <div>
              <h2>{t('scholarships.sourceNetworkTitle')}</h2>
              <p>{t('scholarships.sourceNetworkLead')}</p>
            </div>
          </header>
          <div>
            {SCHOLARSHIPS.map((scholarship) => (
              <a
                key={scholarship.id}
                href={scholarship.officialUrl}
                target="_blank"
                rel="noreferrer"
              >
                <span>{scholarship.sourceName}</span>
                <small>{t('scholarships.lastVerified', { date: scholarship.lastVerified })}</small>
                <Icon name="arrow" size={17} />
              </a>
            ))}
          </div>
        </section>
      </div>
    </WorkspacePageShell>
  );
}
