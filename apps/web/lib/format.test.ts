import { describe, expect, it } from 'vitest';
import { daysUntil, money } from './format';
import { parseLocaleParam, pick, translator } from './i18n';

describe('money rendering', () => {
  it('renders BDT with the taka sign and no stray decimals', () => {
    expect(money({ minorUnits: '1075000', currency: 'BDT' }, 'bn-BD')).toBe('৳ 10,750');
  });

  it('always shows the ISO code for a non-BDT currency (§16)', () => {
    expect(money({ minorUnits: '180000', currency: 'QAR' }, 'bn-BD')).toContain('QAR');
  });

  it('shows an em dash rather than zero when an amount is unknown', () => {
    expect(money(undefined, 'bn-BD')).toBe('—');
  });
});

describe('locale handling', () => {
  it('treats anything that is not "en" as Bangla', () => {
    expect(parseLocaleParam('bn')).toBe('bn-BD');
    expect(parseLocaleParam('fr')).toBe('bn-BD');
    expect(parseLocaleParam('en')).toBe('en');
  });

  it('resolves copy from the shared catalogue', () => {
    expect(translator('bn-BD')('home.findWork')).toBe('বিদেশে কাজ খুঁজুন');
    expect(translator('en')('home.findWork')).toBe('Find work abroad');
  });

  it('surfaces a missing key instead of silently falling back to English', () => {
    expect(translator('bn-BD')('does.not.exist')).toBe('does.not.exist');
  });

  it('picks the right side of a localized text', () => {
    expect(pick({ bn: 'বাংলা', en: 'English' }, 'bn-BD')).toBe('বাংলা');
    expect(pick(undefined, 'en')).toBe('');
  });
});

describe('deadlines', () => {
  it('counts whole days ahead', () => {
    const soon = new Date(Date.now() + 3 * 86_400_000).toISOString();
    expect(daysUntil(soon)).toBe(3);
  });
});
