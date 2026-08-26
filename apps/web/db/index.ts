import { env } from 'cloudflare:workers';
import { drizzle } from 'drizzle-orm/d1';
import { Client } from 'pg';
import * as schema from './schema';

export function getD1(): D1Database {
  if (!env.DB) throw new Error('Cloudflare D1 binding `DB` is unavailable.');
  return env.DB;
}

export function getDb() {
  if (env.STORAGE_DRIVER === 'postgres') {
    throw new Error('The Drizzle D1 adapter is unavailable when PostgreSQL is authoritative.');
  }
  return drizzle(getD1(), { schema });
}

export function getFiles(): R2Bucket {
  if (!env.FILES) throw new Error('Cloudflare R2 binding `FILES` is unavailable.');
  return env.FILES;
}

export interface OperationalResult<T = Record<string, unknown>> {
  results: T[];
  success: boolean;
  meta: { changes: number };
}

export interface OperationalStatement {
  bind(...values: unknown[]): OperationalStatement;
  run<T = Record<string, unknown>>(): Promise<OperationalResult<T>>;
  all<T = Record<string, unknown>>(): Promise<OperationalResult<T>>;
  first<T = Record<string, unknown>>(column?: string): Promise<T | null>;
}

export interface OperationalDatabase {
  prepare(sql: string): OperationalStatement;
  batch<T = Record<string, unknown>>(
    statements: OperationalStatement[],
  ): Promise<OperationalResult<T>[]>;
}

/**
 * The transition keeps the existing repository calls stable while switching the
 * execution port. PostgreSQL requests always receive an explicit, transaction-local
 * user context so RLS remains the final authorization boundary.
 */
export function getOperationalDatabase(userId: string): OperationalDatabase {
  if (env.STORAGE_DRIVER !== 'postgres') return getD1() as unknown as OperationalDatabase;
  if (!env.HYPERDRIVE) throw new Error('PostgreSQL is selected but Hyperdrive is unavailable.');
  return new PostgresOperationalDatabase(env.HYPERDRIVE.connectionString, userId);
}

class PostgresOperationalStatement implements OperationalStatement {
  private values: unknown[] = [];

  constructor(
    readonly sql: string,
    private readonly connectionString: string,
    private readonly userId: string,
  ) {}

  bind(...values: unknown[]): OperationalStatement {
    this.values = values;
    return this;
  }

  run<T = Record<string, unknown>>(): Promise<OperationalResult<T>> {
    return this.execute<T>();
  }

  all<T = Record<string, unknown>>(): Promise<OperationalResult<T>> {
    return this.execute<T>();
  }

  async first<T = Record<string, unknown>>(column?: string): Promise<T | null> {
    const result = await this.execute<Record<string, unknown>>();
    const row = result.results[0];
    if (!row) return null;
    return (column ? row[column] : row) as T;
  }

  async execute<T = Record<string, unknown>>(client?: Client): Promise<OperationalResult<T>> {
    if (client) return executePostgres<T>(client, this.userId, this.sql, this.values);
    const ownClient = new Client({ connectionString: this.connectionString });
    await ownClient.connect();
    try {
      await ownClient.query('BEGIN');
      const result = await executePostgres<T>(ownClient, this.userId, this.sql, this.values);
      await ownClient.query('COMMIT');
      return result;
    } catch (error) {
      await ownClient.query('ROLLBACK');
      throw error;
    } finally {
      await ownClient.end();
    }
  }
}

class PostgresOperationalDatabase implements OperationalDatabase {
  constructor(
    private readonly connectionString: string,
    private readonly userId: string,
  ) {}

  prepare(sql: string): OperationalStatement {
    return new PostgresOperationalStatement(sql, this.connectionString, this.userId);
  }

  async batch<T = Record<string, unknown>>(
    statements: OperationalStatement[],
  ): Promise<OperationalResult<T>[]> {
    const client = new Client({ connectionString: this.connectionString });
    await client.connect();
    try {
      await client.query('BEGIN');
      const results: OperationalResult<T>[] = [];
      for (const statement of statements) {
        if (!(statement instanceof PostgresOperationalStatement)) {
          throw new Error('Cannot mix D1 and PostgreSQL statements in one batch.');
        }
        results.push(await statement.execute<T>(client));
      }
      await client.query('COMMIT');
      return results;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      await client.end();
    }
  }
}

async function executePostgres<T>(
  client: Client,
  userId: string,
  sql: string,
  values: unknown[],
): Promise<OperationalResult<T>> {
  await client.query("SELECT set_config('app.current_user_id', $1, true)", [userId]);
  const result = await client.query<T & Record<string, unknown>>(numberParameters(sql), values);
  return {
    results: result.rows as T[],
    success: true,
    meta: { changes: result.rowCount ?? 0 },
  };
}

function numberParameters(sql: string): string {
  let index = 0;
  return sql.replaceAll('?', () => `$${++index}`);
}
