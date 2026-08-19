import { NextResponse } from 'next/server';
import { loadDataset, deduplicateAlerts } from '@/lib/data';
import { analyzeWithMlService } from '@/lib/ml-client';
import { supabase } from '@/lib/supabase';
import type { FraudAlert } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const dataset = await loadDataset();
    const analysis = await analyzeWithMlService({
      accounts: dataset.accounts,
      transactions: dataset.transactions,
      patterns: dataset.patterns,
    });

    const rawAlerts = analysis.alerts || [];
    const { toInsert, toUpdate } = await deduplicateAlerts(rawAlerts);

    // Persist net-new alerts
    if (toInsert.length) {
      await supabase.insert<FraudAlert>('fraud_alerts', toInsert);
    }
    // Update stale confidence scores on existing alerts
    for (const upd of toUpdate) {
      await supabase.update<FraudAlert>('fraud_alerts', upd, { id: upd.id });
    }

    return NextResponse.json({
      alerts: [...toInsert, ...toUpdate],
      inserted: toInsert.length,
      updated: toUpdate.length,
      deduplicated: rawAlerts.length - toInsert.length - toUpdate.length,
      count: toInsert.length + toUpdate.length,
      model: analysis.model || 'python-ml-service',
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}