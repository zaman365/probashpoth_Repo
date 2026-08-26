import { env } from 'cloudflare:workers';
import { Client } from 'pg';
import { getD1 } from '@/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  const correlationId = request.headers.get('cf-ray') ?? crypto.randomUUID();
  const readiness = new URL(request.url).searchParams.get('readiness') === '1';
  if (!readiness) {
    return Response.json(
      { service: 'bdos-web', status: 'ok', correlationId },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  }
  try {
    if (env.STORAGE_DRIVER === 'postgres') {
      if (!env.HYPERDRIVE) throw new Error('HYPERDRIVE_UNAVAILABLE');
      const client = new Client({ connectionString: env.HYPERDRIVE.connectionString });
      await client.connect();
      try {
        await client.query('SELECT 1');
      } finally {
        await client.end();
      }
    } else {
      await getD1().prepare('SELECT 1').first();
    }
    return Response.json(
      { service: 'bdos-web', status: 'ready', correlationId },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return Response.json(
      { service: 'bdos-web', status: 'not-ready', correlationId },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
