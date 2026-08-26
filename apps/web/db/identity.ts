import { getD1 } from './index';
import { env } from 'cloudflare:workers';
import { Client } from 'pg';

export type IdentityProvider = 'sites' | 'clerk';

export class IdentityLinkConflictError extends Error {
  constructor() {
    super('This verified identity matches an existing record and requires account recovery.');
    this.name = 'IdentityLinkConflictError';
  }
}

let schemaPromise: Promise<void> | undefined;

async function ensureIdentitySchema(): Promise<void> {
  schemaPromise ??= getD1()
    .batch([
      getD1().prepare(`CREATE TABLE IF NOT EXISTS identity_links (
        provider TEXT NOT NULL,
        provider_subject TEXT NOT NULL,
        app_user_id TEXT NOT NULL,
        verified_email TEXT,
        verified_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        PRIMARY KEY (provider, provider_subject),
        UNIQUE (app_user_id, provider)
      )`),
      getD1().prepare(
        'CREATE INDEX IF NOT EXISTS identity_links_email_idx ON identity_links (verified_email)',
      ),
      getD1().prepare(`CREATE TABLE IF NOT EXISTS identity_link_events (
        id TEXT PRIMARY KEY,
        app_user_id TEXT NOT NULL,
        provider TEXT NOT NULL,
        provider_subject TEXT NOT NULL,
        event_type TEXT NOT NULL,
        detail_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL
      )`),
    ])
    .then(() => undefined);
  return schemaPromise;
}

/**
 * Provider subjects never become domain identifiers. Existing Sites records keep
 * their historical key during transition; new Clerk identities receive a stable,
 * provider-independent UUID. Email is evidence for an explicit claim flow only and
 * is intentionally never used for automatic account linking.
 */
export async function resolveAppUserId(input: {
  provider: IdentityProvider;
  providerSubject: string;
  verifiedEmail: string;
}): Promise<string> {
  if (env.STORAGE_DRIVER === 'postgres') return resolvePostgresIdentity(input);
  await ensureIdentitySchema();
  const existing = await getD1()
    .prepare(
      'SELECT app_user_id FROM identity_links WHERE provider = ? AND provider_subject = ? LIMIT 1',
    )
    .bind(input.provider, input.providerSubject)
    .first<{ app_user_id: string }>();
  if (existing) return existing.app_user_id;

  const appUserId = input.provider === 'sites' ? input.providerSubject : crypto.randomUUID();
  const timestamp = new Date().toISOString();
  await getD1().batch([
    getD1()
      .prepare(
        `INSERT OR IGNORE INTO identity_links
          (provider, provider_subject, app_user_id, verified_email, verified_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        input.provider,
        input.providerSubject,
        appUserId,
        input.verifiedEmail.toLowerCase(),
        timestamp,
        timestamp,
      ),
    getD1()
      .prepare(
        `INSERT INTO identity_link_events
          (id, app_user_id, provider, provider_subject, event_type, detail_json, created_at)
         VALUES (?, ?, ?, ?, 'identity.created', '{}', ?)`,
      )
      .bind(crypto.randomUUID(), appUserId, input.provider, input.providerSubject, timestamp),
  ]);
  const created = await getD1()
    .prepare(
      'SELECT app_user_id FROM identity_links WHERE provider = ? AND provider_subject = ? LIMIT 1',
    )
    .bind(input.provider, input.providerSubject)
    .first<{ app_user_id: string }>();
  if (!created) throw new Error('Identity link could not be created.');
  return created.app_user_id;
}

async function resolvePostgresIdentity(input: {
  provider: IdentityProvider;
  providerSubject: string;
  verifiedEmail: string;
}): Promise<string> {
  if (!env.HYPERDRIVE) throw new Error('PostgreSQL is selected but Hyperdrive is unavailable.');
  const client = new Client({ connectionString: env.HYPERDRIVE.connectionString });
  await client.connect();
  try {
    await client.query('BEGIN');
    const existing = await client.query<{ app_user_id: string }>(
      `SELECT app_user_id::text
       FROM identity_link
       WHERE provider = $1 AND provider_subject = $2
       FOR UPDATE`,
      [input.provider, input.providerSubject],
    );
    if (existing.rows[0]) {
      await client.query('COMMIT');
      return existing.rows[0].app_user_id;
    }

    const appUserId = crypto.randomUUID();
    await client.query(
      `INSERT INTO app_user (id, phone_e164, primary_email, display_name, roles)
       VALUES ($1, NULL, $2, NULL, ARRAY['worker']::text[])`,
      [appUserId, input.verifiedEmail.toLowerCase()],
    );
    await client.query(
      `INSERT INTO identity_link
        (provider, provider_subject, app_user_id, verified_email, verified_at)
       VALUES ($1, $2, $3, $4, now())`,
      [input.provider, input.providerSubject, appUserId, input.verifiedEmail.toLowerCase()],
    );
    await client.query(
      `INSERT INTO identity_link_event
        (id, app_user_id, provider, provider_subject, event_type, detail)
       VALUES ($1, $2, $3, $4, 'identity.created', '{}'::jsonb)`,
      [crypto.randomUUID(), appUserId, input.provider, input.providerSubject],
    );
    await client.query('COMMIT');
    return appUserId;
  } catch (error) {
    await client.query('ROLLBACK');
    if (isUniqueViolation(error)) throw new IdentityLinkConflictError();
    throw error;
  } finally {
    await client.end();
  }
}

function isUniqueViolation(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === '23505');
}
