import { InvariantViolatedError, Money } from '@probash/domain';
import type { CurrencyCode, CostItem, RefundRule, SettlementFailureMode } from '@probash/domain';
import { ACCOUNT_CODES } from './accounts';
import type { Ledger } from './journal';
import type { JournalEntry } from './journal';

/**
 * §25 — money movement is recorded only when the licensed provider confirms it,
 * and released only when a milestone is verified. Two distinct postings, never one.
 */

export interface ConfirmedPaymentInput {
  /** Provider transaction id — the evidence this posting mirrors. */
  providerTransactionId: string;
  caseId: string;
  costItemId: string;
  payeeKind: string;
  payeeId: string;
  amount: Money;
  occurredAt: string;
  idempotencyKey: string;
}

export function openCaseAccounts(
  ledger: Ledger,
  params: { currency: CurrencyCode; payeeKind: string; payeeId: string; workerUserId: string },
): void {
  const { currency, payeeKind, payeeId, workerUserId } = params;
  ledger.openAccount({
    code: ACCOUNT_CODES.settlementControl(currency),
    name: `Settlement control (${currency})`,
    type: 'asset',
    currency,
  });
  ledger.openAccount({
    code: ACCOUNT_CODES.payable(payeeKind, payeeId, currency),
    name: `Payable to ${payeeKind}:${payeeId} (${currency})`,
    type: 'liability',
    currency,
    ownerRef: { kind: payeeKind, id: payeeId },
  });
  ledger.openAccount({
    code: ACCOUNT_CODES.refundPayable(workerUserId, currency),
    name: `Refund payable to ${workerUserId} (${currency})`,
    type: 'liability',
    currency,
    ownerRef: { kind: 'user', id: workerUserId },
  });
  ledger.openAccount({
    code: ACCOUNT_CODES.platformFeeIncome(currency),
    name: `Platform fee income (${currency})`,
    type: 'income',
    currency,
  });
}

/**
 * A payer's money has reached the licensed partner's settlement arrangement.
 * It is *held for* the payee — it is not released and it is not platform money.
 */
export function recordConfirmedPayment(ledger: Ledger, input: ConfirmedPaymentInput): JournalEntry {
  const currency = input.amount.currency;
  return ledger.post({
    reference: input.providerTransactionId,
    description: `Payment confirmed for cost item ${input.costItemId}`,
    occurredAt: input.occurredAt,
    idempotencyKey: input.idempotencyKey,
    metadata: {
      caseId: input.caseId,
      costItemId: input.costItemId,
      providerTransactionId: input.providerTransactionId,
    },
    lines: [
      {
        accountCode: ACCOUNT_CODES.settlementControl(currency),
        direction: 'debit',
        amount: input.amount,
        memo: 'Funds confirmed at licensed settlement partner',
      },
      {
        accountCode: ACCOUNT_CODES.payable(input.payeeKind, input.payeeId, currency),
        direction: 'credit',
        amount: input.amount,
        memo: 'Held pending milestone verification',
      },
    ],
  });
}

export interface SettlementReleaseInput {
  settlementInstructionId: string;
  caseId: string;
  milestoneKey: string;
  payeeKind: string;
  payeeId: string;
  amount: Money;
  occurredAt: string;
  idempotencyKey: string;
  /** Guard: the caller must prove the milestone is verified before releasing. */
  milestoneVerified: boolean;
}

export function recordSettlementRelease(
  ledger: Ledger,
  input: SettlementReleaseInput,
): JournalEntry {
  if (!input.milestoneVerified) {
    throw new InvariantViolatedError('Cannot release settlement before milestone verification', {
      caseId: input.caseId,
      milestoneKey: input.milestoneKey,
    });
  }
  const currency = input.amount.currency;
  const payableCode = ACCOUNT_CODES.payable(input.payeeKind, input.payeeId, currency);
  const held = ledger.balanceOf(payableCode).balance;
  if (held.compare(input.amount) < 0) {
    throw new InvariantViolatedError('Release exceeds the amount held for this payee', {
      held: held.toDecimalString(),
      requested: input.amount.toDecimalString(),
    });
  }
  return ledger.post({
    reference: input.settlementInstructionId,
    description: `Settlement released on milestone ${input.milestoneKey}`,
    occurredAt: input.occurredAt,
    idempotencyKey: input.idempotencyKey,
    metadata: { caseId: input.caseId, milestoneKey: input.milestoneKey },
    lines: [
      {
        accountCode: payableCode,
        direction: 'debit',
        amount: input.amount,
        memo: 'Obligation discharged',
      },
      {
        accountCode: ACCOUNT_CODES.settlementControl(currency),
        direction: 'credit',
        amount: input.amount,
        memo: 'Paid out by licensed settlement partner',
      },
    ],
  });
}

export interface RefundAllocation {
  costItemId: string;
  category: string;
  paid: Money;
  refunded: Money;
  withheld: Money;
  reason: 'refund_rule' | 'category_excluded' | 'not_refundable';
}

export interface RefundComputation {
  failureMode: SettlementFailureMode;
  ruleId: string;
  currency: CurrencyCode;
  allocations: RefundAllocation[];
  totalPaid: Money;
  totalRefunded: Money;
  totalWithheld: Money;
}

/**
 * §25 — every failure mode has a deterministic allocation. Basis points avoid the
 * float rounding that quietly steals money from the person least able to notice.
 */
export function computeRefund(params: {
  rule: RefundRule;
  costItems: readonly CostItem[];
  currency: CurrencyCode;
}): RefundComputation {
  const { rule, costItems, currency } = params;
  if (rule.workerRefundBasisPoints < 0 || rule.workerRefundBasisPoints > 10_000) {
    throw new InvariantViolatedError('Refund basis points must be between 0 and 10000', {
      basisPoints: rule.workerRefundBasisPoints,
    });
  }

  const allocations: RefundAllocation[] = [];
  let totalPaid = Money.zero(currency);
  let totalRefunded = Money.zero(currency);

  for (const item of costItems) {
    if (item.status !== 'paid') continue;
    const paid = Money.fromJSON(item.amount);
    if (paid.currency !== currency) {
      throw new InvariantViolatedError('Refund computation requires a single currency', {
        expected: currency,
        found: paid.currency,
      });
    }
    totalPaid = totalPaid.add(paid);

    let refunded = Money.zero(currency);
    let reason: RefundAllocation['reason'] = 'refund_rule';
    if (!item.refundable) {
      reason = 'not_refundable';
    } else if (rule.excludeCategories.includes(item.category)) {
      reason = 'category_excluded';
    } else {
      // Floor division on integer minor units: never refund more than was paid.
      refunded = Money.ofMinor(
        (paid.minorUnits * BigInt(rule.workerRefundBasisPoints)) / 10_000n,
        currency,
      );
    }

    totalRefunded = totalRefunded.add(refunded);
    allocations.push({
      costItemId: item.id,
      category: item.category,
      paid,
      refunded,
      withheld: paid.subtract(refunded),
      reason,
    });
  }

  return {
    failureMode: rule.failureMode,
    ruleId: rule.id,
    currency,
    allocations,
    totalPaid,
    totalRefunded,
    totalWithheld: totalPaid.subtract(totalRefunded),
  };
}

export function recordRefundObligation(
  ledger: Ledger,
  input: {
    caseId: string;
    workerUserId: string;
    payeeKind: string;
    payeeId: string;
    amount: Money;
    occurredAt: string;
    idempotencyKey: string;
    reference: string;
  },
): JournalEntry {
  const currency = input.amount.currency;
  return ledger.post({
    reference: input.reference,
    description: `Refund obligation recorded for case ${input.caseId}`,
    occurredAt: input.occurredAt,
    idempotencyKey: input.idempotencyKey,
    metadata: { caseId: input.caseId },
    lines: [
      {
        accountCode: ACCOUNT_CODES.payable(input.payeeKind, input.payeeId, currency),
        direction: 'debit',
        amount: input.amount,
        memo: 'Held amount reallocated to refund',
      },
      {
        accountCode: ACCOUNT_CODES.refundPayable(input.workerUserId, currency),
        direction: 'credit',
        amount: input.amount,
        memo: 'Owed back to the worker',
      },
    ],
  });
}
