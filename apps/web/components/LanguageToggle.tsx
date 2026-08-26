import Link from 'next/link';
import type { Locale } from '@probash/domain';
import { localeSegment, otherLocale, translator } from '@/lib/i18n';

/** §16 — the language switch is always present and never buried in a settings page. */
export function LanguageToggle({ locale, path = '' }: { locale: Locale; path?: string }) {
  const t = translator(locale);
  const target = otherLocale(locale);
  return (
    <Link
      href={`/${localeSegment(target)}${path}`}
      className="btn btn-secondary no-print"
      hrefLang={localeSegment(target)}
    >
      <span aria-hidden="true">🌐</span>
      <span>{target === 'en' ? t('common.switchToEnglish') : t('common.switchToBangla')}</span>
    </Link>
  );
}
