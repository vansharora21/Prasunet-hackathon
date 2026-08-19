import { NextRequest, NextResponse } from 'next/server';
import { loadDataset } from '@/lib/data';
import { retrainMlService } from '@/lib/ml-client';
import { supabase } from '@/lib/supabase';
import type { InvestigatorFeedback } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const dataset = await loadDataset();
    const feedback = await supabase.select<InvestigatorFeedback>('investigator_feedback', {
      order: { column: 'created_at', ascending: false },
      limit: Number(body.feedbackLimit || 200),
    });

    const metrics = await retrainMlService({
      ...dataset,
      feedback,
      epochs: Number(body.epochs || 5),
    });

    return NextResponse.json(metrics);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}