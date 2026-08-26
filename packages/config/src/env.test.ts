import { describe, expect, it } from 'vitest';
import { ConfigurationError, featureFlags, loadEnv, productIdentity } from './env';

describe('environment loading', () => {
  it('defaults to a Bangla-first development configuration', () => {
    const env = loadEnv({});
    expect(env.DEFAULT_LOCALE).toBe('bn-BD');
    expect(env.APP_ENV).toBe('development');
    expect(env.STORAGE_DRIVER).toBe('memory');
  });

  it('keeps the product name configurable', () => {
    const env = loadEnv({ PUBLIC_PRODUCT_NAME: 'Nirapod', PUBLIC_PRODUCT_NAME_BN: 'নিরাপদ' });
    expect(productIdentity(env)).toEqual({ nameEn: 'Nirapod', nameBn: 'নিরাপদ' });
  });

  it('refuses development placeholder secrets in production', () => {
    expect(() =>
      loadEnv({ APP_ENV: 'production', STORAGE_DRIVER: 'postgres', DATABASE_URL: 'postgres://x' }),
    ).toThrow(ConfigurationError);
  });

  it('refuses the in-memory store outside development', () => {
    expect(() =>
      loadEnv({
        APP_ENV: 'staging',
        SESSION_SIGNING_KEY: 'a-real-key-value',
        QR_SIGNING_KEY: 'another-real-key',
        PAYMENT_WEBHOOK_SECRET: 'a-real-webhook-secret',
        STORAGE_DRIVER: 'memory',
      }),
    ).toThrow(/memory/);
  });

  it('requires DATABASE_URL when the postgres driver is selected', () => {
    expect(() => loadEnv({ STORAGE_DRIVER: 'postgres' })).toThrow(/DATABASE_URL/);
  });

  it('keeps unlicensed integrations switched off by default (ADR 0003, ADR 0004)', () => {
    const flags = featureFlags(loadEnv({}));
    expect(flags.liveLicensedPaymentProvider).toBe(false);
    expect(flags.liveOfficialSourceFetch).toBe(false);
  });
});
