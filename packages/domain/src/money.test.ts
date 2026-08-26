import { describe, expect, it } from 'vitest';
import { Money } from './money';
import { InvariantViolatedError } from './errors';

describe('Money', () => {
  it('parses major units exactly without floating point drift', () => {
    expect(Money.parse('120000.55', 'BDT').minorUnits).toBe(12000055n);
    expect(Money.parse('0.1', 'BDT').add(Money.parse('0.2', 'BDT')).toDecimalString()).toBe('0.30');
  });

  it('respects zero-decimal currencies', () => {
    expect(Money.parse('45000', 'KRW').minorUnits).toBe(45000n);
    expect(Money.parse('45000', 'KRW').toDecimalString()).toBe('45000');
    expect(() => Money.parse('45000.5', 'JPY')).toThrow(InvariantViolatedError);
  });

  it('handles three-decimal currencies', () => {
    expect(Money.parse('120.500', 'KWD').minorUnits).toBe(120500n);
  });

  it('refuses to mix currencies', () => {
    expect(() => Money.parse('10', 'BDT').add(Money.parse('10', 'SAR'))).toThrow(
      InvariantViolatedError,
    );
  });

  it('refuses fractional multiplication', () => {
    expect(() => Money.parse('10', 'BDT').multiply(1.5)).toThrow(InvariantViolatedError);
  });

  it('round-trips through JSON without precision loss', () => {
    const original = Money.parse('999999999999.99', 'BDT');
    expect(Money.fromJSON(JSON.parse(JSON.stringify(original))).equals(original)).toBe(true);
  });

  it('formats negatives correctly', () => {
    expect(Money.parse('-1200.05', 'BDT').toDecimalString()).toBe('-1200.05');
  });

  it('rejects unknown currencies rather than guessing an exponent', () => {
    expect(() => Money.parse('10', 'XYZ')).toThrow(InvariantViolatedError);
  });
});
