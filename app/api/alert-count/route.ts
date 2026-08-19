import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * Lightweight single-query endpoint for the sidebar badge count.
 * Replaces the old /api/summary call which ran 6 queries just for this number.
 */
export async function GET() {
  try {
    const rows = await supabase.select<{ status: string }>('fraud_alerts', {
      columns: 'status',
      filters: { status: 'open' },
      limit: 1000,
    });

    return NextResponse.json({ openAlerts: rows.length });
  } catch {
    return NextResponse.json({ openAlerts: 0 });
  }
}
