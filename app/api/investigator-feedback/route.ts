import { NextRequest, NextResponse } from 'next/server';
import { supabase, type FilterValue } from '@/lib/supabase';
import type { InvestigatorFeedback } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const alertId = request.nextUrl.searchParams.get('alert_id');
    const limit = Number(request.nextUrl.searchParams.get('limit') || 30);
    const filters: Record<string, FilterValue> = {};
    if (alertId) filters.alert_id = alertId;
    const feedback = await supabase.select<InvestigatorFeedback>('investigator_feedback', {
      filters,
      order: { column: 'created_at', ascending: false },
      limit,
    });
    return NextResponse.json({ data: feedback });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}