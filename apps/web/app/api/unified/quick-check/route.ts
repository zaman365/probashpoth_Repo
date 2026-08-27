import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { quickCheckInputSchema, quickCheckResultSchema } from '@probash/contracts';
import { apiRequest } from '@/lib/api';

export async function POST(request: NextRequest) {
  const parsed = quickCheckInputSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_FAILED', message: 'Check the highlighted answers.' } },
      { status: 400 },
    );
  }
  try {
    const result = await apiRequest('/api/v1/quick-check', {
      method: 'POST',
      body: parsed.data,
      schema: quickCheckResultSchema,
      locale: request.headers.get('accept-language')?.startsWith('en') ? 'en' : 'bn-BD',
    });
    return NextResponse.json(result, { headers: { 'cache-control': 'no-store' } });
  } catch {
    return NextResponse.json(
      {
        error: {
          code: 'CHECK_UNAVAILABLE',
          message: 'The preliminary check is temporarily unavailable.',
        },
      },
      { status: 503 },
    );
  }
}
