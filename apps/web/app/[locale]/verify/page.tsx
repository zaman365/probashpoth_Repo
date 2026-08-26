import { parseLocaleParam, translator } from '@/lib/i18n';
import { ScannerForm } from './scanner-form';

/**
 * §23 — the fraud scanner. Deliberately reachable without an account: the person
 * holding a suspicious message is often the one who has not signed up (§14.1).
 */
export default async function VerifyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: segment } = await params;
  const locale = parseLocaleParam(segment);
  const t = translator(locale);

  return (
    <>
      <h1 style={{ fontSize: 'var(--font-size-heading)', fontWeight: 700 }}>
        {t('scanner.title')}
      </h1>
      <p>{t('scanner.help')}</p>
      <ScannerForm
        locale={locale}
        labels={{
          publicIdLabel: t('scanner.publicIdLabel'),
          pasteMessage: t('scanner.pasteMessage'),
          checkNow: t('scanner.checkNow'),
          whatWeChecked: t('scanner.whatWeChecked'),
          whatWeCouldNotCheck: t('scanner.whatWeCouldNotCheck'),
          adviceTitle: t('scanner.adviceTitle'),
          aiNotice: t('scanner.aiNotice'),
          error: t('common.errorTitle'),
          verdicts: {
            VERIFIED: t('scanner.verdictVERIFIED'),
            PARTIALLY_VERIFIED: t('scanner.verdictPARTIALLY_VERIFIED'),
            MISMATCH: t('scanner.verdictMISMATCH'),
            HIGH_RISK: t('scanner.verdictHIGH_RISK'),
            UNKNOWN_HUMAN_CHECK_REQUIRED: t('scanner.verdictUNKNOWN_HUMAN_CHECK_REQUIRED'),
          },
        }}
      />
    </>
  );
}
