import Link from 'next/link';
import type { CaseDetailDto, CostPlanDto, PaymentIntentDto } from '@probash/contracts';
import { authedRequest, tryAuthed } from '@/lib/api';
import { localeSegment, parseLocaleParam, pick, translator } from '@/lib/i18n';
import { MoneyBreakdown } from '@/components/MoneyBreakdown';
import { ListenButton } from '@/components/ListenButton';
import { completeTaskAction, createPaymentIntentAction, inviteFamilyAction } from '../../actions';

export const dynamic = 'force-dynamic';

const MILESTONE_CLASS: Record<string, string> = {
  pending: 'badge-neutral',
  evidence_submitted: 'badge-info',
  verified: 'badge-success',
  failed: 'badge-danger',
  skipped: 'badge-neutral',
};

/** §20, §24, §25, §28 — the case screen: tasks, real cost, milestones, family. */
export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: segment, id } = await params;
  const locale = parseLocaleParam(segment);
  const seg = localeSegment(locale);
  const t = translator(locale);

  const detail = await tryAuthed<CaseDetailDto>(`/api/v1/cases/${id}`);
  if (!detail) {
    return (
      <section className="card stack">
        <p>{t('onboarding.phoneHelp')}</p>
        <Link href={`/${seg}/onboarding`} className="btn btn-primary">
          {t('onboarding.phoneTitle')}
        </Link>
      </section>
    );
  }

  const plan = await authedRequest<CostPlanDto>(`/api/v1/cases/${id}/cost-plan`);
  const intents = await authedRequest<PaymentIntentDto[]>(`/api/v1/cases/${id}/payment-intents`);
  const paidItemIds = new Set(intents.map((intent) => intent.costItemId));
  const doneCount = detail.tasks.filter((task) => task.status === 'done').length;

  return (
    <>
      <h1 style={{ fontSize: 'var(--font-size-heading)', fontWeight: 700 }}>{t('case.title')}</h1>
      <p className="badge badge-info">
        {t('case.step', { current: doneCount, total: detail.tasks.length })} — {detail.state}
      </p>

      <section className="stack" aria-labelledby="tasks-heading">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="tasks-heading" style={{ fontSize: 'var(--font-size-title)', fontWeight: 700 }}>
            {t('case.tasks')}
          </h2>
          <ListenButton
            text={detail.tasks.map((task) => pick(task.title, locale)).join('। ')}
            label={t('common.listen')}
            lang={locale}
          />
        </div>
        <ol className="stack">
          {detail.tasks.map((task) => (
            <li key={task.id} className="card stack">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span style={{ fontWeight: 600 }}>
                  {task.order}. {pick(task.title, locale)}
                </span>
                <span
                  className={`badge ${task.status === 'done' ? 'badge-success' : 'badge-neutral'}`}
                >
                  {task.status === 'done' ? t('case.statusDone') : t('case.statusTodo')}
                </span>
              </div>
              <details className="card-muted">
                <summary>{t('case.whyNeeded')}</summary>
                <p style={{ marginTop: 'var(--space-sm)' }}>{pick(task.whyNeeded, locale)}</p>
                {task.performedAt ? (
                  <p className="muted">
                    {t('case.whereToDo')}: {pick(task.performedAt, locale)}
                  </p>
                ) : null}
              </details>
              {task.status !== 'done' ? (
                <form action={completeTaskAction} className="no-print">
                  <input type="hidden" name="caseId" value={detail.id} />
                  <input type="hidden" name="taskId" value={task.id} />
                  <input type="hidden" name="locale" value={seg} />
                  <button type="submit" className="btn btn-secondary">
                    {t('case.markDone')}
                  </button>
                </form>
              ) : null}
            </li>
          ))}
        </ol>
      </section>

      <MoneyBreakdown plan={plan} locale={locale} />

      <section className="stack no-print" aria-labelledby="pay-heading">
        <h2 id="pay-heading" style={{ fontSize: 'var(--font-size-title)', fontWeight: 700 }}>
          {t('payment.title')}
        </h2>
        <p className="badge badge-warning">{t('payment.sandboxNotice')}</p>
        <p className="muted">{t('payment.custodyNotice')}</p>
        <ul className="stack">
          {plan.items
            .filter(
              (item) =>
                (item.payer.kind === 'worker' || item.payer.kind === 'student') &&
                item.legallyAllowed === true &&
                !plan.unresolvedItemIds.includes(item.id),
            )
            .map((item) => {
              const intent = intents.find((i) => i.costItemId === item.id);
              return (
                <li key={item.id} className="card stack">
                  <span style={{ fontWeight: 600 }}>{pick(item.label, locale)}</span>
                  {intent ? (
                    <>
                      <span className="badge badge-info">
                        {intent.status === 'confirmed'
                          ? t('payment.statusConfirmed')
                          : t('payment.statusCreated')}
                      </span>
                      <p className="muted">{t('payment.heldUntilMilestone')}</p>
                      <Link
                        href={`/${seg}/cases/${detail.id}/receipt/${intent.id}`}
                        className="btn btn-secondary"
                      >
                        {t('cost.receipt')}
                      </Link>
                    </>
                  ) : (
                    <form action={createPaymentIntentAction}>
                      <input type="hidden" name="caseId" value={detail.id} />
                      <input type="hidden" name="costItemId" value={item.id} />
                      <input type="hidden" name="locale" value={seg} />
                      <button type="submit" className="btn btn-primary">
                        {t('payment.createIntent')}
                      </button>
                    </form>
                  )}
                </li>
              );
            })}
        </ul>
        {paidItemIds.size === 0 ? (
          <p className="badge badge-success">{t('cost.noPaymentNeededNow')}</p>
        ) : null}
      </section>

      <section className="stack" aria-labelledby="milestones-heading">
        <h2 id="milestones-heading" style={{ fontSize: 'var(--font-size-title)', fontWeight: 700 }}>
          {t('case.milestones')}
        </h2>
        <ol className="stack">
          {detail.milestones.map((milestone) => (
            <li
              key={milestone.id}
              className="flex flex-wrap items-center justify-between gap-2 card-muted"
            >
              <span>{pick(milestone.label, locale)}</span>
              <span className={`badge ${MILESTONE_CLASS[milestone.status]}`}>
                {milestone.status === 'verified'
                  ? t('case.milestoneVerified')
                  : milestone.status === 'evidence_submitted'
                    ? t('case.milestoneEvidence')
                    : t('case.milestonePending')}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className="card stack no-print" aria-labelledby="family-heading">
        <h2 id="family-heading" style={{ fontWeight: 700 }}>
          {t('case.familyCopilot')}
        </h2>
        <p>{t('family.explain')}</p>
        <form action={inviteFamilyAction} className="stack">
          <input type="hidden" name="caseId" value={detail.id} />
          <input type="hidden" name="locale" value={seg} />
          <label htmlFor="family-phone">{t('family.phoneLabel')}</label>
          <input id="family-phone" name="phone" className="field" inputMode="tel" required />
          <label htmlFor="relationship">{t('family.relationship')}</label>
          <select id="relationship" name="relationship" className="field" defaultValue="spouse">
            <option value="spouse">{t('family.relationshipSpouse')}</option>
            <option value="parent">{t('family.relationshipParent')}</option>
            <option value="sibling">{t('family.relationshipSibling')}</option>
            <option value="child">{t('family.relationshipChild')}</option>
            <option value="trusted_person">{t('family.relationshipTrusted')}</option>
          </select>
          <button type="submit" className="btn btn-secondary">
            {t('family.invite')}
          </button>
        </form>
      </section>
    </>
  );
}
