import { z } from 'zod';

/**
 * §0 — the brand name is configurable; nothing hard-codes it.
 * §83 — configuration is validated at the boundary, and an invalid production
 * configuration fails at startup rather than at the first payment.
 */
export const envSchema = z.object({
  APP_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  PUBLIC_BASE_URL: z.string().url().default('http://localhost:3000'),
  API_BASE_URL: z.string().url().default('http://localhost:3001'),
  PORT: z.coerce.number().int().positive().default(3001),
  DEFAULT_LOCALE: z.enum(['bn-BD', 'en']).default('bn-BD'),
  PUBLIC_PRODUCT_NAME: z.string().min(1).default('ProbashJatra'),
  PUBLIC_PRODUCT_NAME_BN: z.string().min(1).default('প্রবাসযাত্রা'),

  STORAGE_DRIVER: z.enum(['memory', 'postgres']).default('memory'),
  DATABASE_URL: z.string().optional(),
  REDIS_URL: z.string().optional(),

  SESSION_SIGNING_KEY: z.string().min(8).default('dev-only-session-key-change-me'),
  QR_SIGNING_KEY: z.string().min(8).default('dev-only-qr-key-change-me'),
  QR_SIGNING_KEY_ID: z.string().default('dev-1'),

  SMS_PROVIDER: z.enum(['console', 'mock']).default('console'),
  PAYMENT_PROVIDER: z.enum(['mock']).default('mock'),
  PAYMENT_WEBHOOK_SECRET: z.string().min(8).default('dev-only-webhook-secret'),

  DOCUMENT_STORAGE_DIR: z.string().default('.local-storage'),
  S3_ENDPOINT: z.string().optional(),
  S3_BUCKET: z.string().optional(),

  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  REGULATORY_FETCH_USER_AGENT: z.string().default('ProbashOS-RegulatoryFetcher/0.1'),
});

export type Env = z.infer<typeof envSchema>;

const DEV_PLACEHOLDER_KEYS = [
  'dev-only-session-key-change-me',
  'dev-only-qr-key-change-me',
  'dev-only-webhook-secret',
];

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    throw new ConfigurationError(
      `Invalid environment:\n${parsed.error.issues
        .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
        .join('\n')}`,
    );
  }
  const env = parsed.data;

  if (env.APP_ENV === 'production' || env.APP_ENV === 'staging') {
    const placeholders = [
      ['SESSION_SIGNING_KEY', env.SESSION_SIGNING_KEY],
      ['QR_SIGNING_KEY', env.QR_SIGNING_KEY],
      ['PAYMENT_WEBHOOK_SECRET', env.PAYMENT_WEBHOOK_SECRET],
    ].filter(([, value]) => DEV_PLACEHOLDER_KEYS.includes(value!));
    if (placeholders.length > 0) {
      throw new ConfigurationError(
        `Development placeholder secrets must not be used in ${env.APP_ENV}: ${placeholders
          .map(([key]) => key)
          .join(', ')}`,
      );
    }
    if (env.STORAGE_DRIVER === 'memory') {
      throw new ConfigurationError(
        `STORAGE_DRIVER=memory is a development-only driver and cannot run in ${env.APP_ENV}`,
      );
    }
  }

  if (env.STORAGE_DRIVER === 'postgres' && !env.DATABASE_URL) {
    throw new ConfigurationError('STORAGE_DRIVER=postgres requires DATABASE_URL');
  }

  return env;
}

export interface ProductIdentity {
  nameEn: string;
  nameBn: string;
}

/** §0 — read the product name from configuration, never from a literal in a component. */
export function productIdentity(env: Env): ProductIdentity {
  return { nameEn: env.PUBLIC_PRODUCT_NAME, nameBn: env.PUBLIC_PRODUCT_NAME_BN };
}

/**
 * Feature flags for regulatory and financial integrations that are not yet
 * contractually live (§83). A flag that is off must fail loudly, never degrade.
 */
export interface FeatureFlags {
  postgresStorage: boolean;
  liveOfficialSourceFetch: boolean;
  liveLicensedPaymentProvider: boolean;
  temporalWorkflows: boolean;
  documentMalwareScanning: boolean;
}

export function featureFlags(env: Env): FeatureFlags {
  return {
    postgresStorage: env.STORAGE_DRIVER === 'postgres',
    // No official-source adapter is contractually live yet (ADR 0003).
    liveOfficialSourceFetch: false,
    // No licensed payment partner is onboarded yet (ADR 0004).
    liveLicensedPaymentProvider: false,
    temporalWorkflows: false,
    documentMalwareScanning: false,
  };
}
