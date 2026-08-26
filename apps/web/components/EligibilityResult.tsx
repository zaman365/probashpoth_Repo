import type { Locale } from '@probash/domain';
import type { EligibilityResponseDto } from '@probash/contracts';
import { pick, translator } from '@/lib/i18n';
import { SourceCitation } from './SourceCitation';
import { ListenButton } from './ListenButton';

const RESULT_STYLE: Record<string, string> = {
  eligible: 'badge-success',
  conditional: 'badge-warning',
  ineligible: 'badge-danger',
  unknown: 'badge-neutral',
};

const RESULT_KEY: Record<string, string> = {
  eligible: 'eligibility.eligible',
  conditional: 'eligibility.conditional',
  ineligible: 'eligibility.ineligible',
  unknown: 'eligibility.unknown',
};

/**
 * §19 — four honest outcomes, each rendered from the decision trace. There is no
 * score and no probability, and "we cannot determine" always offers a person.
 */
export function EligibilityResult({
  response,
  locale,
}: {
  response: EligibilityResponseDto;
  locale: Locale;
}) {
  const t = translator(locale);
  const { trace } = response;
  const headline = t(RESULT_KEY[trace.result] ?? 'eligibility.unknown');

  return (
    <section className="card stack-lg" aria-labelledby="eligibility-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2
          id="eligibility-heading"
          style={{ fontSize: 'var(--font-size-title)', fontWeight: 700 }}
        >
          <span className={`badge ${RESULT_STYLE[trace.result]}`}>{headline}</span>
        </h2>
        <ListenButton text={headline} label={t('common.listen')} lang={locale} />
      </div>

      {trace.result === 'unknown' ? <p>{t('eligibility.unknownHelp')}</p> : null}

      {trace.satisfied.length > 0 ? (
        <div>
          <h3 className="muted">{t('eligibility.satisfied')}</h3>
          <ul className="stack">
            {trace.satisfied.map((item) => (
              <li key={item.nodeId}>✓ {pick(item.label, locale)}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {trace.unsatisfied.length > 0 ? (
        <div>
          <h3 className="muted">{t('eligibility.unsatisfied')}</h3>
          <ul className="stack">
            {trace.unsatisfied.map((item) => (
              <li key={item.nodeId}>
                ✗ {pick(item.label, locale)}
                {item.preparation ? (
                  <div className="card-muted" style={{ marginTop: 'var(--space-sm)' }}>
                    <strong>{t('eligibility.preparation')}:</strong>{' '}
                    {pick(item.preparation, locale)}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {trace.missingFacts.length > 0 ? (
        <div>
          <h3 className="muted">{t('eligibility.missing')}</h3>
          <ul className="stack">
            {trace.missingFacts.map((fact) => (
              <li key={fact.nodeId}>? {pick(fact.label, locale)}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="badge badge-info">{t('eligibility.noGuarantee')}</p>
      {response.humanReviewOffered ? (
        <p className="badge badge-warning">{t('eligibility.requestHumanReview')}</p>
      ) : null}

      <SourceCitation sources={response.sources} locale={locale} />
    </section>
  );
}
