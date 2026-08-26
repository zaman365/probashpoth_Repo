import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { describe, expect, it } from 'vitest';

describe('PostgreSQL migrations', () => {
  it('apply in order to an empty PostgreSQL database', async () => {
    const database = new PGlite();
    const directory = join(__dirname, 'migrations');
    const files = readdirSync(directory)
      .filter((file) => file.endsWith('.sql'))
      .sort();
    try {
      for (const file of files) {
        await database.exec(readFileSync(join(directory, file), 'utf8'));
      }
      const applied = await database.query<{ filename: string }>(
        'SELECT filename FROM schema_migration ORDER BY filename',
      );
      expect(applied.rows.map((row) => row.filename)).toEqual(files);

      const firstUser = '018f8c4e-7a3b-7000-8000-000000000001';
      const secondUser = '018f8c4e-7a3b-7000-8000-000000000002';
      await database.exec(`
        INSERT INTO app_user (id, phone_e164, primary_email, roles)
        VALUES
          ('${firstUser}', NULL, 'one@example.invalid', ARRAY['worker']),
          ('${secondUser}', NULL, 'two@example.invalid', ARRAY['student']);
        INSERT INTO user_profiles
          (user_id, email, locale, active_path, enabled_paths, journey_stage,
           passport_json, created_at, updated_at)
        VALUES
          ('${firstUser}', 'one@example.invalid', 'bn-BD', 'work', '["work"]',
           'exploring', '{}', now(), now()),
          ('${secondUser}', 'two@example.invalid', 'en', 'study', '["study"]',
           'exploring', '{}', now(), now());
        CREATE ROLE bdos_rls_test;
        GRANT SELECT, UPDATE ON user_profiles TO bdos_rls_test;
        SET ROLE bdos_rls_test;
        SELECT set_config('app.current_user_id', '${firstUser}', false);
      `);
      const visible = await database.query<{ user_id: string }>(
        'SELECT user_id::text FROM user_profiles',
      );
      expect(visible.rows.map((row) => row.user_id)).toEqual([firstUser]);
      const crossTenantUpdate = await database.query(
        "UPDATE user_profiles SET goal_title = 'forbidden' WHERE user_id = $1",
        [secondUser],
      );
      expect(crossTenantUpdate.affectedRows).toBe(0);
      await database.exec('RESET ROLE');
    } finally {
      await database.close();
    }
  }, 30_000);
});
