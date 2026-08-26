import { describe, expect, it } from 'vitest';
import { deriveVerdict } from './risk';
import type { RiskSignal } from './risk';

const signal = (over: Partial<RiskSignal>): RiskSignal => ({
  id: 's',
  kind: 'guarantee_language',
  level: 'medium',
  title: { bn: 'x', en: 'x' },
  explanation: { bn: 'x', en: 'x' },
  advice: { bn: 'x', en: 'x' },
  evidence: {},
  raisedAt: '2026-08-25T00:00:00.000Z',
  sourceIds: [],
  ...over,
});

describe('scan verdict derivation', () => {
  it('returns VERIFIED only when everything required was checked and nothing was raised', () => {
    expect(deriveVerdict([], { checkedEverythingRequired: true })).toBe('VERIFIED');
  });

  it('never claims VERIFIED when a required check could not run', () => {
    expect(deriveVerdict([], { checkedEverythingRequired: false })).toBe(
      'UNKNOWN_HUMAN_CHECK_REQUIRED',
    );
  });

  it('escalates a critical signal to HIGH_RISK', () => {
    expect(
      deriveVerdict([signal({ level: 'critical', kind: 'payment_to_personal_account' })], {
        checkedEverythingRequired: true,
      }),
    ).toBe('HIGH_RISK');
  });

  it('reports a salary difference as MISMATCH', () => {
    expect(
      deriveVerdict([signal({ kind: 'salary_mismatch', level: 'medium' })], {
        checkedEverythingRequired: true,
      }),
    ).toBe('MISMATCH');
  });

  it('downgrades to PARTIALLY_VERIFIED when only low-severity notes exist', () => {
    expect(
      deriveVerdict([signal({ level: 'low', kind: 'guarantee_language' })], {
        checkedEverythingRequired: true,
      }),
    ).toBe('PARTIALLY_VERIFIED');
  });
});
