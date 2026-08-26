import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import '../globals.css';
import { localeSegment, parseLocaleParam, translator } from '@/lib/i18n';
import { LanguageToggle } from '@/components/LanguageToggle';
import { OfflineBanner } from '@/components/OfflineBanner';

const productName = {
  'bn-BD': process.env['PUBLIC_PRODUCT_NAME_BN'] ?? 'প্রবাস ওএস',
  en: process.env['PUBLIC_PRODUCT_NAME'] ?? 'ProbashOS',
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: segment } = await params;
  const locale = parseLocaleParam(segment);
  const t = translator(locale);
  return {
    title: `${productName[locale]} — ${t('home.safetyLine')}`,
    description: t('home.safetyLine'),
    robots: { index: true, follow: true },
  };
}

export function generateStaticParams() {
  return [{ locale: 'bn' }, { locale: 'en' }];
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: segment } = await params;
  const locale = parseLocaleParam(segment);
  const t = translator(locale);
  const seg = localeSegment(locale);

  return (
    <html lang={seg} dir="ltr">
      <body>
        <header className="site-header no-print">
          <div className="shell-wide" style={{ paddingBlock: 'var(--space-md)' }}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Link
                href={`/${seg}`}
                style={{ fontWeight: 700, fontSize: 'var(--font-size-title)' }}
              >
                {productName[locale]}
              </Link>
              <div className="flex flex-wrap items-center gap-2">
                <LanguageToggle locale={locale} />
                <Link href={`/${seg}/help`} className="btn btn-danger">
                  <span aria-hidden="true">🆘</span>
                  <span>{t('common.emergency')}</span>
                </Link>
              </div>
            </div>

            {/* §14.1 — the public knowledge surface is reachable from every page,
                without an account. */}
            <nav className="site-nav" aria-label={t('guide.countriesTitle')}>
              <Link href={`/${seg}/countries`}>{t('guide.browseCountries')}</Link>
              <Link href={`/${seg}/occupations`}>{t('guide.browseOccupations')}</Link>
              <Link href={`/${seg}/jobs`}>{t('home.findWork')}</Link>
              <Link href={`/${seg}/verify`}>{t('home.verifyOffer')}</Link>
              <Link href={`/${seg}/safety`}>{t('guide.learnSafety')}</Link>
            </nav>
            <OfflineBanner label={t('common.offline')} />
          </div>
        </header>
        <main id="main" className="shell stack-lg">
          {children}
        </main>
        <footer className="shell-wide no-print muted stack">
          <p>{t('legal.noVisaGuarantee')}</p>
          <p>{t('legal.notGovernment')}</p>
          <p>{t('legal.dataUse')}</p>
          <p className="badge badge-warning">{t('common.demoDataWarning')}</p>
        </footer>
      </body>
    </html>
  );
}
