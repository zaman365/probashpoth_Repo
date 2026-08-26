import { createHmac, timingSafeEqual } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { readFileSync } from 'node:fs';

const [sourcePath, targetPath] = process.argv.slice(2);
const signingKey = process.env.MIGRATION_SNAPSHOT_SIGNING_KEY;
if (!sourcePath || !targetPath || !signingKey) {
  throw new Error(
    'Usage: MIGRATION_SNAPSHOT_SIGNING_KEY=... node reconcile-inventories.mjs source.json target.json',
  );
}
const source = loadAndVerify(sourcePath);
const target = loadAndVerify(targetPath);
const failures = [];
for (const name of new Set([...Object.keys(source.tables), ...Object.keys(target.tables)])) {
  const before = source.tables[name];
  const after = target.tables[name];
  if (!before || !after) failures.push(`${name}: missing inventory`);
  else
    for (const field of ['count', 'rowSha256', 'ownershipSha256']) {
      if (before[field] !== after[field]) failures.push(`${name}.${field}: mismatch`);
    }
}
for (const field of ['count', 'checksumSha256']) {
  if (source.objects[field] !== target.objects[field]) failures.push(`objects.${field}: mismatch`);
}
if (failures.length > 0) {
  throw new Error(`Migration reconciliation failed:\n- ${failures.join('\n- ')}`);
}
console.log('Migration reconciliation passed: counts, ownership, rows and object checksums match.');

function loadAndVerify(path) {
  const inventory = JSON.parse(readFileSync(path, 'utf8'));
  const { signature, ...unsigned } = inventory;
  const actual = createHmac('sha256', signingKey).update(stable(unsigned)).digest();
  const expected = Buffer.from(signature ?? '', 'hex');
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    throw new Error(`Inventory signature is invalid: ${path}`);
  }
  return unsigned;
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
