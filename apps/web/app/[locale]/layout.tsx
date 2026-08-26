import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Noto_Sans_Bengali, Space_Grotesk } from 'next/font/google';
import '../globals.css';

/*
 * §52 — a production-grade Bangla face paired with a compatible Latin family.
 * `next/font` downloads and self-hosts both at build time, so there is no runtime
 * request to a font CDN and no layout shift on a slow connection.
 *
 * Bangla is the display face, not an afterthought: it carries the headline on every
 * page a worker sees (ADR 0002).
 */
const bengali = Noto_Sans_Bengali({
  subsets: ['bengali'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-bengali',
  display: 'swap',
});

const latin = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-latin',
  display: 'swap',
});
import { localeSegment, parseLocaleParam, translator } from '@/lib/i18n';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';

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
    <html lang={seg} dir="ltr" className={`${bengali.variable} ${latin.variable}`}>
      <body>
        <a href="#main" className="skip-link">
          {t('common.next')}
        </a>
        <SiteHeader locale={locale} productName={productName[locale]} />
        <main id="main">{children}</main>
        <SiteFooter locale={locale} productName={productName[locale]} />
      </body>
    </html>
  );
}
