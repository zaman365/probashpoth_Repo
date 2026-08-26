import { formatDate, formatMoney } from '@probash/i18n';
import type { Locale } from '@probash/domain';

export interface MoneyLike {
  minorUnits: string;
  currency: string;
}

/** §15 — amounts are rendered prominently and never abbreviated into ambiguity. */
export function money(value: MoneyLike | undefined, locale: Locale): string {
  if (!value) return '—';
  return formatMoney(value, {
    locale,
    compactMinorUnits: true,
    withCode: value.currency !== 'BDT',
  });
}

export function date(iso: string | undefined, locale: Locale): string {
  if (!iso) return '—';
  return formatDate(iso, locale);
}

export function daysUntil(iso: string | undefined): number | undefined {
  if (!iso) return undefined;
  const diff = Date.parse(iso) - Date.now();
  if (Number.isNaN(diff)) return undefined;
  return Math.ceil(diff / 86_400_000);
}
