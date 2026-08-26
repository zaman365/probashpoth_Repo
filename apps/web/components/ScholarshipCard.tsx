import Link from 'next/link';
import { Icon } from '@probash/web-ui';
import type { Locale } from '@probash/domain';
import { localeSegment, translator } from '@/lib/i18n';
import {
  evaluateScholarship,
  scholarshipText,
  type ScholarshipMatch,
  type ScholarshipRecord,
} from '@/lib/scholarships';

export function ScholarshipCard({
  locale,
  scholarship,
  match,
  compact = false,
}: {
  locale: Locale;
  scholarship: ScholarshipRecord;
  match?: ScholarshipMatch;
  compact?: boolean;
}) {
  const t = translator(locale);
  const seg = localeSegment(locale);
  const resolvedMatch = match ?? evaluateScholarship(scholarship);

  return (
    <Link
      href={`/${seg}/scholarships/${scholarship.id}`}
      className={`scholarship-card${compact ? ' compact' : ''}`}
    >
      <header>
        <span className="scholarship-country">
          {scholarshipText(scholarship.destinationLabel, locale)}
        </span>
        <span className={`scholarship-cycle ${scholarship.cycle}`}>
          {t(`scholarships.cycle.${scholarship.cycle}`)}
        </span>
      </header>
      <div className="scholarship-card-copy">
        <small>{scholarshipText(scholarship.provider, locale)}</small>
        <h3>{scholarshipText(scholarship.name, locale)}</h3>
        <p>{scholarshipText(scholarship.summary, locale)}</p>
      </div>
      <dl>
        <div>
          <dt>{t('scholarships.degree')}</dt>
          <dd>{scholarship.degrees.map((degree) => degree.toUpperCase()).join(' · ')}</dd>
        </div>
        <div>
          <dt>{t('scholarships.fundingFilter')}</dt>
          <dd>{t(`scholarships.${scholarship.fundingType}`)}</dd>
        </div>
      </dl>
      {match ? (
        <div className={`scholarship-match-strip ${resolvedMatch.state}`}>
          <span>
            <Icon name={resolvedMatch.missing.length > 0 ? 'warning' : 'check'} size={17} />
            {t(`scholarships.match.${resolvedMatch.state}`)}
          </span>
          <strong>
            {resolvedMatch.score}% {t('scholarships.score')}
          </strong>
        </div>
      ) : null}
      <footer>
        <span>{scholarshipText(scholarship.applicationWindow, locale)}</span>
        <Icon name="arrow" size={19} />
      </footer>
    </Link>
  );
}
