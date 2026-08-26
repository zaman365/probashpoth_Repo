import { InvariantViolatedError } from './errors';

/**
 * Money is integer minor units + ISO 4217 code (§83: Decimal for money, never float).
 * All arithmetic is exact; every operation requires matching currencies.
 */
export type CurrencyCode = string;

/** Minor-unit exponents for the currencies the platform quotes (§16). */
const CURRENCY_EXPONENTS: Readonly<Record<string, number>> = Object.freeze({
  BDT: 2,
  USD: 2,
  EUR: 2,
  GBP: 2,
  CAD: 2,
  AUD: 2,
  NZD: 2,
  SAR: 2,
  QAR: 2,
  AED: 2,
  SGD: 2,
  MYR: 2,
  OMR: 3,
  BHD: 3,
  KWD: 3,
  JOD: 3,
  KRW: 0,
  JPY: 0,
});

export function currencyExponent(currency: CurrencyCode): number {
  const exp = CURRENCY_EXPONENTS[currency.toUpperCase()];
  if (exp === undefined) {
    throw new InvariantViolatedError(`Unknown currency exponent: ${currency}`, { currency });
  }
  return exp;
}

export interface MoneyJson {
  /** Integer minor units serialized as a string so JSON never rounds it. */
  minorUnits: string;
  currency: CurrencyCode;
}

export class Money {
  readonly minorUnits: bigint;
  readonly currency: CurrencyCode;

  private constructor(minorUnits: bigint, currency: CurrencyCode) {
    this.minorUnits = minorUnits;
    this.currency = currency.toUpperCase();
    Object.freeze(this);
  }

  static ofMinor(minorUnits: bigint | number | string, currency: CurrencyCode): Money {
    const value = typeof minorUnits === 'bigint' ? minorUnits : BigInt(minorUnits);
    currencyExponent(currency);
    return new Money(value, currency);
  }

  /**
   * Parse a major-unit decimal string ("120000.50"). Strings only: a float literal
   * has already lost precision by the time it reaches us.
   */
  static parse(major: string, currency: CurrencyCode): Money {
    const exp = currencyExponent(currency);
    const trimmed = major.trim().replace(/,/g, '');
    if (!/^-?\d+(\.\d+)?$/.test(trimmed)) {
      throw new InvariantViolatedError(`Invalid money literal: ${major}`, { major, currency });
    }
    const negative = trimmed.startsWith('-');
    const [whole = '0', fraction = ''] = trimmed.replace('-', '').split('.');
    if (fraction.length > exp) {
      throw new InvariantViolatedError(`Too many decimal places for ${currency}: ${major}`, {
        major,
        currency,
        allowed: exp,
      });
    }
    const padded = fraction.padEnd(exp, '0');
    const minor = BigInt(whole + padded) * (negative ? -1n : 1n);
    return new Money(minor, currency);
  }

  static zero(currency: CurrencyCode): Money {
    return Money.ofMinor(0n, currency);
  }

  private assertSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new InvariantViolatedError('Cannot combine different currencies', {
        left: this.currency,
        right: other.currency,
      });
    }
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.minorUnits + other.minorUnits, this.currency);
  }

  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.minorUnits - other.minorUnits, this.currency);
  }

  /** Multiply by an integer count (e.g. 3 medical tests). No fractional factors. */
  multiply(factor: bigint | number): Money {
    if (typeof factor === 'number' && !Number.isInteger(factor)) {
      throw new InvariantViolatedError('Money can only be multiplied by an integer factor', {
        factor,
      });
    }
    const f = typeof factor === 'bigint' ? factor : BigInt(factor);
    return new Money(this.minorUnits * f, this.currency);
  }

  negate(): Money {
    return new Money(-this.minorUnits, this.currency);
  }

  isZero(): boolean {
    return this.minorUnits === 0n;
  }

  isNegative(): boolean {
    return this.minorUnits < 0n;
  }

  compare(other: Money): -1 | 0 | 1 {
    this.assertSameCurrency(other);
    if (this.minorUnits < other.minorUnits) return -1;
    if (this.minorUnits > other.minorUnits) return 1;
    return 0;
  }

  equals(other: Money): boolean {
    return this.currency === other.currency && this.minorUnits === other.minorUnits;
  }

  /** Major-unit decimal string, exact. Display formatting happens in i18n. */
  toDecimalString(): string {
    const exp = currencyExponent(this.currency);
    const negative = this.minorUnits < 0n;
    const abs = (negative ? -this.minorUnits : this.minorUnits).toString().padStart(exp + 1, '0');
    if (exp === 0) return `${negative ? '-' : ''}${abs}`;
    const whole = abs.slice(0, abs.length - exp);
    const fraction = abs.slice(abs.length - exp);
    return `${negative ? '-' : ''}${whole}.${fraction}`;
  }

  toJSON(): MoneyJson {
    return { minorUnits: this.minorUnits.toString(), currency: this.currency };
  }

  static fromJSON(json: MoneyJson): Money {
    return Money.ofMinor(BigInt(json.minorUnits), json.currency);
  }

  static sum(items: readonly Money[], currency: CurrencyCode): Money {
    return items.reduce((acc, item) => acc.add(item), Money.zero(currency));
  }
}

/**
 * A converted amount must always carry its rate provenance (§16: never obscure
 * currency, always show exchange-rate timestamp and source).
 */
export interface ConvertedAmount {
  original: MoneyJson;
  converted: MoneyJson;
  rate: string;
  rateSource: string;
  rateRetrievedAt: string;
}
