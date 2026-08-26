import Link from 'next/link';
import type { Metadata } from 'next';
import { localeSegment, parseLocaleParam, translator } from '@/lib/i18n';
import { canonicalMetadata, guideJsonLd, siteUrl } from '@/lib/seo';
import { ListenButton } from '@/components/ListenButton';

/**
 * §14.1 — scam education, and the most important page on the public site.
 *
 * The eight warning signs are the same taxonomy the scanner uses (`RiskSignalKind`),
 * so what a person reads here is exactly what the machine checks for. Each one is
 * paired with an action, because "be careful" is not advice.
 */
const WARNING_SIGNS = [
  'payment_to_personal_account',
  'guarantee_language',
  'cash_payment_requested',
  'visa_class_inconsistent',
  'agency_not_licensed',
  'cost_above_declared',
  'contract_differs_from_offer',
  'offer_document_unverifiable',
] as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: segment } = await params;
  const locale = parseLocaleParam(segment);
  const t = translator(locale);
  return canonicalMetadata({
    locale,
    path: '/safety',
    title: t('guide.safetyTitle'),
    description: t('guide.safetyIntro'),
  });
}

export function generateStaticParams() {
  return [{ locale: 'bn' }, { locale: 'en' }];
}

export default async function SafetyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: segment } = await params;
  const locale = parseLocaleParam(segment);
  const seg = localeSegment(locale);
  const t = translator(locale);

  const spoken = WARNING_SIGNS.map(
    (kind) => `${t(`risk.kind.${kind}`)}। ${t(`safety.advice.${kind}`)}`,
  ).join(' ');

  return (
    <div className="wide-page stack-lg">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: guideJsonLd({
            name: t('guide.safetyTitle'),
            description: t('guide.safetyIntro'),
            url: `${siteUrl}/${seg}/safety`,
          }),
        }}
      />

      <header className="hero">
        <div className="stack">
          <h1>{t('guide.safetyTitle')}</h1>
          <p style={{ maxWidth: '60ch' }}>{t('guide.safetyIntro')}</p>
          <ListenButton text={spoken} label={t('common.listen')} lang={locale} />
        </div>
        <div className="card stack">
          <h2 style={{ fontWeight: 600 }}>{t('guide.verifyCta')}</h2>
          <p className="muted">{t('guide.verifyCtaHelp')}</p>
          <Link href={`/${seg}/verify`} className="btn btn-primary">
            {t('scanner.checkNow')}
          </Link>
        </div>
      </header>

      <ol className="grid-cards">
        {WARNING_SIGNS.map((kind, index) => (
          <li key={kind} className="card stack">
            <span className="badge badge-danger">
              {index + 1}. {t('guide.warningSign')}
            </span>
            <p style={{ fontWeight: 600, fontSize: 'var(--font-size-body-large)' }}>
              {t(`risk.kind.${kind}`)}
            </p>
            <div className="card-muted stack">
              <span className="muted">{t('guide.whatToDo')}</span>
              <p>{t(`safety.advice.${kind}`)}</p>
            </div>
          </li>
        ))}
      </ol>

      <section className="card stack">
        <p className="badge badge-warning">{t('cost.payOnlyHere')}</p>
        <p>{t('legal.noVisaGuarantee')}</p>
        <div className="flex flex-wrap gap-2">
          <Link href={`/${seg}/verify`} className="btn btn-primary">
            {t('home.verifyOffer')}
          </Link>
          <Link href={`/${seg}/help`} className="btn btn-danger">
            {t('common.emergency')}
          </Link>
        </div>
      </section>
    </div>
  );
}
