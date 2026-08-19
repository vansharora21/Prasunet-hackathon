import { Suspense } from 'react';
import { loadDataset } from '@/lib/data';
import { supabase } from '@/lib/supabase';
import type { InvestigatorFeedback } from '@/lib/types';
import SettingsView from '@/components/settings/SettingsView';
import { PageSkeleton } from '@/components/Skeleton';

export const dynamic = 'force-dynamic';

async function SettingsData() {
  const dataset = await loadDataset();
  const auditLog = await supabase.select<InvestigatorFeedback>('investigator_feedback', {
    order: { column: 'created_at', ascending: false },
    limit: 30,
  });

  return (
    <SettingsView
      initialPatterns={dataset.patterns}
      initialAuditLog={auditLog}
    />
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <SettingsData />
    </Suspense>
  );
}