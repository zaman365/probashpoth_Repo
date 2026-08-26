import { Client } from 'pg';
import { hasExpectedFileSignature, toHex } from './signatures';

interface Env {
  HYPERDRIVE: Hyperdrive;
  DOCUMENTS_QUARANTINE: R2Bucket;
  DOCUMENTS_CLEAN: R2Bucket;
  SCANNER: Fetcher;
  DOCUMENT_SCAN_QUEUE: Queue<ScanMessage>;
}

interface ScanMessage {
  jobId: string;
}

interface ScanRow {
  job_id: string;
  document_id: string;
  upload_intent_id: string;
  owner_user_id: string;
  object_key: string;
  checksum_sha256: string;
  content_type: string;
  state: 'pending' | 'queued' | 'processing' | 'clean' | 'rejected';
  correlation_id: string;
  updated_at: Date;
}

interface ScannerResult {
  verdict: 'clean' | 'rejected';
  engine: string;
  signature?: string;
}

export default {
  async fetch(): Promise<Response> {
    return Response.json({ service: 'bdos-document-pipeline', status: 'ok' });
  },

  async queue(batch: MessageBatch<ScanMessage>, env: Env): Promise<void> {
    for (const message of batch.messages) {
      try {
        await processJob(message.body.jobId, env);
        message.ack();
      } catch (error) {
        console.error(
          JSON.stringify({
            event: 'document.scan.failed',
            jobId: message.body.jobId,
            errorCode: error instanceof ScanError ? error.code : 'UNEXPECTED_SCAN_ERROR',
          }),
        );
        message.retry();
      }
    }
  },

  async scheduled(_controller: ScheduledController, env: Env): Promise<void> {
    const client = new Client({ connectionString: env.HYPERDRIVE.connectionString });
    await client.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query<{ id: string; payload: { jobId?: string } }>(
        `SELECT id::text, payload
         FROM outbox_event
         WHERE event_name = 'document.scan.requested' AND published_at IS NULL
         ORDER BY created_at
         LIMIT 100
         FOR UPDATE SKIP LOCKED`,
      );
      const messages = result.rows
        .map((row) => ({ outboxId: row.id, jobId: row.payload.jobId }))
        .filter((row): row is { outboxId: string; jobId: string } => Boolean(row.jobId));
      if (messages.length > 0) {
        await env.DOCUMENT_SCAN_QUEUE.sendBatch(messages.map(({ jobId }) => ({ body: { jobId } })));
        await client.query(
          'UPDATE outbox_event SET published_at = now() WHERE id = ANY($1::uuid[])',
          [messages.map(({ outboxId }) => outboxId)],
        );
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      await client.end();
    }
  },
} satisfies ExportedHandler<Env, ScanMessage>;

async function processJob(jobId: string, env: Env): Promise<void> {
  if (!/^[0-9a-f-]{36}$/i.test(jobId)) throw new ScanError('INVALID_JOB_ID');
  const client = new Client({ connectionString: env.HYPERDRIVE.connectionString });
  await client.connect();
  try {
    const row = await claimJob(client, jobId);
    if (!row || row.state === 'clean' || row.state === 'rejected') return;

    const object = await env.DOCUMENTS_QUARANTINE.get(row.object_key);
    if (!object) throw new ScanError('QUARANTINE_OBJECT_MISSING');
    const bytes = await object.arrayBuffer();
    const checksum = toHex(await crypto.subtle.digest('SHA-256', bytes));
    if (checksum !== row.checksum_sha256) {
      await rejectJob(client, row, env, bytes, 'CHECKSUM_MISMATCH');
      return;
    }
    if (!hasExpectedFileSignature(new Uint8Array(bytes), row.content_type)) {
      await rejectJob(client, row, env, bytes, 'SIGNATURE_MISMATCH');
      return;
    }

    const scanResponse = await env.SCANNER.fetch('https://scanner.internal/v1/scan', {
      method: 'POST',
      headers: {
        'Content-Type': row.content_type,
        'X-Content-SHA256': checksum,
        'X-Correlation-ID': row.correlation_id,
      },
      body: bytes,
    });
    if (!scanResponse.ok) throw new ScanError('SCANNER_UNAVAILABLE');
    const scan = (await scanResponse.json()) as ScannerResult;
    if (scan.verdict !== 'clean') {
      await rejectJob(
        client,
        row,
        env,
        bytes,
        scan.signature ? 'MALWARE_DETECTED' : 'SCAN_REJECTED',
      );
      return;
    }

    const cleanKey = `clean/${row.owner_user_id}/${row.document_id}`;
    await env.DOCUMENTS_CLEAN.put(cleanKey, bytes, {
      httpMetadata: { contentType: row.content_type },
      customMetadata: { documentId: row.document_id, checksumSha256: checksum },
    });
    await finishJob(client, row, 'clean', cleanKey, scan.engine, null);
    await env.DOCUMENTS_QUARANTINE.delete(row.object_key);
  } finally {
    await client.end();
  }
}

async function claimJob(client: Client, jobId: string): Promise<ScanRow | null> {
  await client.query('BEGIN');
  try {
    const result = await client.query<ScanRow>(
      `SELECT j.id::text AS job_id, j.document_id::text, j.upload_intent_id::text,
              d.owner_user_id::text, j.object_key, j.checksum_sha256,
              d.content_type, j.state, j.correlation_id, j.updated_at
       FROM document_scan_job j
       JOIN document d ON d.id = j.document_id
       WHERE j.id = $1
       FOR UPDATE`,
      [jobId],
    );
    const row = result.rows[0];
    if (!row || row.state === 'clean' || row.state === 'rejected') {
      await client.query('COMMIT');
      return row ?? null;
    }
    if (row.state === 'processing' && Date.now() - row.updated_at.getTime() < 5 * 60 * 1000) {
      await client.query('COMMIT');
      throw new ScanError('JOB_BUSY');
    }
    await client.query(
      `UPDATE document_scan_job
       SET state = 'processing', attempts = attempts + 1, updated_at = now()
       WHERE id = $1`,
      [jobId],
    );
    await client.query('COMMIT');
    return { ...row, state: 'processing' };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

async function rejectJob(
  client: Client,
  row: ScanRow,
  env: Env,
  bytes: ArrayBuffer,
  reason: string,
): Promise<void> {
  const rejectedKey = `rejected/${row.job_id}`;
  await env.DOCUMENTS_QUARANTINE.put(rejectedKey, bytes, {
    httpMetadata: { contentType: row.content_type },
    customMetadata: { scanResult: 'rejected' },
  });
  await finishJob(client, row, 'rejected', rejectedKey, null, reason);
  await env.DOCUMENTS_QUARANTINE.delete(row.object_key);
}

async function finishJob(
  client: Client,
  row: ScanRow,
  state: 'clean' | 'rejected',
  storageKey: string,
  engine: string | null,
  errorCode: string | null,
): Promise<void> {
  await client.query('BEGIN');
  try {
    await client.query(
      `UPDATE document_scan_job
       SET state = $2, last_error_code = $3, updated_at = now()
       WHERE id = $1`,
      [row.job_id, state, errorCode],
    );
    await client.query(
      `UPDATE document
       SET storage_key = $2, malware_scan_status = $3
       WHERE id = $1`,
      [row.document_id, storageKey, state],
    );
    await client.query(
      `UPDATE documents
       SET object_key = $2, verification_status = $3, updated_at = now()
       WHERE id = $1`,
      [row.document_id, storageKey, state],
    );
    await client.query(`UPDATE document_upload_intent SET status = 'consumed' WHERE id = $1`, [
      row.upload_intent_id,
    ]);
    await client.query(
      `INSERT INTO document_event
        (id, document_id, upload_intent_id, owner_user_id, event_type,
         correlation_id, detail)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
      [
        crypto.randomUUID(),
        row.document_id,
        row.upload_intent_id,
        row.owner_user_id,
        state === 'clean' ? 'scan.clean' : 'scan.rejected',
        row.correlation_id,
        JSON.stringify({ engine, errorCode }),
      ],
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

class ScanError extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}
