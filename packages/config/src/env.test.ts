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
      loadEnv({
        APP_ENV: 'production',
        STORAGE_DRIVER: 'postgres',
        DATABASE_URL: 'postgres://x',
        FIELD_ENCRYPTION_KEY: Buffer.from('probash-test-field-key-32-bytes!').toString('base64'),
      }),
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

  it('requires the complete Clerk contract when Clerk owns identity', () => {
    expect(() => loadEnv({ IDENTITY_PROVIDER: 'clerk' })).toThrow(/CLERK_PUBLISHABLE_KEY/);
    expect(
      loadEnv({
        IDENTITY_PROVIDER: 'clerk',
        CLERK_PUBLISHABLE_KEY: 'pk_test_example',
        CLERK_SECRET_KEY: 'sk_test_example',
        CLERK_AUTHORIZED_PARTIES: 'http://localhost:3000',
      }).IDENTITY_PROVIDER,
    ).toBe('clerk');
  });

  it('refuses to open document uploads without every Gate S3 control', () => {
    expect(() => loadEnv({ DOCUMENT_UPLOADS_ENABLED: 'true' })).toThrow(
      /Sensitive document uploads are fail-closed/,
    );
  });

  it('requires a 256-bit field encryption key for PostgreSQL records', () => {
    expect(() =>
      loadEnv({ STORAGE_DRIVER: 'postgres', DATABASE_URL: 'postgres://localhost/probash' }),
    ).toThrow(/FIELD_ENCRYPTION_KEY/);
    expect(() =>
      loadEnv({
        STORAGE_DRIVER: 'postgres',
        DATABASE_URL: 'postgres://localhost/probash',
        FIELD_ENCRYPTION_KEY: Buffer.from('short').toString('base64'),
      }),
    ).toThrow(/32 bytes/);
  });

  it('keeps unlicensed integrations switched off by default (ADR 0003, ADR 0004)', () => {
    const flags = featureFlags(loadEnv({}));
    expect(flags.liveLicensedPaymentProvider).toBe(false);
    expect(flags.liveOfficialSourceFetch).toBe(false);
  });

  it('enables deterministic P0 mobility tools but keeps operating networks gated', () => {
    const flags = featureFlags(loadEnv({}));
    expect(flags.quickCheck).toBe(true);
    expect(flags.applicationQaGate).toBe(true);
    expect(flags.mobilityRoi).toBe(true);
    expect(flags.trustCenter).toBe(true);
    expect(flags.advisorNetwork).toBe(false);
    expect(flags.moderatedCommunity).toBe(false);
    expect(flags.assistedCentres).toBe(false);

    expect(featureFlags(loadEnv({ FEATURE_QUICK_CHECK: 'false' })).quickCheck).toBe(false);
  });
});
