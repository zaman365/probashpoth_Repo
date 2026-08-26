import type { CurrencyCode } from '@probash/domain';

/**
 * §25 / ADR 0004 — this is a *mirror* ledger. The platform does not custody funds.
 * Accounts record what a licensed provider has confirmed and what is owed to whom;
 * they are not a claim on platform-held money.
 */
export type AccountType = 'asset' | 'liability' | 'equity' | 'income' | 'expense';

export interface LedgerAccount {
  id: string;
  /** Stable machine code, e.g. `settlement_control:BDT` or `payable:provider:org_7:BDT`. */
  code: string;
  name: string;
  type: AccountType;
  currency: CurrencyCode;
  /** Party this account tracks, when applicable. */
  ownerRef?: { kind: string; id: string };
  openedAt: string;
  closedAt?: string;
}

/** Debit-normal account types increase with debits; the rest increase with credits. */
export function isDebitNormal(type: AccountType): boolean {
  return type === 'asset' || type === 'expense';
}

export const ACCOUNT_CODES = {
  /** Mirrors funds confirmed as held in the licensed partner's settlement arrangement. */
  settlementControl: (currency: CurrencyCode) => `settlement_control:${currency}`,
  /** What the settlement arrangement owes a payee once its milestone is verified. */
  payable: (partyKind: string, partyId: string, currency: CurrencyCode) =>
    `payable:${partyKind}:${partyId}:${currency}`,
  /** What must be returned to a worker/student under a refund rule. */
  refundPayable: (userId: string, currency: CurrencyCode) => `refund_payable:${userId}:${currency}`,
  /** Platform's own disclosed fee income (§5 — always disclosed, never hidden). */
  platformFeeIncome: (currency: CurrencyCode) => `platform_fee_income:${currency}`,
} as const;
