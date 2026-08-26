import { createHmac, timingSafeEqual } from 'node:crypto';
import { type Money } from '@probash/domain';
import type { MoneyJson } from '@probash/domain';

/**
 * §42.12 / ADR 0004 — the provider port. Every licensed channel (bank, MFS, PSP,
 * card, international settlement) is an adapter behind this interface. The platform
 * never holds funds; it instructs a licensed provider and records what it confirms.
 */
export interface CreateIntentInput {
  intentId: string;
  amount: Money;
  method: string;
  payeeRef: string;
  caseRef: string;
  idempotencyKey: string;
}

export interface ProviderIntent {
  providerReference: string;
  status: 'created' | 'pending';
  /** Where the payer completes the payment, when the channel needs a redirect. */
  actionUrl?: string;
}

export interface WebhookPayload {
  providerTransactionId: string;
  paymentIntentId: string;
  event: 'payment.confirmed' | 'payment.failed' | 'refund.completed';
  amount: MoneyJson;
  occurredAt: string;
  failureReason?: string;
}

export interface PaymentProvider {
  readonly name: string;
  readonly isSandbox: boolean;
  createPaymentIntent(input: CreateIntentInput): Promise<ProviderIntent>;
  getStatus(providerReference: string): Promise<'created' | 'pending' | 'confirmed' | 'failed'>;
  refund(
    providerReference: string,
    amount: Money,
    idempotencyKey: string,
  ): Promise<{ refundReference: string }>;
  verifyWebhook(payload: WebhookPayload, signature: string): boolean;
  /** Signature over a canonical field list — never over an unstable JSON string. */
  signatureBase(payload: WebhookPayload): string;
}

/**
 * Development provider. It confirms nothing on its own: a test or an operator must
 * post a webhook, exactly as a real provider would. Nothing here imitates bKash,
 * Nagad or any real channel — faking those is forbidden in production (§42.12).
 */
export class MockPaymentProvider implements PaymentProvider {
  readonly name = 'mock';
  readonly isSandbox = true;

  constructor(private readonly webhookSecret: string) {}

  async createPaymentIntent(input: CreateIntentInput): Promise<ProviderIntent> {
    return {
      providerReference: `mock_${input.intentId}`,
      status: 'pending',
    };
  }

  async getStatus(): Promise<'pending'> {
    return 'pending';
  }

  async refund(
    providerReference: string,
    _amount: Money,
    idempotencyKey: string,
  ): Promise<{ refundReference: string }> {
    return { refundReference: `mock_refund_${providerReference}_${idempotencyKey}` };
  }

  signatureBase(payload: WebhookPayload): string {
    return [
      payload.providerTransactionId,
      payload.paymentIntentId,
      payload.event,
      payload.amount.minorUnits,
      payload.amount.currency,
      payload.occurredAt,
    ].join('|');
  }

  sign(payload: WebhookPayload): string {
    return createHmac('sha256', this.webhookSecret)
      .update(this.signatureBase(payload))
      .digest('hex');
  }

  verifyWebhook(payload: WebhookPayload, signature: string): boolean {
    const expected = Buffer.from(this.sign(payload));
    const actual = Buffer.from(signature ?? '');
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  }
}
