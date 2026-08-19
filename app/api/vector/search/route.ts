import { NextRequest, NextResponse } from 'next/server';
import { searchSimilarAlerts } from '@/lib/vector';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const query = String(body.query || '').trim();
    const limit = Math.min(Number(body.limit || 10), 50);

    if (!query) {
      return NextResponse.json({ error: 'query is required' }, { status: 400 });
    }

    const results = await searchSimilarAlerts(query, limit);
    return NextResponse.json({ query, results });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}