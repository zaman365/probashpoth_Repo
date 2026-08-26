import { Money } from '@probash/domain';
import type { Locale, MoneyJson } from '@probash/domain';

/** §16 — currency is never obscured; the code is always available to the reader. */
const CURRENCY_SYMBOLS: Readonly<Record<string, string>> = {
  BDT: '৳',
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
};

export type NumeralSystem = 'latin' | 'bengali';

const BENGALI_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

export function toBengaliNumerals(input: string): string {
  return input.replace(/[0-9]/g, (d) => BENGALI_DIGITS[Number(d)]!);
}

export interface FormatMoneyOptions {
  locale?: Locale;
  numerals?: NumeralSystem;
  /** Show the ISO code alongside the symbol, e.g. "৳ 120,000 BDT". */
  withCode?: boolean;
  /** Hide minor units when they are zero — easier to read aloud. */
  compactMinorUnits?: boolean;
}

/**
 * Renders `৳ 120,000` by default (§16). Grouping stays Western because that is what
 * the blueprint's reference rendering uses and what most Bangladeshi phone keyboards
 * and SMS receipts show; Bengali numerals are available as a user preference.
 */
export function formatMoney(money: Money | MoneyJson, options: FormatMoneyOptions = {}): string {
  const value = money instanceof Money ? money : Money.fromJSON(money);
  const decimal = value.toDecimalString();
  const negative = decimal.startsWith('-');
  const [whole = '0', fraction] = decimal.replace('-', '').split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const showFraction = fraction && !(options.compactMinorUnits && /^0+$/.test(fraction));
  let rendered = showFraction ? `${grouped}.${fraction}` : grouped;
  if (options.numerals === 'bengali') rendered = toBengaliNumerals(rendered);
  const symbol = CURRENCY_SYMBOLS[value.currency];
  const head = symbol ? `${symbol} ` : `${value.currency} `;
  const tail = options.withCode && symbol ? ` ${value.currency}` : '';
  return `${negative ? '−' : ''}${head}${rendered}${tail}`;
}

export function formatDate(iso: string, locale: Locale = 'bn-BD'): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'bn-BD', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Dhaka',
  }).format(date);
}

export function formatRelativeDays(days: number, locale: Locale = 'bn-BD'): string {
  const rtf = new Intl.RelativeTimeFormat(locale === 'en' ? 'en' : 'bn', { numeric: 'auto' });
  return rtf.format(days, 'day');
}

/** Interpolate ICU-style simple placeholders: "Step {current} of {total}". */
export function interpolate(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}
