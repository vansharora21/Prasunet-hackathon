import { Suspense } from 'react';
import { loadDataset } from '@/lib/data';
import ReportsView from '@/components/reports/ReportsView';
import { TableSkeleton } from '@/components/Skeleton';

export const dynamic = 'force-dynamic';

async function ReportsData() {
  const dataset = await loadDataset();
  return (
    <ReportsView
      initialReports={dataset.reports}
      initialAlerts={dataset.alerts}
      initialAccounts={dataset.accounts}
      initialTransactions={dataset.transactions}
    />
  );
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<TableSkeleton rows={8} />}>
      <ReportsData />
    </Suspense>
  );
}