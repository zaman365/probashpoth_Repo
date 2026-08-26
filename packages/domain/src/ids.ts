/**
 * Keep identifier generation on the Web Crypto surface shared by modern Node and
 * browsers. Importing `node:crypto` from the domain barrel pulled a server-only URI
 * into otherwise browser-safe formatting code during production bundling.
 */
function randomBytes(byteLength: number): Uint8Array {
  const bytes = new Uint8Array(byteLength);
  const maxChunk = 65_536;
  for (let offset = 0; offset < bytes.length; offset += maxChunk) {
    globalThis.crypto.getRandomValues(bytes.subarray(offset, offset + maxChunk));
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function bytesToBase64Url(bytes: Uint8Array): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  let output = '';
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index]!;
    const second = bytes[index + 1];
    const third = bytes[index + 2];
    const block = (first << 16) | ((second ?? 0) << 8) | (third ?? 0);
    output += alphabet[(block >> 18) & 63];
    output += alphabet[(block >> 12) & 63];
    if (second !== undefined) output += alphabet[(block >> 6) & 63];
    if (third !== undefined) output += alphabet[block & 63];
  }
  return output;
}

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

  const hex = bytesToHex(bytes);
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
  return bytesToBase64Url(randomBytes(byteLength));
}

export function uuidv4(): string {
  return globalThis.crypto.randomUUID();
}
