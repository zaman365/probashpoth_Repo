import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import '../globals.css';
import { localeSegment, parseLocaleParam, translator } from '@/lib/i18n';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { FloatingChatButton } from '@/components/FloatingChatButton';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { getProfile } from '@/db/operations';

const productName = {
  'bn-BD': process.env['PUBLIC_PRODUCT_NAME_BN'] ?? 'প্রবাসযাত্রা',
  en: process.env['PUBLIC_PRODUCT_NAME'] ?? 'ProbashJatra',
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
  const user = await getChatGPTUser();
  const profile = user ? await getProfile(user.userId) : null;

  return (
    <html lang={seg} dir="ltr">
      <body>
        <a href="#main" className="skip-link">
          {t('common.next')}
        </a>
        <SiteHeader
          locale={locale}
          productName={productName[locale]}
          user={user}
          profile={profile}
        />
        <main id="main">{children}</main>
        <SiteFooter locale={locale} productName={productName[locale]} />
        <FloatingChatButton locale={locale} />
      </body>
    </html>
  );
}
