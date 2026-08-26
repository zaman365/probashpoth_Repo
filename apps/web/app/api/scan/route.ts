import { NextResponse } from 'next/server';
import { scanOfferSchema } from '@probash/contracts';
import { apiRequest } from '@/lib/api';

/**
 * Thin proxy so the browser never talks to the API directly and never sees a token.
 * The payload is re-validated here before it leaves the web tier (§83).
 */
export async function POST(request: Request): Promise<NextResponse> {
  const body: unknown = await request.json();
  const parsed = scanOfferSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: { code: 'VALIDATION_FAILED' } }, { status: 400 });
  }
  const result = await apiRequest('/api/v1/verify/offer', { method: 'POST', body: parsed.data });
  return NextResponse.json(result);
}
