import { parseLocaleParam, translator } from '@/lib/i18n';
import { ListenButton } from '@/components/ListenButton';

/**
 * §34/§35 — the help surface. Emergency contact numbers are operational data that
 * must come from a verified source, so this page states what it does not yet have
 * rather than inventing a hotline number.
 */
export default async function HelpPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: segment } = await params;
  const locale = parseLocaleParam(segment);
  const t = translator(locale);

  return (
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
    </>
  );
}
