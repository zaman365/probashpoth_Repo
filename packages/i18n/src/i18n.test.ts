import { describe, expect, it } from 'vitest';
import { flattenMessages, getMessages, lookupMessage, messageKeys } from './messages';
import {
  CRITICAL_KEY_PREFIXES,
  criticalKeys,
  criticalReviewViolations,
  isCriticalKey,
  statusOf,
} from './critical';
import { formatMoney, interpolate, toBengaliNumerals } from './format';
import { Money } from '@probash/domain';

describe('message catalogues', () => {
  it('has identical key sets in Bangla and English', () => {
    expect(messageKeys('bn-BD')).toEqual(messageKeys('en'));
  });

  it('has no empty strings', () => {
    for (const locale of ['bn-BD', 'en'] as const) {
      const empties = Object.entries(flattenMessages(getMessages(locale)))
        .filter(([, value]) => value.trim().length === 0)
        .map(([key]) => key);
      expect(empties).toEqual([]);
    }
  });

  it('never promises a visa anywhere in either catalogue (§74)', () => {
    const forbidden = [
      /guaranteed visa/i,
      /100% (visa|chance)/i,
      /visa guarantee/i,
      /ভিসা নিশ্চয়তা/,
    ];
    for (const locale of ['bn-BD', 'en'] as const) {
      for (const [key, value] of Object.entries(flattenMessages(getMessages(locale)))) {
        // The scam-warning strings quote the phrase in order to warn about it.
        if (key.startsWith('risk.') || key.startsWith('legal.')) continue;
        for (const pattern of forbidden) {
          expect(`${key}: ${value}`).not.toMatch(pattern);
        }
      }
    }
  });

  it('returns undefined for an unknown key instead of falling back to English', () => {
    expect(lookupMessage('bn-BD', 'nope.not.here')).toBeUndefined();
  });

  it('keeps the Bangla home actions from §15', () => {
    expect(lookupMessage('bn-BD', 'home.findWork')).toBe('বিদেশে কাজ খুঁজুন');
    expect(lookupMessage('bn-BD', 'cost.payOnlyHere')).toContain('টাকা দেবেন না');
  });
});

describe('critical copy governance', () => {
  it('classifies money, payment, legal and risk copy as critical', () => {
    expect(isCriticalKey('cost.refundable')).toBe(true);
    expect(isCriticalKey('payment.custodyNotice')).toBe(true);
    expect(isCriticalKey('home.findWork')).toBe(false);
  });

  it('finds every critical prefix in the catalogue — no dead governance rules', () => {
    const keys = Object.keys(flattenMessages(getMessages('bn-BD')));
    for (const prefix of CRITICAL_KEY_PREFIXES) {
      expect(keys.some((key) => key.startsWith(prefix))).toBe(true);
    }
  });

  it('reports unreviewed Bangla critical copy rather than silently passing', () => {
    const violations = criticalReviewViolations('bn-BD');
    // Every critical key is currently an unreviewed draft; this is tracked debt and
    // the production release gate blocks on it (ADR 0002).
    expect(violations.map((v) => v.key)).toEqual(criticalKeys('bn-BD'));
  });

  it('treats reviewed English copy as reviewed', () => {
    expect(statusOf('en', 'cost.refundable')).toBe('human_reviewed');
    expect(criticalReviewViolations('en')).toEqual([]);
  });
});

describe('formatting', () => {
  it('renders BDT as ৳ with western grouping (§16)', () => {
    expect(formatMoney(Money.parse('120000', 'BDT'), { compactMinorUnits: true })).toBe(
      '৳ 120,000',
    );
  });

  it('keeps minor units when they matter', () => {
    expect(formatMoney(Money.parse('1200.50', 'BDT'))).toBe('৳ 1,200.50');
  });

  it('falls back to the ISO code for currencies without a symbol', () => {
    expect(formatMoney(Money.parse('2500', 'SAR'), { compactMinorUnits: true })).toBe('SAR 2,500');
  });

  it('supports Bengali numerals as a preference', () => {
    expect(toBengaliNumerals('120,000')).toBe('১২০,০০০');
  });

  it('marks negative amounts unambiguously', () => {
    expect(formatMoney(Money.parse('-500', 'BDT'), { compactMinorUnits: true })).toBe('−৳ 500');
  });

  it('interpolates ICU-style placeholders', () => {
    expect(interpolate('Step {current} of {total}', { current: 2, total: 8 })).toBe('Step 2 of 8');
  });

  it('leaves unknown placeholders visible instead of printing undefined', () => {
    expect(interpolate('Hello {name}', {})).toBe('Hello {name}');
  });
});
