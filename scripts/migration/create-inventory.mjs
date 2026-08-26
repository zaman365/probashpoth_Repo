import { createHash, createHmac } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

const [inputPath, outputPath, source = 'unknown'] = process.argv.slice(2);
const signingKey = process.env.MIGRATION_SNAPSHOT_SIGNING_KEY;
if (!inputPath || !outputPath || !signingKey) {
  throw new Error(
    'Usage: MIGRATION_SNAPSHOT_SIGNING_KEY=... node create-inventory.mjs input.json output.json source',
  );
}

const snapshot = JSON.parse(readFileSync(inputPath, 'utf8'));
if (!snapshot.tables || typeof snapshot.tables !== 'object') {
  throw new Error('Snapshot must contain a tables object.');
}

const tables = Object.fromEntries(
  Object.entries(snapshot.tables).map(([name, rows]) => {
    if (!Array.isArray(rows)) throw new Error(`${name} must be an array.`);
    const canonicalRows = rows.map(stable).sort();
    const ownership = rows
      .map((row) => `${row.user_id ?? row.owner_user_id ?? ''}:${row.id ?? ''}`)
      .sort();
    return [
      name,
      {
        count: rows.length,
        rowSha256: digest(canonicalRows.join('\n')),
        ownershipSha256: digest(ownership.join('\n')),
      },
    ];
  }),
);
const objects = Array.isArray(snapshot.objects)
  ? {
      count: snapshot.objects.length,
      checksumSha256: digest(
        snapshot.objects
          .map((item) => `${item.key}:${item.sha256}:${item.ownerId ?? ''}`)
          .sort()
          .join('\n'),
      ),
    }
  : { count: 0, checksumSha256: digest('') };
const unsigned = { version: 1, source, createdAt: new Date().toISOString(), tables, objects };
const signature = createHmac('sha256', signingKey).update(stable(unsigned)).digest('hex');
writeFileSync(outputPath, `${JSON.stringify({ ...unsigned, signature }, null, 2)}\n`, {
  mode: 0o600,
});
console.log(`Inventory written for ${Object.keys(tables).length} table(s); no row data copied.`);

function digest(value) {
  return createHash('sha256').update(value).digest('hex');
}

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stable(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}
