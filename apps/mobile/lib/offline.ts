import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system/legacy';
import { apiRequest } from './api';

const database = SQLite.openDatabaseAsync('probash-mobile.db');

async function ready() {
  const db = await database;
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS cached_resource (
      cache_key TEXT PRIMARY KEY NOT NULL,
      payload TEXT NOT NULL,
      cached_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS mutation_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      path TEXT NOT NULL,
      method TEXT NOT NULL,
      body TEXT NOT NULL,
      idempotency_key TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS document_upload_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uri TEXT NOT NULL,
      content_type TEXT NOT NULL,
      document_type TEXT NOT NULL,
      label_bn TEXT NOT NULL,
      label_en TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
  return db;
}

export async function cacheResource(cacheKey: string, value: unknown): Promise<void> {
  const db = await ready();
  await db.runAsync(
    `INSERT INTO cached_resource (cache_key, payload, cached_at)
     VALUES (?, ?, ?)
     ON CONFLICT(cache_key) DO UPDATE SET payload = excluded.payload, cached_at = excluded.cached_at`,
    cacheKey,
    JSON.stringify(value),
    new Date().toISOString(),
  );
}

export async function readCachedResource<T>(cacheKey: string): Promise<T | undefined> {
  const db = await ready();
  const row = await db.getFirstAsync<{ payload: string }>(
    'SELECT payload FROM cached_resource WHERE cache_key = ?',
    cacheKey,
  );
  return row ? (JSON.parse(row.payload) as T) : undefined;
}

/** Non-sensitive writes only. Document bytes and family phone numbers are rejected. */
export async function enqueueMutation(input: {
  path: string;
  method: 'POST' | 'PATCH' | 'DELETE';
  body?: Record<string, unknown>;
  idempotencyKey?: string;
}): Promise<void> {
  const serialized = JSON.stringify(input.body ?? {});
  if (/contentBase64|delegatePhone|passportNumber|nidNumber/i.test(serialized)) {
    throw new Error('Sensitive payload cannot be stored in the generic offline queue');
  }
  const db = await ready();
  await db.runAsync(
    `INSERT INTO mutation_queue (path, method, body, idempotency_key, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    input.path,
    input.method,
    serialized,
    input.idempotencyKey ?? null,
    new Date().toISOString(),
  );
}

export async function flushMutationQueue(): Promise<number> {
  const db = await ready();
  const rows = await db.getAllAsync<{
    id: number;
    path: string;
    method: 'POST' | 'PATCH' | 'DELETE';
    body: string;
    idempotency_key: string | null;
  }>('SELECT id, path, method, body, idempotency_key FROM mutation_queue ORDER BY id');
  let flushed = 0;
  for (const row of rows) {
    await apiRequest(row.path, {
      method: row.method,
      body: JSON.parse(row.body) as unknown,
      idempotencyKey: row.idempotency_key ?? undefined,
    });
    await db.runAsync('DELETE FROM mutation_queue WHERE id = ?', row.id);
    flushed += 1;
  }
  return flushed;
}

export async function queueDocumentUpload(input: {
  uri: string;
  contentType: string;
  documentType: string;
  label: { bn: string; en: string };
}): Promise<void> {
  const db = await ready();
  await db.runAsync(
    `INSERT INTO document_upload_queue
      (uri, content_type, document_type, label_bn, label_en, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    input.uri,
    input.contentType,
    input.documentType,
    input.label.bn,
    input.label.en,
    new Date().toISOString(),
  );
}

export async function uploadDocument(input: {
  uri: string;
  contentType: string;
  documentType: string;
  label: { bn: string; en: string };
}): Promise<unknown> {
  const contentBase64 = await FileSystem.readAsStringAsync(input.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return apiRequest('/api/v1/me/documents', {
    method: 'POST',
    body: {
      type: input.documentType,
      label: input.label,
      contentType: input.contentType,
      contentBase64,
    },
  });
}

export async function flushDocumentUploads(): Promise<number> {
  const db = await ready();
  const rows = await db.getAllAsync<{
    id: number;
    uri: string;
    content_type: string;
    document_type: string;
    label_bn: string;
    label_en: string;
  }>(
    'SELECT id, uri, content_type, document_type, label_bn, label_en FROM document_upload_queue ORDER BY id',
  );
  let flushed = 0;
  for (const row of rows) {
    await uploadDocument({
      uri: row.uri,
      contentType: row.content_type,
      documentType: row.document_type,
      label: { bn: row.label_bn, en: row.label_en },
    });
    await db.runAsync('DELETE FROM document_upload_queue WHERE id = ?', row.id);
    flushed += 1;
  }
  return flushed;
}
