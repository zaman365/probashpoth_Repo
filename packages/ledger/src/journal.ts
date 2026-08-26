import { InvariantViolatedError, Money, uuidv7 } from '@probash/domain';
import type { CurrencyCode, MoneyJson } from '@probash/domain';
import { isDebitNormal, type AccountType, type LedgerAccount } from './accounts';

export type Direction = 'debit' | 'credit';

export interface JournalLineInput {
  accountCode: string;
  direction: Direction;
  amount: Money;
  memo?: string;
}

export interface JournalLine {
  id: string;
  entryId: string;
  accountCode: string;
  direction: Direction;
  amount: MoneyJson;
  memo?: string;
}

export interface JournalEntryInput {
  /** External reference: provider transaction id, settlement instruction id, etc. */
  reference: string;
  description: string;
  occurredAt: string;
  lines: JournalLineInput[];
  /** Required: every financial mutation is idempotent (§83, ADR 0004). */
  idempotencyKey: string;
  metadata?: Record<string, string>;
  /** Set when this entry reverses an earlier one. Corrections are never in-place edits. */
  reversesEntryId?: string;
}

export interface JournalEntry {
  id: string;
  reference: string;
  description: string;
  occurredAt: string;
  recordedAt: string;
  lines: JournalLine[];
  idempotencyKey: string;
  metadata: Record<string, string>;
  reversesEntryId?: string;
}

export function assertBalanced(lines: readonly JournalLineInput[]): void {
  if (lines.length < 2) {
    throw new InvariantViolatedError('A journal entry needs at least two lines', {
      lineCount: lines.length,
    });
  }
  const byCurrency = new Map<CurrencyCode, { debit: Money; credit: Money }>();
  for (const line of lines) {
    if (line.amount.isNegative() || line.amount.isZero()) {
      throw new InvariantViolatedError('Journal line amounts must be positive', {
        accountCode: line.accountCode,
        amount: line.amount.toDecimalString(),
      });
    }
    const bucket = byCurrency.get(line.amount.currency) ?? {
      debit: Money.zero(line.amount.currency),
      credit: Money.zero(line.amount.currency),
    };
    if (line.direction === 'debit') {
      bucket.debit = bucket.debit.add(line.amount);
    } else {
      bucket.credit = bucket.credit.add(line.amount);
    }
    byCurrency.set(line.amount.currency, bucket);
  }
  for (const [currency, bucket] of byCurrency) {
    if (!bucket.debit.equals(bucket.credit)) {
      throw new InvariantViolatedError('Journal entry does not balance', {
        currency,
        debit: bucket.debit.toDecimalString(),
        credit: bucket.credit.toDecimalString(),
      });
    }
  }
}

export interface AccountBalance {
  accountCode: string;
  type: AccountType;
  currency: CurrencyCode;
  debit: Money;
  credit: Money;
  /** Signed by the account's normal balance, so a reader never has to guess. */
  balance: Money;
}

/**
 * In-memory double-entry ledger. The persistence adapter stores the same shapes;
 * the invariants live here so they cannot be bypassed by a repository (§25).
 */
export class Ledger {
  private readonly accounts = new Map<string, LedgerAccount>();
  private readonly entries: JournalEntry[] = [];
  private readonly byIdempotencyKey = new Map<string, JournalEntry>();

  openAccount(
    account: Omit<LedgerAccount, 'id' | 'openedAt'> & { openedAt?: string },
  ): LedgerAccount {
    const existing = this.accounts.get(account.code);
    if (existing) return existing;
    const created: LedgerAccount = {
      ...account,
      id: uuidv7(),
      openedAt: account.openedAt ?? new Date().toISOString(),
    };
    this.accounts.set(created.code, created);
    return created;
  }

  getAccount(code: string): LedgerAccount | undefined {
    return this.accounts.get(code);
  }

  listAccounts(): LedgerAccount[] {
    return [...this.accounts.values()];
  }

  post(input: JournalEntryInput): JournalEntry {
    const replay = this.byIdempotencyKey.get(input.idempotencyKey);
    if (replay) return replay;

    assertBalanced(input.lines);

    for (const line of input.lines) {
      const account = this.accounts.get(line.accountCode);
      if (!account) {
        throw new InvariantViolatedError('Unknown ledger account', {
          accountCode: line.accountCode,
        });
      }
      if (account.currency !== line.amount.currency) {
        throw new InvariantViolatedError('Line currency does not match account currency', {
          accountCode: line.accountCode,
          accountCurrency: account.currency,
          lineCurrency: line.amount.currency,
        });
      }
      if (account.closedAt) {
        throw new InvariantViolatedError('Cannot post to a closed account', {
          accountCode: line.accountCode,
        });
      }
    }

    const entryId = uuidv7();
    const entry: JournalEntry = Object.freeze({
      id: entryId,
      reference: input.reference,
      description: input.description,
      occurredAt: input.occurredAt,
      recordedAt: new Date().toISOString(),
      idempotencyKey: input.idempotencyKey,
      metadata: Object.freeze({ ...(input.metadata ?? {}) }),
      reversesEntryId: input.reversesEntryId,
      lines: Object.freeze(
        input.lines.map((line) =>
          Object.freeze({
            id: uuidv7(),
            entryId,
            accountCode: line.accountCode,
            direction: line.direction,
            amount: line.amount.toJSON(),
            memo: line.memo,
          }),
        ),
      ) as JournalLine[],
    });

    this.entries.push(entry);
    this.byIdempotencyKey.set(entry.idempotencyKey, entry);
    return entry;
  }

  /** Corrections create a reversing entry. Entries are never edited or deleted (§83). */
  reverse(entryId: string, reason: string, idempotencyKey: string): JournalEntry {
    const original = this.entries.find((e) => e.id === entryId);
    if (!original) {
      throw new InvariantViolatedError('Cannot reverse an unknown entry', { entryId });
    }
    return this.post({
      reference: original.reference,
      description: `Reversal: ${reason}`,
      occurredAt: new Date().toISOString(),
      idempotencyKey,
      reversesEntryId: original.id,
      metadata: { ...original.metadata, reversalReason: reason },
      lines: original.lines.map((line) => ({
        accountCode: line.accountCode,
        direction: line.direction === 'debit' ? ('credit' as const) : ('debit' as const),
        amount: Money.fromJSON(line.amount),
        memo: line.memo,
      })),
    });
  }

  listEntries(filter?: { accountCode?: string; reference?: string }): JournalEntry[] {
    return this.entries.filter((entry) => {
      if (filter?.reference && entry.reference !== filter.reference) return false;
      if (filter?.accountCode && !entry.lines.some((l) => l.accountCode === filter.accountCode)) {
        return false;
      }
      return true;
    });
  }

  balanceOf(accountCode: string): AccountBalance {
    const account = this.accounts.get(accountCode);
    if (!account) {
      throw new InvariantViolatedError('Unknown ledger account', { accountCode });
    }
    let debit = Money.zero(account.currency);
    let credit = Money.zero(account.currency);
    for (const entry of this.entries) {
      for (const line of entry.lines) {
        if (line.accountCode !== accountCode) continue;
        const amount = Money.fromJSON(line.amount);
        if (line.direction === 'debit') debit = debit.add(amount);
        else credit = credit.add(amount);
      }
    }
    const balance = isDebitNormal(account.type) ? debit.subtract(credit) : credit.subtract(debit);
    return { accountCode, type: account.type, currency: account.currency, debit, credit, balance };
  }

  /** Sum of all debits minus all credits per currency. Must always be zero. */
  trialBalance(currency: CurrencyCode): Money {
    let net = Money.zero(currency);
    for (const entry of this.entries) {
      for (const line of entry.lines) {
        if (line.amount.currency !== currency) continue;
        const amount = Money.fromJSON(line.amount);
        net = line.direction === 'debit' ? net.add(amount) : net.subtract(amount);
      }
    }
    return net;
  }
}
