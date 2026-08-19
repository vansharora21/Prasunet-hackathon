import { NextRequest, NextResponse } from 'next/server';
import { summarizeAlert } from '@/lib/groq';
import type { FraudAlert } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const alert = body.alert as FraudAlert | undefined;

    if (!alert || !alert.id || !alert.pattern_type) {
      return NextResponse.json({ error: 'A valid alert object is required.' }, { status: 400 });
    }

    const summary = await summarizeAlert(alert);
    return NextResponse.json({ summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    const isConfig = message.includes('GROQ_API_KEY');
    return NextResponse.json(
      { error: message },
      { status: isConfig ? 503 : 500 }
    );
  }
}