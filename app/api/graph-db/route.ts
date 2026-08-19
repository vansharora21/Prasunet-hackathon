import { NextRequest, NextResponse } from 'next/server';
import { loadDataset } from '@/lib/data';
import {
  buildIntelligenceGraph,
  connectedComponents,
  shortestPath,
  suspiciousChains,
  syncToFalkorDB,
  falkorShortestPath,
  falkorCommunities,
  falkorSuspiciousChains,
} from '@/lib/falkor';
import { healthCheck } from '@/lib/falkor-client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const dataset = await loadDataset();
    const linkedTransactionIds = dataset.alerts.flatMap((a) => a.linked_transaction_ids || []);

    const isFalkorLive = await healthCheck();

    let communities;
    let chains;
    let nodeCount: number;
    let edgeCount: number;
    let suspiciousEdgeCount: number;

    if (isFalkorLive) {
      // Use real FalkorDB
      console.log('[GraphDB] Using live FalkorDB instance');

      // Sync data to FalkorDB on first query
      await syncToFalkorDB(dataset.accounts, dataset.transactions, linkedTransactionIds);

      communities = await falkorCommunities();
      chains = await falkorSuspiciousChains(4);
      nodeCount = dataset.accounts.length;
      edgeCount = dataset.transactions.length;
      suspiciousEdgeCount = linkedTransactionIds.length;
    } else {
      // Fallback to in-memory
      console.log('[GraphDB] FalkorDB not reachable, using in-memory graph');
      const graph = buildIntelligenceGraph(dataset.accounts, dataset.transactions, linkedTransactionIds);

      communities = connectedComponents(graph);
      chains = suspiciousChains(graph, 4);
      nodeCount = graph.nodes.size;
      edgeCount = graph.links.size;
      suspiciousEdgeCount = [...graph.links.values()].filter((l) => l.is_suspicious).length;
    }

    return NextResponse.json({
      nodeCount,
      edgeCount,
      suspiciousEdgeCount,
      communities,
      suspiciousChains: chains,
      falkorDbLive: isFalkorLive,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const source = body.source_account_id;
    const target = body.target_account_id;

    if (!source || !target) {
      return NextResponse.json({ error: 'source_account_id and target_account_id are required' }, { status: 400 });
    }

    const isFalkorLive = await healthCheck();

    let pathResult;

    if (isFalkorLive) {
      // Use real FalkorDB Cypher query
      pathResult = await falkorShortestPath(source, target);
    } else {
      // Fallback to in-memory BFS
      const dataset = await loadDataset();
      const linkedTransactionIds = dataset.alerts.flatMap((a) => a.linked_transaction_ids || []);
      const graph = buildIntelligenceGraph(dataset.accounts, dataset.transactions, linkedTransactionIds);
      pathResult = shortestPath(graph, source, target);
    }

    if (!pathResult) {
      return NextResponse.json({ path: null, message: 'No path found between the two accounts.' });
    }

    return NextResponse.json({ path: pathResult, falkorDbLive: isFalkorLive });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
