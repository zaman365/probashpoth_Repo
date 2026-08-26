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

const DESTRUCTIVE = /\b(drop\s+(table|column|schema)|truncate)\b/i;

function main(): void {
  const env = loadEnv();
  const dir = join(__dirname, 'migrations');
  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  if (!env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required to run migrations');
  }

  for (const file of files) {
    const sql = readFileSync(join(dir, file), 'utf8');
    if (DESTRUCTIVE.test(sql) && env.APP_ENV === 'production') {
      throw new Error(
        `Refusing to auto-apply destructive migration ${file} in production (§67). ` +
          'Run it deliberately with an operator-approved change record.',
      );
    }
  }

  // eslint-disable-next-line no-console
  console.log(
    `[migrate] ${files.length} migration file(s) found and checked.\n` +
      '[migrate] The PostgreSQL driver is not wired yet — see ' +
      'apps/api/src/storage/postgres/README.md. No statements were executed.',
  );
  process.exitCode = 1;
}

main();
