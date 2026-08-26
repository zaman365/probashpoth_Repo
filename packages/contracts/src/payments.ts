import { z } from 'zod';
import { localizedTextSchema, moneySchema } from './primitives';

/** §25 / ADR 0004 — intents are instructions to a licensed provider, not a wallet. */
export const createPaymentIntentSchema = z.object({
  costItemId: z.string(),
  method: z.enum(['bank', 'mfs', 'card']).default('mfs'),
  /** Required: replaying the same key must never create a second payment (§83). */
  idempotencyKey: z.string().min(8),
});
export type CreatePaymentIntentDto = z.infer<typeof createPaymentIntentSchema>;

export const paymentIntentSchema = z.object({
  id: z.string(),
  caseId: z.string(),
  costItemId: z.string(),
  amount: moneySchema,
  payee: z.object({
    kind: z.string(),
    id: z.string().optional(),
    name: localizedTextSchema.optional(),
  }),
  method: z.string(),
  provider: z.string(),
  status: z.enum(['created', 'pending', 'confirmed', 'failed', 'refunded', 'cancelled']),
  milestoneKey: z.string().optional(),
  createdAt: z.string(),
  confirmedAt: z.string().optional(),
  /** True while no licensed provider is live — the UI must say so (ADR 0004). */
  isSandbox: z.boolean(),
  providerReference: z.string().optional(),
});
export type PaymentIntentDto = z.infer<typeof paymentIntentSchema>;

export const paymentWebhookSchema = z.object({
  providerTransactionId: z.string(),
  paymentIntentId: z.string(),
  event: z.enum(['payment.confirmed', 'payment.failed', 'refund.completed']),
  amount: moneySchema,
  occurredAt: z.string(),
  failureReason: z.string().optional(),
});
export type PaymentWebhookDto = z.infer<typeof paymentWebhookSchema>;

/** §24 — the receipt a worker (and their family) can read, print or receive by SMS. */
export const receiptSchema = z.object({
  receiptNumber: z.string(),
  issuedAt: z.string(),
  caseId: z.string(),
  costItem: z.object({ id: z.string(), label: localizedTextSchema, category: z.string() }),
  amount: moneySchema,
  payer: localizedTextSchema,
  payee: localizedTextSchema,
  method: z.string(),
  providerReference: z.string().optional(),
  refundable: z.boolean(),
  milestoneKey: z.string().optional(),
  settlementState: z.enum(['held_until_milestone', 'released', 'refunded']),
  isSandbox: z.boolean(),
  smsText: z.object({ bn: z.string(), en: z.string() }),
});
export type ReceiptDto = z.infer<typeof receiptSchema>;

export const ledgerViewSchema = z.object({
  caseId: z.string(),
  currency: z.string().length(3),
  entries: z.array(
    z.object({
      id: z.string(),
      reference: z.string(),
      description: z.string(),
      occurredAt: z.string(),
      lines: z.array(
        z.object({
          accountCode: z.string(),
          direction: z.enum(['debit', 'credit']),
          amount: moneySchema,
          memo: z.string().optional(),
        }),
      ),
    }),
  ),
  heldForPayees: z.array(z.object({ accountCode: z.string(), balance: moneySchema })),
  trialBalance: moneySchema,
});
export type LedgerViewDto = z.infer<typeof ledgerViewSchema>;
