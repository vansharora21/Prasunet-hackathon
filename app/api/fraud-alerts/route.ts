import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { FraudAlert } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const alerts = await supabase.select<FraudAlert>('fraud_alerts', {
      order: { column: 'created_at', ascending: false },
      limit: 1000,
    });
    return NextResponse.json({ data: alerts });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    if (!body.id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const { id, ...updates } = body;
    const updated = await supabase.update<FraudAlert>('fraud_alerts', updates, { id });
    return NextResponse.json({ alert: updated?.[0] || { id, ...updates } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}