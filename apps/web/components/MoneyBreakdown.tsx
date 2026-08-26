import type { Locale } from '@probash/domain';
import type { CostPlanDto } from '@probash/contracts';
import { money } from '@/lib/format';
import { pick, translator } from '@/lib/i18n';
import { ListenButton } from './ListenButton';

/**
 * §24 — the cost sheet. Refundable and non-refundable are distinguished visually
 * *and* in the audio summary; every row says who is paying whom.
 */
export function MoneyBreakdown({ plan, locale }: { plan: CostPlanDto; locale: Locale }) {
  const t = translator(locale);
  const primary = plan.totals.find((block) => block.currency === plan.primaryCurrency);

  const spoken = [
    t('cost.title'),
    primary ? `${t('cost.youPay')}: ${money(primary.totals.workerPaid, locale)}` : '',
    primary ? `${t('cost.refundable')}: ${money(primary.totals.refundable, locale)}` : '',
    primary ? `${t('cost.nonRefundable')}: ${money(primary.totals.nonRefundable, locale)}` : '',
    t('cost.payOnlyHere'),
  ]
    .filter(Boolean)
    .join('। ');

  return (
    <section className="stack-lg" aria-labelledby="cost-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="cost-heading" style={{ fontSize: 'var(--font-size-title)', fontWeight: 700 }}>
          {t('cost.title')}
        </h2>
        <ListenButton text={spoken} label={t('common.listen')} lang={locale} />
      </div>

      {plan.totals.map((block) => (
        <div key={block.currency} className="card stack">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <span className="muted">{block.currency}</span>
            <span className="amount">{money(block.totals.workerPaid, locale)}</span>
          </div>
          <dl className="grid grid-cols-2 gap-3">
            <div>
              <dt className="muted">{t('cost.youPay')}</dt>
              <dd>{money(block.totals.workerPaid, locale)}</dd>
            </div>
            <div>
              <dt className="muted">{t('cost.employerPays')}</dt>
              <dd>{money(block.totals.employerPaid, locale)}</dd>
            </div>
            <div>
              <dt className="muted">✅ {t('cost.refundable')}</dt>
              <dd>{money(block.totals.refundable, locale)}</dd>
            </div>
            <div>
              <dt className="muted">🚫 {t('cost.nonRefundable')}</dt>
              <dd>{money(block.totals.nonRefundable, locale)}</dd>
            </div>
            <div>
              <dt className="muted">{t('cost.alreadyPaid')}</dt>
              <dd>{money(block.totals.alreadyPaid, locale)}</dd>
            </div>
            <div>
              <dt className="muted">{t('cost.remaining')}</dt>
              <dd>{money(block.totals.remaining, locale)}</dd>
            </div>
          </dl>
        </div>
      ))}

      <p className="badge badge-warning">{t('cost.payOnlyHere')}</p>

      <ul className="stack">
        {plan.items.map((item) => {
          const unresolved = plan.unresolvedItemIds.includes(item.id);
          return (
            <li key={item.id} className="card stack">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span style={{ fontWeight: 600 }}>{pick(item.label, locale)}</span>
                <span className="amount" style={{ fontSize: 'var(--font-size-title)' }}>
                  {unresolved ? '—' : money(item.amount, locale)}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="badge badge-neutral">{t(`cost.category.${item.category}`)}</span>
                <span className={`badge ${item.refundable ? 'badge-success' : 'badge-warning'}`}>
                  {item.refundable ? `✅ ${t('cost.refundable')}` : `🚫 ${t('cost.nonRefundable')}`}
                </span>
                <span className="badge badge-info">
                  {t('cost.whoGetsThisMoney')}:{' '}
                  {pick(item.payee.name, locale) || t(`cost.payeeKind.${item.payee.kind}`)}
                </span>
                <span className="badge badge-neutral">
                  {item.payer.kind === 'employer' ? t('job.paidByEmployer') : t('job.paidByWorker')}
                </span>
              </div>
              {unresolved ? <p className="badge badge-warning">{t('cost.unresolved')}</p> : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
