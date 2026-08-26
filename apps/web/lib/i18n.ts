import { getMessages, interpolate, lookupMessage, type MessageTree } from '@probash/i18n';
import type { Locale, LocalizedText } from '@probash/domain';

export type { Locale };

export function parseLocaleParam(segment: string): Locale {
  return segment === 'en' ? 'en' : 'bn-BD';
}

export function localeSegment(locale: Locale): 'bn' | 'en' {
  return locale === 'en' ? 'en' : 'bn';
}

export function otherLocale(locale: Locale): Locale {
  return locale === 'en' ? 'bn-BD' : 'en';
}

/**
 * ADR 0002 — no component contains a literal UI string. A missing key surfaces as
 * the key itself so it fails loudly in review instead of silently showing English.
 */
export function translator(locale: Locale) {
  return function t(key: string, values?: Record<string, string | number>): string {
    const message = lookupMessage(locale, key);
    if (message === undefined) return key;
    return values ? interpolate(message, values) : message;
  };
}

export type Translate = ReturnType<typeof translator>;

export function pick(text: LocalizedText | undefined, locale: Locale): string {
  if (!text) return '';
  return locale === 'en' ? text.en : text.bn;
}

export function messagesFor(locale: Locale): MessageTree {
  return getMessages(locale);
}
