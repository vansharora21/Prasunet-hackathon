import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { FraudAlert, InvestigatorFeedback } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    if (!body.alert_id) {
      return NextResponse.json({ error: 'alert_id is required' }, { status: 400 });
    }

    const feedbackRecord = {
      id: body.id || `FB_${Date.now()}`,
      alert_id: body.alert_id,
      investigator_action: body.investigator_action || 'reviewed',
      investigator_name: body.investigator_name || 'Investigations Desk',
      notes: body.notes || '',
      created_at: new Date().toISOString(),
    };

    await supabase.update<FraudAlert>('fraud_alerts', {
      status: body.status || 'confirmed',
      assigned_investigator: body.investigator_name || 'Investigations Desk',
      notes: body.notes || '',
      updated_at: new Date().toISOString(),
    }, {
      id: body.alert_id,
    });

    const inserted = await supabase.insert<InvestigatorFeedback>('investigator_feedback', [feedbackRecord]);
    return NextResponse.json({ feedback: inserted?.[0] || feedbackRecord }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}