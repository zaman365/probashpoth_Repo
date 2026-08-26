import Link from 'next/link';
import type { CaseDetailDto, CostPlanDto, PaymentIntentDto } from '@probash/contracts';
import { authedRequest, tryAuthed } from '@/lib/api';
import { localeSegment, parseLocaleParam, pick, translator } from '@/lib/i18n';
import { MoneyBreakdown } from '@/components/MoneyBreakdown';
import { ListenButton } from '@/components/ListenButton';
import { completeTaskAction, createPaymentIntentAction, inviteFamilyAction } from '../../actions';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { getWorkspace } from '@/db/operations';
import { Badge, ButtonLink, Card, Grid, Section } from '@probash/web-ui';
import { completeOperationalTaskAction } from '../../operational-actions';
import { setJourneyRecordStatusAction } from '../../operational-actions';
import { JourneyRecordForm } from '@/components/OperationalForms';

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

  const user = await getChatGPTUser();
  if (user) {
    const workspace = await getWorkspace(user.userId);
    const journey = workspace.journeys.find((item) => item.id === id);
    if (journey) {
      const doneCount = journey.tasks.filter((task) => task.status === 'done').length;
      const nextTask = journey.tasks.find((task) => task.status !== 'done');
      const journeyLedger = workspace.ledger.filter((entry) => entry.journeyId === journey.id);
      const journeyDocuments = workspace.documents.filter(
        (document) => document.journeyId === journey.id,
      );
      const journeyRecords = workspace.records.filter((record) => record.journeyId === journey.id);
      return (
        <>
          <Section
            surface="warm"
            headingLevel={1}
            eyebrow={t(journey.path === 'work' ? 'intent.work' : 'intent.study')}
            title={journey.title}
            lead={t('case.operationalDetailLead')}
          >
            <div className="journey-progress-summary">
              <strong>{t('case.step', { current: doneCount, total: journey.tasks.length })}</strong>
              <div className="progress-bar" aria-label={t('case.progress')}>
                <span
                  style={{
                    width: `${journey.tasks.length ? (doneCount / journey.tasks.length) * 100 : 0}%`,
                  }}
                />
              </div>
              {nextTask ? (
                <p>{pick(nextTask.title, locale)}</p>
              ) : (
                <Badge tone="success">{t('case.allTasksDone')}</Badge>
              )}
            </div>
          </Section>
          <Section surface="default" title={t('case.tasks')}>
            <ol className="operational-timeline">
              {journey.tasks.map((task) => (
                <li key={task.id} className={task.status === 'done' ? 'is-done' : undefined}>
                  <span className="operational-timeline-number">
                    {String(task.position).padStart(2, '0')}
                  </span>
                  <div className="card stack">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="card-title">{pick(task.title, locale)}</h3>
                      <Badge tone={task.status === 'done' ? 'success' : 'neutral'}>
                        {task.status === 'done' ? t('case.statusDone') : t('case.statusTodo')}
                      </Badge>
                    </div>
                    <p>{pick(task.detail, locale)}</p>
                    {task.status !== 'done' ? (
                      <form action={completeOperationalTaskAction}>
                        <input type="hidden" name="locale" value={seg} />
                        <input type="hidden" name="journeyId" value={journey.id} />
                        <input type="hidden" name="taskId" value={task.id} />
                        <button type="submit" className="btn btn-secondary">
                          {t('case.markDone')}
                        </button>
                      </form>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          </Section>
          <Section
            surface="warm"
            title={t('operations.workbenchTitle')}
            lead={t('operations.workbenchLead')}
          >
            <Grid min={360}>
              <JourneyRecordForm
                locale={locale}
                localeSegment={seg}
                journeyId={journey.id}
                path={journey.path}
              />
              <div className="stack">
                {journeyRecords.length === 0 ? (
                  <Card tone="muted">
                    <p>{t('operations.noRecords')}</p>
                  </Card>
                ) : null}
                {journeyRecords.map((record) => (
                  <Card key={record.id}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Badge
                        tone={
                          record.status === 'completed' || record.status === 'verified'
                            ? 'success'
                            : record.status === 'blocked' || record.status === 'rejected'
                              ? 'danger'
                              : 'info'
                        }
                      >
                        {t(`operations.recordStatus.${record.status}`)}
                      </Badge>
                      <span className="muted">
                        {t(`operations.recordType.${record.recordType}`)}
                      </span>
                    </div>
                    <h3 className="card-title">{record.title}</h3>
                    {record.notes ? <p>{record.notes}</p> : null}
                    {record.dueAt ? (
                      <p className="muted">
                        {t('operations.deadline')}: {record.dueAt}
                      </p>
                    ) : null}
                    {record.amountMinor !== null && record.currency ? (
                      <p className="amount">
                        {new Intl.NumberFormat(locale === 'bn-BD' ? 'bn-BD' : 'en', {
                          style: 'currency',
                          currency: record.currency,
                        }).format(record.amountMinor / 100)}
                      </p>
                    ) : null}
                    {record.status !== 'completed' ? (
                      <form action={setJourneyRecordStatusAction}>
                        <input type="hidden" name="locale" value={seg} />
                        <input type="hidden" name="journeyId" value={journey.id} />
                        <input type="hidden" name="recordId" value={record.id} />
                        <input type="hidden" name="status" value="completed" />
                        <button type="submit" className="btn btn-secondary">
                          {t('operations.markComplete')}
                        </button>
                      </form>
                    ) : null}
                  </Card>
                ))}
              </div>
            </Grid>
          </Section>
          <Section surface="muted" title={t('case.caseTools')}>
            <Grid min={240}>
              <Card>
                <h3 className="card-title">{t('workspace.documents')}</h3>
                <p>{t('case.documentCount', { count: journeyDocuments.length })}</p>
                <ButtonLink href={`/${seg}/documents`} variant="outline">
                  {t('workspace.openDocuments')}
                </ButtonLink>
              </Card>
              <Card>
                <h3 className="card-title">{t('workspace.money')}</h3>
                <p>{t('case.costCount', { count: journeyLedger.length })}</p>
                <ButtonLink href={`/${seg}/money`} variant="outline">
                  {t('workspace.openMoney')}
                </ButtonLink>
              </Card>
              <Card>
                <h3 className="card-title">{t('workspace.family')}</h3>
                <p>{t('workspace.familyBody')}</p>
                <ButtonLink href={`/${seg}/family`} variant="outline">
                  {t('workspace.openFamily')}
                </ButtonLink>
              </Card>
              <Card>
                <h3 className="card-title">{t('common.help')}</h3>
                <p>{t('case.helpBody')}</p>
                <ButtonLink href={`/${seg}/help`} variant="outline">
                  {t('common.help')}
                </ButtonLink>
              </Card>
            </Grid>
          </Section>
        </>
      );
    }
  }

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
