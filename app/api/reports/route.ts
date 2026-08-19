import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { StrCtrReport } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const reports = await supabase.select<StrCtrReport>('str_ctr_reports', {
      order: { column: 'created_at', ascending: false },
      limit: 1000,
    });
    return NextResponse.json({ data: reports });
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
    const updated = await supabase.update<StrCtrReport>('str_ctr_reports', updates, { id });
    return NextResponse.json({ report: updated?.[0] || { id, ...updates } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}