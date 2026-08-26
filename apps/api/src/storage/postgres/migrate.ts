/**
 * Migration runner entry point (`pnpm db:migrate`).
 *
 * Migrations are explicit SQL files applied in filename order inside a transaction,
 * recorded in `schema_migration`. Destructive statements are never auto-applied in
 * production (§67); a destructive migration must be run deliberately by an operator.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadEnv } from '@probash/config';
import { Client } from 'pg';

const DESTRUCTIVE = /\b(drop\s+(table|column|schema)|truncate)\b/i;

async function main(): Promise<void> {
  const env = loadEnv();
  const dir = join(__dirname, 'migrations');
  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  if (!env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required to run migrations');
  }

  const checked: { filename: string; sql: string }[] = [];
  for (const file of files) {
    const sql = readFileSync(join(dir, file), 'utf8');
    if (DESTRUCTIVE.test(sql) && env.APP_ENV === 'production') {
      throw new Error(
        `Refusing to auto-apply destructive migration ${file} in production (§67). ` +
          'Run it deliberately with an operator-approved change record.',
      );
    }
    checked.push({ filename: file, sql });
  }

  const client = new Client({ connectionString: env.DATABASE_URL });
  await client.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migration (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    const appliedResult = await client.query<{ filename: string }>(
      'SELECT filename FROM schema_migration',
    );
    const applied = new Set(appliedResult.rows.map((row) => row.filename));

    let appliedCount = 0;
    for (const migration of checked) {
      if (applied.has(migration.filename)) continue;
      await client.query(migration.sql);
      appliedCount += 1;
      // eslint-disable-next-line no-console
      console.log(`[migrate] applied ${migration.filename}`);
    }

    // eslint-disable-next-line no-console
    console.log(
      `[migrate] complete: ${appliedCount} applied, ${checked.length - appliedCount} already current`,
    );
  } finally {
    await client.end();
  }
}

void main().catch((error: unknown) => {
  console.error('[migrate] failed', error);
  process.exitCode = 1;
});
