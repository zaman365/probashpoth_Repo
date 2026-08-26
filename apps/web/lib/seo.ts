import type { Metadata } from 'next';
import type { Locale } from '@probash/domain';
import { localeSegment, otherLocale } from './i18n';

export const siteUrl = process.env['PUBLIC_BASE_URL'] ?? 'http://localhost:3000';

/**
 * §14.1 — the public surface is meant to be found. Every guide page declares its
 * canonical URL and its Bangla/English alternates, so a search engine indexes the
 * right language for the reader rather than picking one at random.
 */
export function canonicalMetadata({
  locale,
  path,
  title,
  description,
}: {
  locale: Locale;
  path: string;
  title: string;
  description: string;
}): Metadata {
  const here = `${siteUrl}/${localeSegment(locale)}${path}`;
  const there = `${siteUrl}/${localeSegment(otherLocale(locale))}${path}`;

  return {
    title,
    description,
    alternates: {
      canonical: here,
      languages: {
        bn: locale === 'bn-BD' ? here : there,
        en: locale === 'en' ? here : there,
        'x-default': `${siteUrl}/bn${path}`,
      },
    },
    openGraph: {
      title,
      description,
      url: here,
      locale: locale === 'en' ? 'en' : 'bn_BD',
      type: 'article',
    },
  };
}

/** Structured data for a guide page. Facts only — never a claim about outcomes. */
export function guideJsonLd({
  name,
  description,
  url,
}: {
  name: string;
  description: string;
  url: string;
}): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: name,
    description,
    url,
    isAccessibleForFree: true,
    inLanguage: url.includes('/en/') ? 'en' : 'bn-BD',
  });
}
