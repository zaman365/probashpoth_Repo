import Link from 'next/link';
import type { Locale } from '@probash/domain';
import { Badge, ButtonLink, Card, Grid, Icon } from '@probash/web-ui';
import { localeSegment, translator } from '@/lib/i18n';

export type Intent = 'work' | 'study';

export function parseIntent(value: string | undefined): Intent {
  return value === 'study' ? 'study' : 'work';
}

export interface IntentFacts {
  routes: number;
  countries: number;
  /** Verified jobs for work; courses for study. */
  opportunities: number;
}

/**
 * §14.1 — work and study are the two top-level decisions, and a person has to be able
 * to weigh them *before* picking one. Both cards are always shown; the selection only
 * decides which path's detail is expanded below.
 *
 * The choice lives in the URL (`?intent=study`) rather than in component state, so it
 * is linkable, survives a reload, works with no JavaScript, and can be indexed.
 */
export function IntentChooser({
  locale,
  intent,
  workFacts,
  studyFacts,
}: {
  locale: Locale;
  intent: Intent;
  workFacts: IntentFacts;
  studyFacts: IntentFacts;
}) {
  const t = translator(locale);
  const seg = localeSegment(locale);

  const paths = [
    {
      key: 'work' as const,
      icon: 'work' as const,
      title: t('intent.work'),
      tagline: t('intent.workTagline'),
      summary: t('intent.workSummary'),
      href: `/${seg}/work`,
      cta: t('intent.openWork'),
      facts: workFacts,
      opportunityLabel: t('job.verifiedJob'),
    },
    {
      key: 'study' as const,
      icon: 'study' as const,
      title: t('intent.study'),
      tagline: t('intent.studyTagline'),
      summary: t('intent.studySummary'),
      href: `/${seg}/study`,
      cta: t('intent.openStudy'),
      facts: studyFacts,
      opportunityLabel: t('site.studyCourses'),
    },
  ];

  return (
    <div className="intent-block">
      {/* A segmented control built from links: no state, no script, still shareable. */}
      <div className="intent-switch" role="group" aria-label={t('intent.chooseTitle')}>
        {paths.map((path) => (
          <Link
            key={path.key}
            href={`/${seg}?intent=${path.key}`}
            className={`intent-switch-option${intent === path.key ? ' is-selected' : ''}`}
            aria-current={intent === path.key ? 'true' : undefined}
            scroll={false}
          >
            <Icon name={path.icon} size={20} />
            <span>{path.title}</span>
          </Link>
        ))}
      </div>

      <Grid min={340}>
        {paths.map((path) => (
          <Card
            key={path.key}
            tone={intent === path.key ? 'accent' : 'default'}
            className="intent-card"
          >
            <span className="intent-card-icon" aria-hidden="true">
              <Icon name={path.icon} size={24} />
            </span>
            <h3 className="intent-card-title">{path.title}</h3>
            <Badge tone="neutral">{path.tagline}</Badge>
            <p>{path.summary}</p>

            <dl className="intent-facts">
              <div>
                <dt>{t('intent.routesFor')}</dt>
                <dd>{path.facts.routes}</dd>
              </div>
              <div>
                <dt>{t('site.statCountries')}</dt>
                <dd>{path.facts.countries}</dd>
              </div>
              <div>
                <dt>{path.opportunityLabel}</dt>
                <dd>{path.facts.opportunities}</dd>
              </div>
            </dl>

            <ButtonLink
              href={path.href}
              variant={intent === path.key ? 'primary' : 'secondary'}
              icon={<Icon name="arrow" size={18} />}
            >
              {path.cta}
            </ButtonLink>
          </Card>
        ))}
      </Grid>

      <p className="muted">{t('intent.notSure')}</p>
    </div>
  );
}

/**
 * The side-by-side comparison. A real table on a wide screen; on a phone each row
 * becomes its own block, because a scrolling table is unreadable at 360px.
 */
export function IntentComparison({ locale }: { locale: Locale }) {
  const t = translator(locale);

  const rows = [
    { key: 'Who', label: t('intent.compareWho') },
    { key: 'Need', label: t('intent.compareNeed') },
    { key: 'Money', label: t('intent.compareMoney') },
    { key: 'Time', label: t('intent.compareTime') },
    { key: 'Risk', label: t('intent.compareRisk') },
    { key: 'Verify', label: t('intent.compareVerify') },
  ];

  return (
    <table className="compare-table">
      <caption className="visually-hidden">{t('intent.compareTitle')}</caption>
      <thead>
        <tr>
          <th scope="col">{t('intent.compareRow')}</th>
          <th scope="col">{t('intent.work')}</th>
          <th scope="col">{t('intent.study')}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.key}>
            <th scope="row">{row.label}</th>
            <td data-label={t('intent.work')}>{t(`intent.compare${row.key}Work`)}</td>
            <td data-label={t('intent.study')}>{t(`intent.compare${row.key}Study`)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
