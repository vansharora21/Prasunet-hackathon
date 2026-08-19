import { Suspense } from 'react';
import { loadDataset } from '@/lib/data';
import TransactionSimulatorView from '@/components/simulator/TransactionSimulatorView';
import { PageSkeleton } from '@/components/Skeleton';

export const dynamic = 'force-dynamic';

async function SimulatorData() {
  const dataset = await loadDataset();
  return <TransactionSimulatorView initialAccounts={dataset.accounts} />;
}

export default function TransactionSimulatorPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <SimulatorData />
    </Suspense>
  );
}