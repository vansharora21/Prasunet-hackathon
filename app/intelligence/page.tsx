import { Suspense } from 'react';
import type { Metadata } from 'next';
import { loadDataset } from '@/lib/data';
import { buildIntelligenceGraph, connectedComponents, suspiciousChains } from '@/lib/falkor';
import IntelligenceView from '@/components/intelligence/IntelligenceView';
import { PageSkeleton } from '@/components/Skeleton';

export const metadata: Metadata = {
  title: 'Graph Intelligence | Causeway',
  description: 'Vector DB semantic search and FalkorDB-style network analytics.',
};

export const dynamic = 'force-dynamic';

async function IntelligenceData() {
  const dataset = await loadDataset();
  const linkedTransactionIds = dataset.alerts.flatMap((a) => a.linked_transaction_ids || []);
  const graph = buildIntelligenceGraph(dataset.accounts, dataset.transactions, linkedTransactionIds);

  const communities = connectedComponents(graph);
  const chains = suspiciousChains(graph, 4);

  const accounts = dataset.accounts.map((a) => ({ id: a.id, name: a.holder_name }));
  const initialData = {
    nodeCount: graph.nodes.size,
    edgeCount: graph.links.size,
    suspiciousEdgeCount: [...graph.links.values()].filter((l) => l.is_suspicious).length,
    communities,
    suspiciousChains: chains,
    accounts,
  };

  return <IntelligenceView initialData={initialData} />;
}

export default function IntelligencePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <IntelligenceData />
    </Suspense>
  );
}