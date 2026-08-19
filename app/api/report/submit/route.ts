import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { StrCtrReport } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    if (!body.id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const updated = await supabase.update<StrCtrReport>('str_ctr_reports', {
      submission_status: 'submitted',
      submitted_at: now,
    }, { id: body.id });

    return NextResponse.json({
      report: updated?.[0] || { id: body.id, submission_status: 'submitted', submitted_at: now },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}