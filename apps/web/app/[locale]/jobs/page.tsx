import Link from 'next/link';
import type { JobSummaryDto } from '@probash/contracts';
import { apiRequest } from '@/lib/api';
import { money } from '@/lib/format';
import { localeSegment, parseLocaleParam, pick, translator } from '@/lib/i18n';
import { WorkspacePageShell } from '@/components/WorkspacePageShell';

export const dynamic = 'force-dynamic';

/** §19 — only verified opportunities are listed, each with its lawful worker cost. */
export default async function JobsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ country?: string; employerPays?: string; workspace?: string }>;
}) {
  const { locale: segment } = await params;
  const query = await searchParams;
  const locale = parseLocaleParam(segment);
  const seg = localeSegment(locale);
  const t = translator(locale);

  const search = new URLSearchParams();
  if (query.country) search.set('country', query.country);
  if (query.employerPays) search.set('employerPays', query.employerPays);

  const jobs = await apiRequest<JobSummaryDto[]>(
    `/api/v1/jobs${search.size ? `?${search.toString()}` : ''}`,
    { locale },
  );

  return (
    <WorkspacePageShell active="jobs" enabled={query.workspace === '1'} locale={locale}>
      <>
        <h1 style={{ fontSize: 'var(--font-size-heading)', fontWeight: 700 }}>
          {t('home.findWork')}
        </h1>

        <div className="flex flex-wrap gap-2 no-print">
          <Link href={`/${seg}/jobs`} className="btn btn-secondary">
            {t('job.filterAll')}
          </Link>
          <Link href={`/${seg}/jobs?employerPays=true`} className="btn btn-secondary">
            {t('job.paidByEmployer')}
          </Link>
        </div>

        {jobs.length === 0 ? <p className="card">{t('common.loading')}</p> : null}

        <ul className="stack">
          {jobs.map((job) => (
            <li key={job.id} className="card stack">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <Link
                  href={`/${seg}/jobs/${job.id}`}
                  style={{ fontWeight: 700, fontSize: 'var(--font-size-body-large)' }}
                >
                  {pick(job.title, locale)}
                </Link>
                <span className="amount" style={{ fontSize: 'var(--font-size-title)' }}>
                  {money(job.monthlySalary, locale)}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="badge badge-info">{job.destinationCountry}</span>
                <span className="badge badge-neutral">{pick(job.employerName, locale)}</span>
                <span
                  className={`badge ${job.recruitmentFeePaidBy === 'employer' ? 'badge-success' : 'badge-warning'}`}
                >
                  {job.recruitmentFeePaidBy === 'employer'
                    ? t('job.paidByEmployer')
                    : t('job.paidByWorker')}
                </span>
                {job.isSyntheticDemoData ? (
                  <span className="badge badge-danger">{t('common.demoDataWarning')}</span>
                ) : null}
              </div>
              <p className="muted">
                {t('job.allowedWorkerCost')}:{' '}
                <strong>{money(job.allowedWorkerCost, locale)}</strong>
              </p>
              <p className="muted">
                {t('job.publicId')}: <code>{job.publicId}</code>
              </p>
            </li>
          ))}
        </ul>
      </>
    </WorkspacePageShell>
  );
}
