import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { loadDataset } from '@/lib/data';
import { summarizeGraph } from '@/lib/detection';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const dataset = await loadDataset();
    return NextResponse.json(summarizeGraph(dataset.accounts, dataset.transactions, dataset.alerts));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}