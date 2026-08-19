import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { Account } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const accounts = await supabase.select<Account>('accounts', {
      order: { column: 'created_at', ascending: true },
      limit: 1000,
    });
    return NextResponse.json({ data: accounts });
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
      id: body.id || `ACC_${Date.now()}`,
      holder_name: body.holder_name,
      bank_branch: body.bank_branch,
      account_type: body.account_type || 'savings',
      declared_profession: body.declared_profession || 'salaried',
      declared_annual_income: body.declared_annual_income || 0,
      created_at: body.created_at || new Date().toISOString(),
      last_activity_at: body.last_activity_at || new Date().toISOString(),
      is_dormant: Boolean(body.is_dormant),
      risk_score: body.risk_score || 0,
      risk_level: body.risk_level || 'low',
    };

    const inserted = await supabase.insert<Account>('accounts', [payload]);
    return NextResponse.json({ account: inserted?.[0] || payload }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}