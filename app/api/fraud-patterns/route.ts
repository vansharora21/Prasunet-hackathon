import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { FraudPattern } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const patterns = await supabase.select<FraudPattern>('fraud_patterns', {
      order: { column: 'created_at', ascending: true },
      limit: 100,
    });
    return NextResponse.json({ data: patterns });
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
    const updated = await supabase.update<FraudPattern>('fraud_patterns', updates, { id });
    return NextResponse.json({ pattern: updated?.[0] || { id, ...updates } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}