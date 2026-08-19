import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { loadDataset } from '@/lib/data';
import { analyzeWithMlService } from '@/lib/ml-client';
import type { Transaction } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const limit = Number(request.nextUrl.searchParams.get('limit') || 200);
    const transactions = await supabase.select<Transaction>('transactions', {
      order: { column: 'timestamp', ascending: false },
      limit,
    });

    return NextResponse.json({ data: transactions });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const payload = {
      id: body.id || `TXN_${Date.now()}`,
      sender_account_id: body.sender_account_id,
      receiver_account_id: body.receiver_account_id,
      amount: body.amount,
      channel: body.channel || 'NEFT',
      reference_number: body.reference_number || `REF_${Date.now()}`,
      status: body.status || 'completed',
      timestamp: body.timestamp || new Date().toISOString(),
      metadata: body.metadata || {},
    };

    const inserted = await supabase.insert<Transaction>('transactions', [payload]);
    const dataset = await loadDataset();
    const analysis = await analyzeWithMlService({
      accounts: dataset.accounts,
      transactions: dataset.transactions,
      patterns: dataset.patterns,
    });

    return NextResponse.json(
      {
        transaction: inserted?.[0] || payload,
        alerts: analysis.alerts || [],
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

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const id = body.id;
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const { id: _ignored, ...updates } = body;
    const updated = await supabase.update<Transaction>('transactions', updates, { id });
    return NextResponse.json({ transaction: updated?.[0] || { id, ...updates } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}