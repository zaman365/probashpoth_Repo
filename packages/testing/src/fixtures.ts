import { createHmac } from 'node:crypto';
import type { LocalizedText, MoneyJson } from '@probash/domain';

/**
 * @probash/testing — shared fixtures.
 *
 * Two rules hold here (§50, §64):
 * - test data is synthetic and obviously so;
 * - no fixture may contain a real person's phone number, NID or passport number.
 */

/**
 * Phone numbers reserved for tests. They are valid Bangladeshi mobile formats so the
 * boundary validation is genuinely exercised, drawn from a fixed block so a fixture
 * can never collide with a real subscriber in a staging environment.
 */
export function syntheticPhone(index: number): string {
  if (!Number.isInteger(index) || index < 0 || index > 999) {
    throw new Error('syntheticPhone index must be an integer between 0 and 999');
  }
  return `017000${String(index).padStart(5, '0')}`;
}

export function localized(en: string, bn = `${en} (বাংলা)`): LocalizedText {
  return { bn, en };
}

export function bdt(minorUnits: string | number | bigint): MoneyJson {
  return { minorUnits: String(minorUnits), currency: 'BDT' };
}

export interface WebhookFixture {
  providerTransactionId: string;
  paymentIntentId: string;
  event: 'payment.confirmed' | 'payment.failed' | 'refund.completed';
  amount: MoneyJson;
  occurredAt: string;
}

/**
 * Builds a provider webhook body plus its signature, using the same canonical field
 * list the mock provider signs (ADR 0004). Tests that hand-roll this drift silently.
 */
export function signedWebhook(
  fixture: WebhookFixture,
  secret: string,
): { body: WebhookFixture; signature: string } {
  const base = [
    fixture.providerTransactionId,
    fixture.paymentIntentId,
    fixture.event,
    fixture.amount.minorUnits,
    fixture.amount.currency,
    fixture.occurredAt,
  ].join('|');
  return {
    body: fixture,
    signature: createHmac('sha256', secret).update(base).digest('hex'),
  };
}

/** A PDF whose magic bytes are real, so file-type validation is actually tested. */
export function fakePdf(bytes = 64): Buffer {
  return Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.alloc(bytes, 0x20)]);
}
