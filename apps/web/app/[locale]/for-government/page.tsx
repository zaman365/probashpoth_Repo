import type { Metadata } from 'next';
import { parseLocaleParam, translator } from '@/lib/i18n';
import { canonicalMetadata } from '@/lib/seo';
import { OrganizationPage } from '@/components/OrganizationPage';

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
    path: '/for-government',
    title: t('site.orgGovernment'),
    description: t('site.orgGovernmentBody'),
  });
}

export function generateStaticParams() {
  return [{ locale: 'bn' }, { locale: 'en' }];
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: segment } = await params;
  const locale = parseLocaleParam(segment);
  const t = translator(locale);
  return (
    <OrganizationPage
      locale={locale}
      title={t('site.orgGovernment')}
      body={t('site.orgGovernmentBody')}
      requirements={t('site.orgGovernmentNeed')}
    />
  );
}
