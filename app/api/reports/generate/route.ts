import { NextRequest, NextResponse } from 'next/server';
import { loadDataset } from '@/lib/data';
import { generateGoamlXml } from '@/lib/goaml';
import { supabase } from '@/lib/supabase';
import type { StrCtrReport } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const reportType = body.reportType || 'STR';
    const dataset = await loadDataset();
    const alerts = (body.alertIds?.length
      ? dataset.alerts.filter((alert) => body.alertIds.includes(alert.id))
      : dataset.alerts.filter((alert) => alert.status === 'open')).sort((left, right) => right.confidence_score - left.confidence_score);
    const transactions = dataset.transactions.filter((transaction) =>
      alerts.some((alert) => (alert.linked_transaction_ids || []).includes(transaction.id))
    );
    const xml = generateGoamlXml({
      report: { id: body.id, report_type: reportType, narrative: body.narrative },
      alerts,
      accounts: dataset.accounts,
      transactions,
    });

    const subjectAccounts = [...new Set(alerts.flatMap((alert) => alert.involved_accounts || []))].slice(0, 5);
    const totalAmount = alerts.reduce((sum, alert) => sum + Number(alert.total_amount || 0), 0);
    const reportPayload = {
      id: body.id || `RPT_${Date.now()}`,
      alert_ids: alerts.map((alert) => alert.id),
      report_type: reportType,
      goaml_xml: xml,
      narrative: body.narrative || 'Automatically generated compliance package based on suspicious transaction alerts.',
      subject_details: {
        account_ids: subjectAccounts,
        alert_count: alerts.length,
      },
      transaction_summary: {
        total_alert_amount: Number(totalAmount.toFixed(2)),
        transaction_count: transactions.length,
      },
      generation_time_seconds: Number(body.generationTimeSeconds || 0),
      submission_status: body.submissionStatus || 'draft',
      submitted_at: body.submissionStatus === 'submitted' ? new Date().toISOString() : null,
    };

    const inserted = await supabase.insert<StrCtrReport>('str_ctr_reports', [reportPayload]);
    return NextResponse.json(
      {
        report: inserted?.[0] || reportPayload,
        xml,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}