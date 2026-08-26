import { localeSegment, parseLocaleParam, translator } from '@/lib/i18n';
import { OnboardingForm } from './onboarding-form';

/** §17 — phone OTP first, explicit consent, no email anywhere in the flow. */
export default async function OnboardingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: segment } = await params;
  const locale = parseLocaleParam(segment);
  const t = translator(locale);

  return (
    <>
      <h1 style={{ fontSize: 'var(--font-size-heading)', fontWeight: 700 }}>
        {t('onboarding.phoneTitle')}
      </h1>
      <p className="muted">{t('onboarding.phoneHelp')}</p>
      <OnboardingForm
        locale={localeSegment(locale)}
        labels={{
          phoneLabel: t('onboarding.phoneLabel'),
          sendCode: t('onboarding.sendCode'),
          otpTitle: t('onboarding.otpTitle'),
          otpLabel: t('onboarding.otpLabel'),
          verify: t('onboarding.verify'),
          consentTitle: t('onboarding.consentTitle'),
          consentBody: t('onboarding.consentBody'),
          consentAgree: t('onboarding.consentAgree'),
          devNotice: t('onboarding.devOtpNotice'),
          error: t('common.errorTitle'),
          messages: {
            'onboarding.tooManyRequests': t('onboarding.tooManyRequests'),
            'onboarding.phoneHelp': t('onboarding.phoneHelp'),
            'onboarding.consentBody': t('onboarding.consentBody'),
            'common.errorBody': t('common.errorBody'),
          },
        }}
      />
    </>
  );
}
