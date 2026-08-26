import { beforeEach, describe, expect, it } from 'vitest';
import { InvariantViolatedError, Money } from '@probash/domain';
import type { CostItem, RefundRule } from '@probash/domain';
import { ACCOUNT_CODES } from './accounts';
import { Ledger } from './journal';
import {
  computeRefund,
  openCaseAccounts,
  recordConfirmedPayment,
  recordRefundObligation,
  recordSettlementRelease,
} from './settlement';

const BDT = 'BDT';
const bdt = (major: string) => Money.parse(major, BDT);

describe('double-entry ledger', () => {
  let ledger: Ledger;

  beforeEach(() => {
    ledger = new Ledger();
    openCaseAccounts(ledger, {
      currency: BDT,
      payeeKind: 'provider',
      payeeId: 'org_medical',
      workerUserId: 'user_1',
    });
  });

  const confirm = (amount: string, key = 'idem-1') =>
    recordConfirmedPayment(ledger, {
      providerTransactionId: 'ptx_1',
      caseId: 'case_1',
      costItemId: 'ci_1',
      payeeKind: 'provider',
      payeeId: 'org_medical',
      amount: bdt(amount),
      occurredAt: '2026-08-25T10:00:00.000Z',
      idempotencyKey: key,
    });

  it('keeps the trial balance at zero after every posting', () => {
    confirm('5000.00');
    expect(ledger.trialBalance(BDT).isZero()).toBe(true);
  });

  it('holds a confirmed payment as a liability to the payee, not as platform income', () => {
    confirm('5000.00');
    expect(
      ledger
        .balanceOf(ACCOUNT_CODES.payable('provider', 'org_medical', BDT))
        .balance.toDecimalString(),
    ).toBe('5000.00');
    expect(ledger.balanceOf(ACCOUNT_CODES.platformFeeIncome(BDT)).balance.isZero()).toBe(true);
  });

  it('treats a replayed idempotency key as the same entry, not a second posting', () => {
    const first = confirm('5000.00', 'same-key');
    const second = confirm('5000.00', 'same-key');
    expect(second.id).toBe(first.id);
    expect(ledger.listEntries()).toHaveLength(1);
  });

  it('refuses an unbalanced entry', () => {
    expect(() =>
      ledger.post({
        reference: 'r',
        description: 'broken',
        occurredAt: '2026-08-25T10:00:00.000Z',
        idempotencyKey: 'broken-1',
        lines: [
          {
            accountCode: ACCOUNT_CODES.settlementControl(BDT),
            direction: 'debit',
            amount: bdt('10'),
          },
          {
            accountCode: ACCOUNT_CODES.payable('provider', 'org_medical', BDT),
            direction: 'credit',
            amount: bdt('9'),
          },
        ],
      }),
    ).toThrow(InvariantViolatedError);
  });

  it('refuses a posting to an unknown account', () => {
    expect(() =>
      ledger.post({
        reference: 'r',
        description: 'ghost account',
        occurredAt: '2026-08-25T10:00:00.000Z',
        idempotencyKey: 'ghost-1',
        lines: [
          { accountCode: 'does_not_exist', direction: 'debit', amount: bdt('10') },
          {
            accountCode: ACCOUNT_CODES.payable('provider', 'org_medical', BDT),
            direction: 'credit',
            amount: bdt('10'),
          },
        ],
      }),
    ).toThrow(InvariantViolatedError);
  });

  it('refuses zero and negative amounts', () => {
    expect(() =>
      ledger.post({
        reference: 'r',
        description: 'zero',
        occurredAt: '2026-08-25T10:00:00.000Z',
        idempotencyKey: 'zero-1',
        lines: [
          {
            accountCode: ACCOUNT_CODES.settlementControl(BDT),
            direction: 'debit',
            amount: bdt('0'),
          },
          {
            accountCode: ACCOUNT_CODES.payable('provider', 'org_medical', BDT),
            direction: 'credit',
            amount: bdt('0'),
          },
        ],
      }),
    ).toThrow(InvariantViolatedError);
  });

  it('will not release settlement before the milestone is verified', () => {
    confirm('5000.00');
    expect(() =>
      recordSettlementRelease(ledger, {
        settlementInstructionId: 'si_1',
        caseId: 'case_1',
        milestoneKey: 'medical_complete',
        payeeKind: 'provider',
        payeeId: 'org_medical',
        amount: bdt('5000.00'),
        occurredAt: '2026-08-26T10:00:00.000Z',
        idempotencyKey: 'rel-1',
        milestoneVerified: false,
      }),
    ).toThrow(/milestone verification/i);
  });

  it('will not release more than is held for the payee', () => {
    confirm('5000.00');
    expect(() =>
      recordSettlementRelease(ledger, {
        settlementInstructionId: 'si_1',
        caseId: 'case_1',
        milestoneKey: 'medical_complete',
        payeeKind: 'provider',
        payeeId: 'org_medical',
        amount: bdt('6000.00'),
        occurredAt: '2026-08-26T10:00:00.000Z',
        idempotencyKey: 'rel-2',
        milestoneVerified: true,
      }),
    ).toThrow(/exceeds/i);
  });

  it('clears the payable when a verified milestone releases settlement', () => {
    confirm('5000.00');
    recordSettlementRelease(ledger, {
      settlementInstructionId: 'si_1',
      caseId: 'case_1',
      milestoneKey: 'medical_complete',
      payeeKind: 'provider',
      payeeId: 'org_medical',
      amount: bdt('5000.00'),
      occurredAt: '2026-08-26T10:00:00.000Z',
      idempotencyKey: 'rel-3',
      milestoneVerified: true,
    });
    expect(
      ledger.balanceOf(ACCOUNT_CODES.payable('provider', 'org_medical', BDT)).balance.isZero(),
    ).toBe(true);
    expect(ledger.trialBalance(BDT).isZero()).toBe(true);
  });

  it('corrects mistakes with a reversing entry and leaves the original intact', () => {
    const entry = confirm('5000.00');
    ledger.reverse(entry.id, 'provider reported a duplicate', 'rev-1');
    expect(ledger.listEntries()).toHaveLength(2);
    expect(ledger.balanceOf(ACCOUNT_CODES.settlementControl(BDT)).balance.isZero()).toBe(true);
    expect(ledger.listEntries()[0]?.id).toBe(entry.id);
  });

  it('moves a held amount to the worker when a refund obligation is recorded', () => {
    confirm('5000.00');
    recordRefundObligation(ledger, {
      caseId: 'case_1',
      workerUserId: 'user_1',
      payeeKind: 'provider',
      payeeId: 'org_medical',
      amount: bdt('5000.00'),
      occurredAt: '2026-08-27T10:00:00.000Z',
      idempotencyKey: 'ref-1',
      reference: 'refund_1',
    });
    expect(
      ledger.balanceOf(ACCOUNT_CODES.refundPayable('user_1', BDT)).balance.toDecimalString(),
    ).toBe('5000.00');
    expect(ledger.trialBalance(BDT).isZero()).toBe(true);
  });
});

describe('refund computation', () => {
  const item = (over: Partial<CostItem>): CostItem => ({
    id: 'ci',
    caseId: 'case_1',
    category: 'medical_fee',
    label: { bn: 'x', en: 'x' },
    amount: bdt('1000.00').toJSON(),
    payer: { kind: 'worker' },
    payee: { kind: 'provider' },
    legallyAllowed: true,
    refundable: true,
    mandatory: true,
    receiptRequired: true,
    status: 'paid',
    sourceIds: [],
    ...over,
  });

  const rule = (over: Partial<RefundRule> = {}): RefundRule => ({
    id: 'refund_visa_refusal',
    failureMode: 'visa_refusal',
    workerRefundBasisPoints: 10_000,
    excludeCategories: ['government_fee'],
    description: { bn: 'x', en: 'x' },
    sourceIds: [],
    ...over,
  });

  it('refunds fully when the rule says 100% and the item is refundable', () => {
    const result = computeRefund({ rule: rule(), costItems: [item({})], currency: BDT });
    expect(result.totalRefunded.toDecimalString()).toBe('1000.00');
  });

  it('withholds consumed government fees', () => {
    const result = computeRefund({
      rule: rule(),
      costItems: [item({ id: 'gov', category: 'government_fee' })],
      currency: BDT,
    });
    expect(result.totalRefunded.isZero()).toBe(true);
    expect(result.allocations[0]?.reason).toBe('category_excluded');
  });

  it('never refunds an item marked non-refundable', () => {
    const result = computeRefund({
      rule: rule(),
      costItems: [item({ refundable: false })],
      currency: BDT,
    });
    expect(result.allocations[0]?.reason).toBe('not_refundable');
  });

  it('ignores items that were never paid', () => {
    const result = computeRefund({
      rule: rule(),
      costItems: [item({ status: 'due' }), item({ id: 'paid', status: 'paid' })],
      currency: BDT,
    });
    expect(result.totalPaid.toDecimalString()).toBe('1000.00');
  });

  it('rounds partial refunds down to the minor unit, never up', () => {
    const result = computeRefund({
      rule: rule({ workerRefundBasisPoints: 3_333 }),
      costItems: [item({ amount: bdt('100.01').toJSON() })],
      currency: BDT,
    });
    // 10001 minor units * 3333 / 10000 = 3333.6 -> 3333
    expect(result.totalRefunded.minorUnits).toBe(3333n);
    expect(result.totalWithheld.minorUnits).toBe(6668n);
  });

  it('rejects a rule with impossible basis points', () => {
    expect(() =>
      computeRefund({
        rule: rule({ workerRefundBasisPoints: 12_000 }),
        costItems: [item({})],
        currency: BDT,
      }),
    ).toThrow(InvariantViolatedError);
  });
});
