import { describe, expect, it } from 'vitest';
import { freshnessOf } from './sources';

const now = new Date('2026-08-25T00:00:00.000Z');
const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000).toISOString();

describe('freshness', () => {
  it('is unknown when never reviewed — never silently "fresh"', () => {
    expect(freshnessOf(undefined, 7, now)).toBe('unknown');
  });

  it('is fresh inside the cadence', () => {
    expect(freshnessOf(daysAgo(3), 7, now)).toBe('fresh');
  });

  it('is ageing up to twice the cadence', () => {
    expect(freshnessOf(daysAgo(10), 7, now)).toBe('ageing');
  });

  it('is stale beyond twice the cadence', () => {
    expect(freshnessOf(daysAgo(30), 7, now)).toBe('stale');
  });
});
