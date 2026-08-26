import type { ReceiptDto } from '@probash/contracts';
import { authedRequest } from '@/lib/api';
import { date, money } from '@/lib/format';
import { parseLocaleParam, pick, translator } from '@/lib/i18n';
import { ListenButton } from '@/components/ListenButton';

export const dynamic = 'force-dynamic';

/** §24 — a receipt that can be read aloud, printed, or sent as an SMS. */
export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ locale: string; intentId: string }>;
}) {
  const { locale: segment, intentId } = await params;
  const locale = parseLocaleParam(segment);
  const t = translator(locale);
  const receipt = await authedRequest<ReceiptDto>(`/api/v1/payments/${intentId}/receipt`);
  const smsText = locale === 'en' ? receipt.smsText.en : receipt.smsText.bn;

  return (
    <>
      <h1 style={{ fontSize: 'var(--font-size-heading)', fontWeight: 700 }}>{t('cost.receipt')}</h1>
      {receipt.isSandbox ? (
        <p className="badge badge-warning">{t('payment.sandboxNotice')}</p>
      ) : null}

      <section className="card stack">
        <p className="muted">{receipt.receiptNumber}</p>
        <p className="amount">{money(receipt.amount, locale)}</p>
        <dl className="grid grid-cols-2 gap-3">
          <div>
            <dt className="muted">{t('payment.payee')}</dt>
            <dd>{pick(receipt.payee, locale)}</dd>
          </div>
          <div>
            <dt className="muted">{t('payment.method')}</dt>
            <dd>{receipt.method}</dd>
          </div>
          <div>
            <dt className="muted">{t('cost.refundable')}</dt>
            <dd>
              {receipt.refundable ? `✅ ${t('cost.refundable')}` : `🚫 ${t('cost.nonRefundable')}`}
            </dd>
          </div>
          <div>
            <dt className="muted">{t('case.milestones')}</dt>
            <dd>
              {receipt.settlementState === 'released'
                ? t('payment.settlementReleased')
                : t('payment.heldUntilMilestone')}
            </dd>
          </div>
          <div>
            <dt className="muted">{t('verification.lastVerified')}</dt>
            <dd>{date(receipt.issuedAt, locale)}</dd>
          </div>
        </dl>
        <ListenButton text={smsText} label={t('common.listen')} lang={locale} />
      </section>

      <section className="card-muted stack">
        <h2 style={{ fontWeight: 600 }}>{t('cost.smsReceipt')}</h2>
        <p>{smsText}</p>
      </section>

      <p className="badge badge-warning">{t('payment.neverPayCash')}</p>
    </>
  );
}
