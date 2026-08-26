import { describe, expect, it } from 'vitest';
import {
  bangladeshiPhoneSchema,
  normalizePhone,
  requestOtpSchema,
  verifyOtpSchema,
} from './identity';
import { scanOfferSchema } from './scanner';
import { createPaymentIntentSchema } from './payments';
import { createDelegationSchema } from './cases';

describe('phone identity (§17)', () => {
  it('accepts the common Bangladeshi formats', () => {
    for (const input of ['01712345678', '+8801712345678', '8801912345678']) {
      expect(bangladeshiPhoneSchema.safeParse(input).success).toBe(true);
    }
  });

  it('rejects a malformed number', () => {
    for (const input of ['0171234567', '+4915112345678', 'not a phone']) {
      expect(bangladeshiPhoneSchema.safeParse(input).success).toBe(false);
    }
  });

  it('normalizes every accepted format to E.164', () => {
    expect(normalizePhone('01712345678')).toBe('+8801712345678');
    expect(normalizePhone('+8801712345678')).toBe('+8801712345678');
    expect(normalizePhone('880 1712-345678')).toBe('+8801712345678');
  });

  it('defaults onboarding to Bangla', () => {
    expect(requestOtpSchema.parse({ phone: '01712345678' }).locale).toBe('bn-BD');
  });

  it('requires an explicit consent flag to complete sign-in', () => {
    expect(verifyOtpSchema.safeParse({ challengeId: 'c', code: '123456' }).success).toBe(false);
  });
});

describe('scanner input', () => {
  it('rejects an entirely empty scan request', () => {
    expect(scanOfferSchema.safeParse({}).success).toBe(false);
  });

  it('accepts a pasted message on its own', () => {
    expect(scanOfferSchema.safeParse({ messageText: 'Job in Qatar, pay 50000' }).success).toBe(
      true,
    );
  });
});

describe('payment safety rails', () => {
  it('requires an idempotency key on every intent', () => {
    expect(createPaymentIntentSchema.safeParse({ costItemId: 'ci_1' }).success).toBe(false);
    expect(
      createPaymentIntentSchema.safeParse({ costItemId: 'ci_1', idempotencyKey: 'k'.repeat(8) })
        .success,
    ).toBe(true);
  });
});

describe('delegation', () => {
  it('requires at least one permission — an empty grant is not a grant', () => {
    expect(
      createDelegationSchema.safeParse({
        delegatePhone: '01712345678',
        relationship: 'spouse',
        permissions: [],
      }).success,
    ).toBe(false);
  });

  it('rejects a permission outside the allowed set', () => {
    expect(
      createDelegationSchema.safeParse({
        delegatePhone: '01712345678',
        relationship: 'spouse',
        permissions: ['sign_contract'],
      }).success,
    ).toBe(false);
  });
});
