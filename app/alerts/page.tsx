import { Suspense } from 'react';
import { loadDataset } from '@/lib/data';
import FraudAlertsView from '@/components/alerts/FraudAlertsView';
import { TableSkeleton } from '@/components/Skeleton';

export const dynamic = 'force-dynamic';

async function AlertsData() {
  const dataset = await loadDataset();
  return (
    <FraudAlertsView
      initialAlerts={dataset.alerts}
      initialAccounts={dataset.accounts}
    />
  );
}

export default function FraudAlertsPage() {
  return (
    <Suspense fallback={<TableSkeleton rows={10} />}>
      <AlertsData />
    </Suspense>
  );
}