import { NextResponse } from 'next/server';
import { loadDataset } from '@/lib/data';
import { summarizeDashboard } from '@/lib/detection';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const dataset = await loadDataset();

    return NextResponse.json(
      summarizeDashboard({
        accounts: dataset.accounts,
        transactions: dataset.transactions,
        alerts: dataset.alerts,
        reports: dataset.reports,
        nodes: dataset.nodes,
      })
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}