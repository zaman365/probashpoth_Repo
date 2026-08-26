import { randomBytes, randomUUID } from 'node:crypto';

/**
 * UUIDv7 — time-ordered identifiers (§42.6). Sortable ids keep large audit and
 * event tables index-friendly and make cursor pagination stable.
 */
export function uuidv7(now: number = Date.now()): string {
  const bytes = randomBytes(16);
  const ts = BigInt(now);

  bytes[0] = Number((ts >> 40n) & 0xffn);
  bytes[1] = Number((ts >> 32n) & 0xffn);
  bytes[2] = Number((ts >> 24n) & 0xffn);
  bytes[3] = Number((ts >> 16n) & 0xffn);
  bytes[4] = Number((ts >> 8n) & 0xffn);
  bytes[5] = Number(ts & 0xffn);

  // version 7
  bytes[6] = (bytes[6]! & 0x0f) | 0x70;
  // variant 10xx
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;

  const hex = bytes.toString('hex');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-');
}

/** Opaque, non-guessable token for share links and public lookups. */
export function opaqueToken(byteLength = 24): string {
  return randomBytes(byteLength).toString('base64url');
}

export function uuidv4(): string {
  return randomUUID();
}
