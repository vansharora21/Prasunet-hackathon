import { NextResponse } from 'next/server';
import { indexAlertEmbeddings } from '@/lib/vector';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const indexed = await indexAlertEmbeddings();
    return NextResponse.json({ indexed, status: 'ok' });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}