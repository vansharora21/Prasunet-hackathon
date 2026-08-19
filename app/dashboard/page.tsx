import { Suspense } from 'react';
import { loadDataset } from '@/lib/data';
import DashboardView from '@/components/dashboard/DashboardView';
import { DashboardSkeleton } from '@/components/Skeleton';

export const dynamic = 'force-dynamic';

async function DashboardData() {
  const dataset = await loadDataset();
  const transactions = dataset.transactions.slice(0, 20);
  const alerts = dataset.alerts;
  const reports = dataset.reports;
  const pendingReports = reports.filter((report) => report.submission_status === 'draft').length;

  return (
    <DashboardView
      recentTxns={transactions}
      alerts={alerts}
      accounts={dataset.accounts}
      totalTxns={dataset.transactions.length}
      pendingReports={pendingReports}
    />
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardData />
    </Suspense>
  );
}