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

  IDENTITY_PROVIDER: z.enum(['sites-transition', 'clerk']).default('sites-transition'),
  CLERK_PUBLISHABLE_KEY: z.string().optional(),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().optional(),
  CLERK_SECRET_KEY: z.string().optional(),
  CLERK_JWT_KEY: z.string().optional(),
  CLERK_AUTHORIZED_PARTIES: z.string().optional(),
  CLERK_WEBHOOK_SECRET: z.string().optional(),
  CLERK_SIGN_IN_URL: z.string().default('/sign-in'),
  CLERK_SIGN_UP_URL: z.string().default('/sign-up'),

  STORAGE_DRIVER: z.enum(['memory', 'postgres']).default('memory'),
  DATABASE_URL: z.string().optional(),
  REDIS_URL: z.string().optional(),
  FIELD_ENCRYPTION_KEY: z.string().optional(),

  SESSION_SIGNING_KEY: z.string().min(8).default('dev-only-session-key-change-me'),
  QR_SIGNING_KEY: z.string().min(8).default('dev-only-qr-key-change-me'),
  QR_SIGNING_KEY_ID: z.string().default('dev-1'),

  SMS_PROVIDER: z.enum(['console', 'mock']).default('console'),
  PAYMENT_PROVIDER: z.enum(['mock']).default('mock'),
  PAYMENT_WEBHOOK_SECRET: z.string().min(8).default('dev-only-webhook-secret'),

  DOCUMENT_STORAGE_DIR: z.string().default('.local-storage'),
  S3_ENDPOINT: z.string().optional(),
  S3_BUCKET: z.string().optional(),

  DATA_RESIDENCY_REGION: z.enum(['local', 'eu']).default('local'),
  DOCUMENT_UPLOADS_ENABLED: z.enum(['false', 'true']).default('false'),
  DOCUMENT_QUARANTINE_ENABLED: z.enum(['false', 'true']).default('false'),
  DOCUMENT_MALWARE_SCANNING_ENABLED: z.enum(['false', 'true']).default('false'),
  DOCUMENT_DOWNLOAD_AUDIT_ENABLED: z.enum(['false', 'true']).default('false'),
  SECURITY_GATE_S3_APPROVED: z.enum(['false', 'true']).default('false'),
  SECURITY_GATE_S3_EVIDENCE_ID: z.string().optional(),

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
  if (env.STORAGE_DRIVER === 'postgres' && !env.FIELD_ENCRYPTION_KEY) {
    throw new ConfigurationError('STORAGE_DRIVER=postgres requires FIELD_ENCRYPTION_KEY');
  }

  if (env.IDENTITY_PROVIDER === 'clerk') {
    const missing = [
      ['CLERK_PUBLISHABLE_KEY', env.CLERK_PUBLISHABLE_KEY],
      ['CLERK_SECRET_KEY', env.CLERK_SECRET_KEY],
      ['CLERK_AUTHORIZED_PARTIES', env.CLERK_AUTHORIZED_PARTIES],
    ].filter(([, value]) => !value);
    if (missing.length > 0) {
      throw new ConfigurationError(
        `IDENTITY_PROVIDER=clerk requires ${missing.map(([key]) => key).join(', ')}`,
      );
    }
  }

  if (env.DOCUMENT_UPLOADS_ENABLED === 'true') {
    const unmet = [
      env.IDENTITY_PROVIDER === 'clerk' ? null : 'Clerk identity',
      env.STORAGE_DRIVER === 'postgres' ? null : 'PostgreSQL storage',
      env.DATA_RESIDENCY_REGION === 'eu' ? null : 'EU data residency',
      env.DOCUMENT_QUARANTINE_ENABLED === 'true' ? null : 'quarantine',
      env.DOCUMENT_MALWARE_SCANNING_ENABLED === 'true' ? null : 'malware scanning',
      env.DOCUMENT_DOWNLOAD_AUDIT_ENABLED === 'true' ? null : 'download audit',
      env.SECURITY_GATE_S3_APPROVED === 'true' ? null : 'Gate S3 approval',
      env.SECURITY_GATE_S3_EVIDENCE_ID ? null : 'Gate S3 evidence id',
    ].filter((item): item is string => item !== null);
    if (unmet.length > 0) {
      throw new ConfigurationError(
        `Sensitive document uploads are fail-closed; unmet controls: ${unmet.join(', ')}`,
      );
    }
  }
  if (
    env.FIELD_ENCRYPTION_KEY &&
    Buffer.from(env.FIELD_ENCRYPTION_KEY, 'base64').byteLength !== 32
  ) {
    throw new ConfigurationError('FIELD_ENCRYPTION_KEY must decode to exactly 32 bytes');
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
    documentMalwareScanning: env.DOCUMENT_MALWARE_SCANNING_ENABLED === 'true',
  };
}

export interface SensitiveDocumentGate {
  enabled: boolean;
  evidenceId: string | null;
}

/**
 * Gate S3 is deliberately redundant with environment validation. Callers use this
 * helper at the action boundary; configuration validation prevents an invalid
 * deployment from starting at all.
 */
export function sensitiveDocumentGate(env: Env): SensitiveDocumentGate {
  return {
    enabled:
      env.DOCUMENT_UPLOADS_ENABLED === 'true' &&
      env.IDENTITY_PROVIDER === 'clerk' &&
      env.STORAGE_DRIVER === 'postgres' &&
      env.DATA_RESIDENCY_REGION === 'eu' &&
      env.DOCUMENT_QUARANTINE_ENABLED === 'true' &&
      env.DOCUMENT_MALWARE_SCANNING_ENABLED === 'true' &&
      env.DOCUMENT_DOWNLOAD_AUDIT_ENABLED === 'true' &&
      env.SECURITY_GATE_S3_APPROVED === 'true' &&
      Boolean(env.SECURITY_GATE_S3_EVIDENCE_ID),
    evidenceId: env.SECURITY_GATE_S3_EVIDENCE_ID ?? null,
  };
}
