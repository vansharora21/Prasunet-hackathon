import { Suspense } from 'react';
import { loadDataset } from '@/lib/data';
import { summarizeGraph } from '@/lib/detection';
import FundFlowGraphView from '@/components/graph/FundFlowGraphView';
import { GraphSkeleton } from '@/components/Skeleton';

export const dynamic = 'force-dynamic';

async function GraphData() {
  const dataset = await loadDataset();
  const graph = summarizeGraph(dataset.accounts, dataset.transactions, dataset.alerts);
  return (
    <FundFlowGraphView
      accounts={graph.nodes}
      edges={graph.edges}
      alerts={dataset.alerts}
    />
  );
}

export default function GraphPage() {
  return (
    <Suspense fallback={<GraphSkeleton />}>
      <GraphData />
    </Suspense>
  );
}