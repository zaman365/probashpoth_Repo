import { verifyWebhook } from '@clerk/backend/webhooks';
import { env } from 'cloudflare:workers';
import { Client } from 'pg';

export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  if (!env.CLERK_WEBHOOK_SECRET || !env.HYPERDRIVE || env.STORAGE_DRIVER !== 'postgres') {
    return Response.json({ error: 'Webhook processing is not configured.' }, { status: 503 });
  }

  let event: Awaited<ReturnType<typeof verifyWebhook>>;
  try {
    event = await verifyWebhook(request, { signingSecret: env.CLERK_WEBHOOK_SECRET });
  } catch {
    return Response.json({ error: 'Invalid webhook signature.' }, { status: 401 });
  }

  const eventId = request.headers.get('svix-id');
  if (!eventId) return Response.json({ error: 'Missing delivery id.' }, { status: 400 });
  const data = event.data as { id?: string; deleted?: boolean };
  const providerSubject = typeof data.id === 'string' ? data.id : null;
  const client = new Client({ connectionString: env.HYPERDRIVE.connectionString });
  await client.connect();
  try {
    await client.query('BEGIN');
    const inserted = await client.query(
      `INSERT INTO identity_webhook_event (event_id, event_type, provider_subject)
       VALUES ($1, $2, $3) ON CONFLICT (event_id) DO NOTHING`,
      [eventId, event.type, providerSubject],
    );
    if ((inserted.rowCount ?? 0) === 0) {
      await client.query('ROLLBACK');
      return Response.json({ status: 'duplicate' }, { status: 200 });
    }
    if (event.type === 'user.deleted' && providerSubject) {
      const linked = await client.query<{ app_user_id: string }>(
        `UPDATE identity_link
         SET disabled_at = now()
         WHERE provider = 'clerk' AND provider_subject = $1 AND disabled_at IS NULL
         RETURNING app_user_id::text`,
        [providerSubject],
      );
      const appUserId = linked.rows[0]?.app_user_id;
      if (appUserId) {
        await client.query(
          `INSERT INTO identity_link_event
            (id, app_user_id, provider, provider_subject, event_type, detail)
           VALUES ($1, $2, 'clerk', $3, 'identity.disabled', '{}'::jsonb)`,
          [crypto.randomUUID(), appUserId, providerSubject],
        );
      }
    }
    await client.query('COMMIT');
    return Response.json({ status: 'accepted', eventType: event.type }, { status: 202 });
  } catch {
    await client.query('ROLLBACK');
    console.error(
      JSON.stringify({
        event: 'clerk.webhook.failed',
        deliveryId: eventId,
        eventType: event.type,
        errorCode: 'PERSISTENCE_FAILED',
      }),
    );
    return Response.json({ error: 'Webhook processing failed.' }, { status: 503 });
  } finally {
    await client.end();
  }
}

export function GET(): Response {
  return Response.json({ error: 'Method not allowed.' }, { status: 405 });
}
