import Link from 'next/link';
import type { JobDetailDto } from '@probash/contracts';
import { apiRequest } from '@/lib/api';
import { date, money } from '@/lib/format';
import { localeSegment, parseLocaleParam, pick, translator } from '@/lib/i18n';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { SourceCitation } from '@/components/SourceCitation';
import { ListenButton } from '@/components/ListenButton';
import { StartCaseButton } from '../../start-case-button';

export const dynamic = 'force-dynamic';

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: segment, id } = await params;
  const locale = parseLocaleParam(segment);
  const seg = localeSegment(locale);
  const t = translator(locale);
  const job = await apiRequest<JobDetailDto>(`/api/v1/jobs/${id}`, { locale });

  const spoken = [
    pick(job.title, locale),
    `${t('job.salary')}: ${money(job.monthlySalary, locale)}`,
    `${t('job.allowedWorkerCost')}: ${money(job.allowedWorkerCost, locale)}`,
    t('cost.payOnlyHere'),
  ].join('। ');

  const yesNo = (value: boolean) => (value ? t('job.provided') : t('job.notProvided'));

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 style={{ fontSize: 'var(--font-size-heading)', fontWeight: 700 }}>
          {pick(job.title, locale)}
        </h1>
        <ListenButton text={spoken} label={t('common.listen')} lang={locale} />
      </div>

      {job.isSyntheticDemoData ? (
        <p className="badge badge-danger">{t('common.demoDataWarning')}</p>
      ) : null}

      <VerifiedBadge
        level={job.verification.level}
        facets={job.verification.facets}
        notChecked={job.verification.notChecked}
        lastVerifiedAt={job.verification.lastVerifiedAt}
        locale={locale}
      />

      <section className="card stack">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="muted">{t('job.salary')}</span>
          <span className="amount">{money(job.monthlySalary, locale)}</span>
        </div>
        <dl className="grid grid-cols-2 gap-3">
          <div>
            <dt className="muted">{t('job.employer')}</dt>
            <dd>{pick(job.employerName, locale)}</dd>
          </div>
          <div>
            <dt className="muted">{t('job.agency')}</dt>
            <dd>{pick(job.agencyName, locale) || '—'}</dd>
          </div>
          <div>
            <dt className="muted">{t('job.positions')}</dt>
            <dd>{job.positions}</dd>
          </div>
          <div>
            <dt className="muted">{t('job.contractMonths')}</dt>
            <dd>{job.terms.contractDurationMonths}</dd>
          </div>
          <div>
            <dt className="muted">{t('job.workingHours')}</dt>
            <dd>{job.terms.workingHoursPerWeek}</dd>
          </div>
          <div>
            <dt className="muted">{t('job.accommodation')}</dt>
            <dd>{yesNo(job.terms.accommodationProvided)}</dd>
          </div>
          <div>
            <dt className="muted">{t('job.food')}</dt>
            <dd>{yesNo(job.terms.foodProvided)}</dd>
          </div>
          <div>
            <dt className="muted">{t('job.transport')}</dt>
            <dd>{yesNo(job.terms.transportProvided)}</dd>
          </div>
          <div>
            <dt className="muted">{t('job.insurance')}</dt>
            <dd>{yesNo(job.terms.insuranceProvided)}</dd>
          </div>
          <div>
            <dt className="muted">{t('job.airfare')}</dt>
            <dd>
              {job.terms.airfarePaidBy === 'employer'
                ? t('job.paidByEmployer')
                : t('job.paidByWorker')}
            </dd>
          </div>
        </dl>
      </section>

      <section className="card stack">
        <h2 style={{ fontWeight: 600 }}>{t('job.allowedWorkerCost')}</h2>
        <p className="amount">{money(job.allowedWorkerCost, locale)}</p>
        <p className="badge badge-warning">{t('cost.payOnlyHere')}</p>
        {job.agencyLicence ? (
          <p className="muted">
            {t('job.licence')}: <code>{job.agencyLicence.number}</code> — {job.agencyLicence.status}
            {job.agencyLicence.validTo ? ` (${date(job.agencyLicence.validTo, locale)})` : ''}
          </p>
        ) : null}
        <p className="muted">
          {t('job.validUntil')}: {date(job.demandValidTo, locale)}
        </p>
      </section>

      <section className="card stack no-print">
        <h2 style={{ fontWeight: 600 }}>{t('job.scanToVerify')}</h2>
        <Link href={`/${seg}/verify/job/${job.publicId}`} className="btn btn-secondary">
          {t('job.publicId')}: {job.publicId}
        </Link>
        <StartCaseButton
          locale={locale}
          routeVersionId={job.routeVersionId}
          jobId={job.id}
          label={t('case.title')}
          signInLabel={t('onboarding.phoneTitle')}
          title={pick(job.title, locale)}
          destinationCountry={job.destinationCountry}
        />
      </section>

      <SourceCitation sources={job.sources} locale={locale} />
    </>
  );
}
