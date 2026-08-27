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
 * The segmented control itself: two links, never state. It appears twice — in the
 * after the hero and above the comparison cards — and both instances read and write
 * the same URL, so they can never disagree about what is selected.
 *
 * `tone="canvas"` is the variant for the dark hero; `light` is for ordinary sections.
 */
export function IntentSwitch({
  locale,
  intent,
  tone = 'light',
  compact = false,
}: {
  locale: Locale;
  intent: Intent;
  tone?: 'light' | 'canvas';
  compact?: boolean;
}) {
  const t = translator(locale);
  const seg = localeSegment(locale);

  const options = [
    {
      key: 'work' as const,
      icon: 'work' as const,
      label: t(compact ? 'intent.workShort' : 'intent.work'),
    },
    {
      key: 'study' as const,
      icon: 'study' as const,
      label: t(compact ? 'intent.studyShort' : 'intent.study'),
    },
  ];

  return (
    <div
      className={`intent-switch intent-switch-${tone}${compact ? ' intent-switch-compact' : ''}`}
      role="group"
      aria-label={t('intent.chooseTitle')}
    >
      {options.map((option) => (
        <Link
          key={option.key}
          href={`/${seg}?intent=${option.key}`}
          className={`intent-switch-option${intent === option.key ? ' is-selected' : ''}`}
          aria-current={intent === option.key ? 'true' : undefined}
          scroll={false}
        >
          <Icon name={option.icon} size={compact ? 17 : 20} />
          <span>{option.label}</span>
        </Link>
      ))}
    </div>
  );
}

/**
 * §14.1 — work and study are the two top-level decisions, and a person has to be able
 * to weigh them *before* picking one. Both cards are always shown; the selection only
 * decides which path is highlighted and which hub the primary button opens.
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
      <IntentSwitch locale={locale} intent={intent} />

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
