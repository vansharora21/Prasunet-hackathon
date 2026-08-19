import { Suspense } from 'react';
import { loadDataset } from '@/lib/data';
import FederatedNetworkView from '@/components/federated/FederatedNetworkView';
import { GraphSkeleton } from '@/components/Skeleton';

export const dynamic = 'force-dynamic';

async function FederatedData() {
  const dataset = await loadDataset();
  return <FederatedNetworkView initialNodes={dataset.nodes} />;
}

export default function FederatedNetworkPage() {
  return (
    <Suspense fallback={<GraphSkeleton />}>
      <FederatedData />
    </Suspense>
  );
}