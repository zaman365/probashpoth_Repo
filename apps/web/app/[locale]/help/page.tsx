import { parseLocaleParam, translator } from '@/lib/i18n';
import { ListenButton } from '@/components/ListenButton';
import { SupportTicketForm } from '@/components/OperationalForms';
import { WorkspacePageShell } from '@/components/WorkspacePageShell';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { getWorkspace } from '@/db/operations';
import { localeSegment } from '@/lib/i18n';

/**
 * §34/§35 — the help surface. Emergency contact numbers are operational data that
 * must come from a verified source, so this page states what it does not yet have
 * rather than inventing a hotline number.
 */
export default async function HelpPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ workspace?: string }>;
}) {
  const { locale: segment } = await params;
  const { workspace: workspaceMode } = await searchParams;
  const locale = parseLocaleParam(segment);
  const seg = localeSegment(locale);
  const t = translator(locale);
  const user = await getChatGPTUser();
  const workspace = user ? await getWorkspace(user.userId) : null;
  const journeys = workspace?.journeys.map(({ id, title }) => ({ id, title })) ?? [];

  return (
    <WorkspacePageShell active="help" enabled={workspaceMode === '1'} locale={locale}>
      <>
        <h1 style={{ fontSize: 'var(--font-size-heading)', fontWeight: 700 }}>
          {t('common.emergency')}
        </h1>
        <section className="card stack">
          <p>{t('eligibility.requestHumanReview')}</p>
          <p className="badge badge-warning">{t('verification.pending')}</p>
          <p className="muted">{t('legal.notGovernment')}</p>
          <ListenButton
            text={`${t('common.emergency')}। ${t('eligibility.requestHumanReview')}`}
            label={t('common.listen')}
            lang={locale}
          />
        </section>
        <section className="card stack">
          <h2 style={{ fontWeight: 600 }}>{t('cost.payOnlyHere')}</h2>
          <p>{t('payment.neverPayCash')}</p>
          <p>{t('legal.noVisaGuarantee')}</p>
        </section>
        <section id="support-form" className="support-form-anchor">
          <SupportTicketForm locale={locale} localeSegment={seg} journeys={journeys} />
        </section>
        {workspace ? (
          <section className="card stack" aria-labelledby="support-history-heading">
            <h2 id="support-history-heading" className="card-title">
              {t('operations.supportHistory')}
            </h2>
            {workspace.supportTickets.length === 0 ? (
              <p className="muted">{t('operations.noSupportTickets')}</p>
            ) : (
              <ul className="record-list">
                {workspace.supportTickets.map((ticket) => (
                  <li key={ticket.id}>
                    <div>
                      <strong>{ticket.subject}</strong>
                      <span className="muted">{ticket.category}</span>
                    </div>
                    <span
                      className={`badge ${ticket.priority === 'critical' ? 'badge-danger' : 'badge-info'}`}
                    >
                      {ticket.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : (
          <p className="muted">{t('operations.signInToTrack')}</p>
        )}
      </>
    </WorkspacePageShell>
  );
}
