import type { EligibilityResponseDto, RouteDetailDto } from '@probash/contracts';
import { apiRequest } from '@/lib/api';
import { parseLocaleParam, pick, translator } from '@/lib/i18n';
import { SourceCitation } from '@/components/SourceCitation';
import { RiskNotice } from '@/components/RiskNotice';
import { EligibilityResult } from '@/components/EligibilityResult';
import { ListenButton } from '@/components/ListenButton';
import { StartCaseButton } from '../../start-case-button';

export const dynamic = 'force-dynamic';

/** §20 — a route reads as a plan: what is needed, why, how long, and from which source. */
export default async function RoutePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: segment, id } = await params;
  const locale = parseLocaleParam(segment);
  const t = translator(locale);

  const route = await apiRequest<RouteDetailDto>(`/api/v1/routes/${id}`, { locale });
  // An anonymous evaluation shows the requirements honestly as "not yet known"
  // rather than pretending the visitor is ineligible (§19).
  const eligibility = await apiRequest<EligibilityResponseDto>('/api/v1/eligibility/evaluate', {
    method: 'POST',
    body: { routeVersionId: route.id },
    locale,
  });

  const spoken = [
    pick(route.officialName, locale),
    pick(route.summary, locale),
    ...route.requirements.filter((r) => r.mandatory).map((r) => pick(r.label, locale)),
  ].join('। ');

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 style={{ fontSize: 'var(--font-size-heading)', fontWeight: 700 }}>
          {pick(route.officialName, locale)}
        </h1>
        <ListenButton text={spoken} label={t('common.listen')} lang={locale} />
      </div>
      <p>{pick(route.summary, locale)}</p>

      {!route.acceptsApplications ? (
        <p className="badge badge-danger">{t('route.statusTemporarilyPaused')}</p>
      ) : null}

      <section className="card stack" aria-labelledby="requirements">
        <h2 id="requirements" style={{ fontWeight: 700 }}>
          {t('route.requirements')}
        </h2>
        <ol className="stack">
          {route.requirements.map((requirement, index) => (
            <li key={requirement.id} className="card-muted stack">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span style={{ fontWeight: 600 }}>
                  {index + 1}. {pick(requirement.label, locale)}
                </span>
                <span
                  className={`badge ${requirement.mandatory ? 'badge-warning' : 'badge-neutral'}`}
                >
                  {requirement.mandatory ? t('route.mandatory') : t('route.optional')}
                </span>
              </div>
              {requirement.performedAt ? (
                <p className="muted">
                  {t('case.whereToDo')}: {pick(requirement.performedAt, locale)}
                </p>
              ) : null}
              {requirement.estimatedDays ? (
                <p className="muted">
                  {t('route.timeline')}: {requirement.estimatedDays}
                </p>
              ) : null}
            </li>
          ))}
        </ol>
      </section>

      {route.riskNotices.length > 0 ? (
        <section className="stack" aria-labelledby="risks">
          <h2 id="risks" style={{ fontWeight: 700 }}>
            {t('route.risks')}
          </h2>
          {route.riskNotices.map((notice) => (
            <RiskNotice
              key={notice.id}
              severity={notice.severity}
              title={notice.title}
              body={notice.body}
              locale={locale}
            />
          ))}
        </section>
      ) : null}

      <EligibilityResult response={eligibility} locale={locale} />

      {route.acceptsApplications ? (
        <StartCaseButton
          locale={locale}
          routeVersionId={route.id}
          label={t('case.title')}
          signInLabel={t('onboarding.phoneTitle')}
        />
      ) : null}

      <SourceCitation sources={route.sources} locale={locale} />
    </>
  );
}
