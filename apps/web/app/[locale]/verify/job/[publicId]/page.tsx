import QRCode from 'qrcode';
import type { PublicJobVerificationDto } from '@probash/contracts';
import { apiRequest } from '@/lib/api';
import { date, money } from '@/lib/format';
import { parseLocaleParam, pick, translator } from '@/lib/i18n';
import { VerifiedBadge } from '@/components/VerifiedBadge';

export const dynamic = 'force-dynamic';

const STATUS_CLASS: Record<string, string> = {
  verified: 'badge-success',
  suspended: 'badge-danger',
  expired: 'badge-warning',
  not_found: 'badge-danger',
};

/**
 * §21 — the public verification page. No login, no personal data, and a signed QR
 * that resolves back to this same page.
 */
export default async function PublicVerifyPage({
  params,
}: {
  params: Promise<{ locale: string; publicId: string }>;
}) {
  const { locale: segment, publicId } = await params;
  const locale = parseLocaleParam(segment);
  const t = translator(locale);

  const result = await apiRequest<PublicJobVerificationDto>(
    `/api/v1/verify/job/${encodeURIComponent(publicId)}`,
    { locale },
  );

  const qrSvg = result.qrPayload
    ? await QRCode.toString(result.qrPayload, { type: 'svg', margin: 1, width: 220 })
    : undefined;

  return (
    <>
      <h1 style={{ fontSize: 'var(--font-size-heading)', fontWeight: 700 }}>
        {t('job.publicId')}: <code>{result.publicId || publicId}</code>
      </h1>

      <p
        className={`badge ${STATUS_CLASS[result.status]}`}
        style={{ fontSize: 'var(--font-size-body-large)' }}
      >
        {result.status === 'verified'
          ? t('job.verifiedJob')
          : result.status === 'not_found'
            ? t('risk.kind.job_id_not_found')
            : result.status}
      </p>

      {result.isSyntheticDemoData ? (
        <p className="badge badge-danger">{t('common.demoDataWarning')}</p>
      ) : null}

      {result.status === 'not_found' ? (
        <section className="card stack">
          <p>{t('scanner.verdictHIGH_RISK')}</p>
          <p className="badge badge-warning">{t('cost.payOnlyHere')}</p>
        </section>
      ) : (
        <>
          <section className="card stack">
            <dl className="grid grid-cols-2 gap-3">
              <div>
                <dt className="muted">{t('job.employer')}</dt>
                <dd>{pick(result.employerName, locale)}</dd>
              </div>
              <div>
                <dt className="muted">{t('job.agency')}</dt>
                <dd>{pick(result.agencyName, locale) || '—'}</dd>
              </div>
              <div>
                <dt className="muted">{t('job.salary')}</dt>
                <dd className="amount" style={{ fontSize: 'var(--font-size-title)' }}>
                  {money(result.monthlySalary, locale)}
                </dd>
              </div>
              <div>
                <dt className="muted">{t('job.allowedWorkerCost')}</dt>
                <dd className="amount" style={{ fontSize: 'var(--font-size-title)' }}>
                  {money(result.allowedWorkerCost, locale)}
                </dd>
              </div>
              <div>
                <dt className="muted">{t('job.validUntil')}</dt>
                <dd>{date(result.demandValidTo, locale)}</dd>
              </div>
              <div>
                <dt className="muted">{t('job.licence')}</dt>
                <dd>
                  {result.agencyLicence
                    ? `${result.agencyLicence.number} — ${result.agencyLicence.status}`
                    : '—'}
                </dd>
              </div>
            </dl>
          </section>

          {result.verification ? (
            <VerifiedBadge
              level={result.verification.level}
              facets={result.verification.facets}
              notChecked={result.verification.notChecked}
              lastVerifiedAt={result.lastVerifiedAt}
              locale={locale}
            />
          ) : null}

          {qrSvg ? (
            <section className="card stack" aria-labelledby="qr-heading">
              <h2 id="qr-heading" style={{ fontWeight: 600 }}>
                {t('job.scanToVerify')}
              </h2>
              {/* The payload carries only the public id, a key id and a timestamp. */}
              <div
                aria-label={t('job.scanToVerify')}
                dangerouslySetInnerHTML={{ __html: qrSvg }}
                style={{ maxWidth: 240 }}
              />
            </section>
          ) : null}
        </>
      )}

      <p className="badge badge-warning">{t('job.reportFraud')}</p>
    </>
  );
}
