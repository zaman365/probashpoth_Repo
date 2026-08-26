import { getChatGPTUser } from '@/app/chatgpt-auth';
import { getDocumentObject } from '@/db/operations';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getChatGPTUser();
  if (!user) return new Response('Unauthorized', { status: 401 });
  const { id } = await params;
  const record = await getDocumentObject(user.userId, id);
  if (!record) return new Response('Not found', { status: 404 });

  return new Response(record.object.body, {
    headers: {
      'Content-Type': record.mimeType,
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(record.filename)}`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
