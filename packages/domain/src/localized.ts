/**
 * Localized content is data, never a hard-coded string (ADR 0002).
 * Bangla is required; English is required for institutional surfaces and audit.
 */
export interface LocalizedText {
  bn: string;
  en: string;
}

export type Locale = 'bn-BD' | 'en';

export const DEFAULT_LOCALE: Locale = 'bn-BD';
export const SUPPORTED_LOCALES: readonly Locale[] = ['bn-BD', 'en'] as const;

export function localize(text: LocalizedText, locale: Locale): string {
  return locale === 'en' ? text.en : text.bn;
}

/** Short locale segment used in public URLs: /bn/... and /en/... (§16). */
export function localeSegment(locale: Locale): 'bn' | 'en' {
  return locale === 'en' ? 'en' : 'bn';
}

export function parseLocaleSegment(segment: string): Locale {
  return segment === 'en' ? 'en' : 'bn-BD';
}
