import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { FederatedNode } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const nodes = await supabase.select<FederatedNode>('federated_nodes', {
      order: { column: 'alerts_contributed', ascending: false },
      limit: 100,
    });
    return NextResponse.json({ data: nodes });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}