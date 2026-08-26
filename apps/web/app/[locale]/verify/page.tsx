import { redirect } from 'next/navigation';
import type { ScanResultDto } from '@probash/contracts';
import { apiRequest } from '@/lib/api';
import { localeSegment, parseLocaleParam, translator } from '@/lib/i18n';
import { ScanResult } from '@/components/ScanResult';
import { VerificationRequestForm } from '@/components/OperationalForms';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { getWorkspace } from '@/db/operations';
import { ScannerForm } from './scanner-form';
import { WorkspacePageShell } from '@/components/WorkspacePageShell';

export const dynamic = 'force-dynamic';

/**
 * §23 — the fraud scanner. Deliberately reachable without an account: the person
 * holding a suspicious message is often the one who has not signed up (§14.1).
 */
export default async function VerifyPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ publicId?: string; workspace?: string }>;
}) {
  const { locale: segment } = await params;
  const { publicId, workspace: workspaceMode } = await searchParams;
  const locale = parseLocaleParam(segment);
  const seg = localeSegment(locale);
  const t = translator(locale);
  const user = await getChatGPTUser();
  const workspace = user ? await getWorkspace(user.userId) : null;

  const labels = {
    whatWeChecked: t('scanner.whatWeChecked'),
    whatWeCouldNotCheck: t('scanner.whatWeCouldNotCheck'),
    adviceTitle: t('scanner.adviceTitle'),
    aiNotice: t('scanner.aiNotice'),
    verdicts: {
      VERIFIED: t('scanner.verdictVERIFIED'),
      PARTIALLY_VERIFIED: t('scanner.verdictPARTIALLY_VERIFIED'),
      MISMATCH: t('scanner.verdictMISMATCH'),
      HIGH_RISK: t('scanner.verdictHIGH_RISK'),
      UNKNOWN_HUMAN_CHECK_REQUIRED: t('scanner.verdictUNKNOWN_HUMAN_CHECK_REQUIRED'),
    },
  };

  const trimmed = publicId?.trim().toUpperCase();

  /*
   * A well-formed verification id belongs on the public verification page: it answers
   * verified / suspended / expired / not found directly. The scanner is for offers and
   * messages, where an id alone can only ever produce "we cannot determine" (§23).
   */
  if (trimmed && /^BD-[A-Z]{2}-\d{4}-\d{8}$/.test(trimmed)) {
    redirect(`/${localeSegment(locale)}/verify/job/${trimmed}`);
  }

  // Anything else that was typed still gets checked here, on the server.
  const serverResult = trimmed
    ? await apiRequest<ScanResultDto>('/api/v1/verify/offer', {
        method: 'POST',
        body: { publicJobId: trimmed },
        locale,
      })
    : undefined;

  return (
    <WorkspacePageShell active="verify" enabled={workspaceMode === '1'} locale={locale}>
      <>
        <h1 style={{ fontSize: 'var(--font-size-heading)', fontWeight: 700 }}>
          {t('scanner.title')}
        </h1>
        <p>{t('scanner.help')}</p>
        {serverResult ? <ScanResult result={serverResult} locale={locale} labels={labels} /> : null}

        <ScannerForm
          locale={locale}
          defaultPublicId={trimmed}
          labels={{
            publicIdLabel: t('scanner.publicIdLabel'),
            pasteMessage: t('scanner.pasteMessage'),
            checkNow: t('scanner.checkNow'),
            error: t('common.errorTitle'),
            ...labels,
          }}
        />

        <section className="stack" aria-labelledby="human-review-heading">
          <VerificationRequestForm locale={locale} localeSegment={seg} />
          {workspace ? (
            <div className="card stack">
              <h2 id="human-review-heading" className="card-title">
                {t('operations.reviewHistory')}
              </h2>
              {workspace.verifications.length === 0 ? (
                <p className="muted">{t('operations.noReviews')}</p>
              ) : (
                <ul className="record-list">
                  {workspace.verifications.map((request) => (
                    <li key={request.id}>
                      <div>
                        <strong>{request.subject}</strong>
                        <span className="muted">{t(`operations.kind.${request.kind}`)}</span>
                      </div>
                      <span className="badge badge-warning">{request.status}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <p className="muted">{t('operations.signInToTrack')}</p>
          )}
        </section>
      </>
    </WorkspacePageShell>
  );
}
