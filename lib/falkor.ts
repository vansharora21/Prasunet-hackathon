import 'server-only';
import type { Account, Transaction, GraphEdge } from './types';
import { graphQuery, graphDelete, healthCheck } from './falkor-client';

/**
 * FalkorDB graph intelligence.
 *
 * When FalkorDB is reachable, operations run against the real graph database.
 * When FalkorDB is unavailable, falls back to in-memory graph traversal.
 *
 * Operations exposed:
 *   - buildGraph: construct the directed graph from accounts + transactions
 *   - connectedComponents: community detection
 *   - shortestPath: BFS shortest path between two accounts
 *   - suspiciousChains: chains of suspicious edges
 */

export type GraphNode = {
  id: string;
  account: Account;
};

export type GraphLink = {
  source: string;
  target: string;
  total_amount: number;
  transaction_count: number;
  is_suspicious: boolean;
};

export type Graph = {
  nodes: Map<string, GraphNode>;
  adjacency: Map<string, string[]>;
  links: Map<string, GraphLink>;
};

export type Community = {
  id: string;
  member_account_ids: string[];
  total_flow: number;
  suspicious_edge_count: number;
};

export type PathResult = {
  source_account_id: string;
  target_account_id: string;
  path_account_ids: string[];
  hop_count: number;
  total_amount: number;
  is_suspicious: boolean;
};

// ── In-memory fallback (used when FalkorDB is unavailable) ──────────

export function buildGraph(accounts: Account[], transactions: Transaction[]): Graph {
  const nodes = new Map<string, GraphNode>();
  const adjacency = new Map<string, string[]>();
  const links = new Map<string, GraphLink>();

  for (const account of accounts) {
    nodes.set(account.id, { id: account.id, account });
    adjacency.set(account.id, []);
  }

  for (const transaction of transactions) {
    const key = `${transaction.sender_account_id}::${transaction.receiver_account_id}`;
    const existing = links.get(key) || {
      source: transaction.sender_account_id,
      target: transaction.receiver_account_id,
      total_amount: 0,
      transaction_count: 0,
      is_suspicious: false,
    };
    existing.total_amount += Number(transaction.amount || 0);
    existing.transaction_count += 1;
    links.set(key, existing);

    const neighbors = adjacency.get(transaction.sender_account_id) || [];
    if (!neighbors.includes(transaction.receiver_account_id)) {
      neighbors.push(transaction.receiver_account_id);
      adjacency.set(transaction.sender_account_id, neighbors);
    }
  }

  return { nodes, adjacency, links };
}

export function markSuspicious(graph: Graph, suspiciousTransactionIds: Set<string>, transactions: Transaction[]): void {
  for (const transaction of transactions) {
    if (!suspiciousTransactionIds.has(transaction.id)) continue;
    const key = `${transaction.sender_account_id}::${transaction.receiver_account_id}`;
    const link = graph.links.get(key);
    if (link) link.is_suspicious = true;
  }
}

export function connectedComponents(graph: Graph): Community[] {
  const visited = new Set<string>();
  const communities: Community[] = [];

  for (const nodeId of graph.nodes.keys()) {
    if (visited.has(nodeId)) continue;

    const queue = [nodeId];
    visited.add(nodeId);
    const members: string[] = [];
    let totalFlow = 0;
    let suspiciousEdges = 0;

    while (queue.length) {
      const current = queue.shift()!;
      members.push(current);

      const neighbors = graph.adjacency.get(current) || [];
      for (const neighbor of neighbors) {
        const link = graph.links.get(`${current}::${neighbor}`);
        if (link) {
          totalFlow += link.total_amount;
          if (link.is_suspicious) suspiciousEdges += 1;
        }
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }

    communities.push({
      id: `COMM_${communities.length + 1}`,
      member_account_ids: members,
      total_flow: totalFlow,
      suspicious_edge_count: suspiciousEdges,
    });
  }

  return communities.sort((a, b) => b.member_account_ids.length - a.member_account_ids.length);
}

export function shortestPath(graph: Graph, source: string, target: string): PathResult | null {
  if (!graph.nodes.has(source) || !graph.nodes.has(target)) return null;
  if (source === target) {
    return {
      source_account_id: source,
      target_account_id: target,
      path_account_ids: [source],
      hop_count: 0,
      total_amount: 0,
      is_suspicious: false,
    };
  }

  const queue: string[] = [source];
  const visited = new Set<string>([source]);
  const parent = new Map<string, string>();

  while (queue.length) {
    const current = queue.shift()!;
    const neighbors = graph.adjacency.get(current) || [];
    for (const neighbor of neighbors) {
      if (visited.has(neighbor)) continue;
      visited.add(neighbor);
      parent.set(neighbor, current);
      if (neighbor === target) {
        const path: string[] = [target];
        let cursor = target;
        while (cursor !== source) {
          cursor = parent.get(cursor)!;
          path.unshift(cursor);
        }
        return summarizePath(graph, path);
      }
      queue.push(neighbor);
    }
  }

  return null;
}

function summarizePath(graph: Graph, path: string[]): PathResult {
  let totalAmount = 0;
  let isSuspicious = false;
  for (let i = 0; i < path.length - 1; i++) {
    const link = graph.links.get(`${path[i]}::${path[i + 1]}`);
    if (link) {
      totalAmount += link.total_amount;
      if (link.is_suspicious) isSuspicious = true;
    }
  }
  return {
    source_account_id: path[0],
    target_account_id: path[path.length - 1],
    path_account_ids: path,
    hop_count: path.length - 1,
    total_amount: totalAmount,
    is_suspicious: isSuspicious,
  };
}

export function suspiciousChains(graph: Graph, maxDepth = 4): PathResult[] {
  const chains: PathResult[] = [];
  const suspiciousLinks = [...graph.links.values()].filter((l) => l.is_suspicious);
  const sources = new Set(suspiciousLinks.map((l) => l.source));

  for (const start of sources) {
    const stack: { node: string; path: string[] }[] = [{ node: start, path: [start] }];
    while (stack.length) {
      const { node, path } = stack.pop()!;
      const neighbors = graph.adjacency.get(node) || [];
      for (const neighbor of neighbors) {
        const link = graph.links.get(`${node}::${neighbor}`);
        if (!link?.is_suspicious) continue;
        if (path.includes(neighbor)) continue;
        const nextPath = [...path, neighbor];
        if (nextPath.length >= 3) {
          chains.push(summarizePath(graph, nextPath));
        }
        if (nextPath.length < maxDepth) {
          stack.push({ node: neighbor, path: nextPath });
        }
      }
    }
  }

  const seen = new Set<string>();
  return chains.filter((c) => {
    const sig = c.path_account_ids.join('>');
    if (seen.has(sig)) return false;
    seen.add(sig);
    return true;
  });
}

// ── FalkorDB real graph operations ──────────────────────────────────

/**
 * Push accounts and transactions into FalkorDB as graph entities.
 * This creates the real graph in FalkorDB for Cypher-based queries.
 */
export async function syncToFalkorDB(
  accounts: Account[],
  transactions: Transaction[],
  linkedTransactionIds: string[],
): Promise<void> {
  const isLive = await healthCheck();
  if (!isLive) {
    console.log('[FalkorDB] Instance not reachable, skipping sync');
    return;
  }

  console.log('[FalkorDB] Syncing graph to FalkorDB...');

  // Clear existing graph
  await graphDelete();

  // Create account nodes
  const accountQueries = accounts.map((account) => {
    const props = {
      id: account.id,
      holder_name: account.holder_name || '',
      risk_level: account.risk_level || 'low',
      risk_score: Number(account.risk_score || 0),
      is_dormant: Boolean(account.is_dormant),
      bank_branch: account.bank_branch || '',
    };
    return graphQuery(
      `CREATE (a:Account $props)`,
      { props }
    );
  });

  // Execute in batches of 50
  for (let i = 0; i < accountQueries.length; i += 50) {
    await Promise.all(accountQueries.slice(i, i + 50));
  }

  // Create transaction edges
  const suspiciousSet = new Set(linkedTransactionIds);
  const edgeQueries = transactions.map((txn) => {
    const isSuspicious = suspiciousSet.has(txn.id);
    return graphQuery(
      `MATCH (a:Account {id: $sender}), (b:Account {id: $receiver})
       CREATE (a)-[:TRANSFER {
         txn_id: $txn_id,
         amount: $amount,
         channel: $channel,
         timestamp: $timestamp,
         is_suspicious: $is_suspicious
       }]->(b)`,
      {
        sender: txn.sender_account_id,
        receiver: txn.receiver_account_id,
        txn_id: txn.id,
        amount: Number(txn.amount || 0),
        channel: txn.channel || 'UNKNOWN',
        timestamp: txn.timestamp || '',
        is_suspicious: isSuspicious,
      }
    );
  });

  for (let i = 0; i < edgeQueries.length; i += 50) {
    await Promise.all(edgeQueries.slice(i, i + 50));
  }

  console.log(`[FalkorDB] Synced ${accounts.length} nodes, ${transactions.length} edges`);
}

/**
 * Find shortest path between two accounts using FalkorDB Cypher.
 */
export async function falkorShortestPath(
  source: string,
  target: string,
): Promise<PathResult | null> {
  const isLive = await healthCheck();
  if (!isLive) return null;

  try {
    const result = await graphQuery(
      `MATCH (source:Account {id: $source}), (target:Account {id: $target})
       MATCH p = shortestPath((source)-[:TRANSFER*]->(target))
       RETURN [n IN nodes(p) | n.id] AS path_nodes,
              [r IN relationships(p) | r.amount] AS amounts,
              [r IN relationships(p) | r.is_suspicious] AS suspicious,
              length(p) AS hops`,
      { source, target }
    );

    // Parse FalkorDB result
    const rows = result?.[0] || [];
    if (!rows.length) return null;

    const row = rows[0];
    const pathNodes = row[0] || row.path_nodes || [];
    const amounts = row[1] || row.amounts || [];
    const suspiciousFlags = row[2] || row.suspicious || [];
    const hops = row[3] || row.hops || 0;

    const totalAmount = amounts.reduce((sum: number, a: number) => sum + Number(a || 0), 0);
    const isSuspicious = suspiciousFlags.some((s: boolean) => s);

    return {
      source_account_id: source,
      target_account_id: target,
      path_account_ids: pathNodes,
      hop_count: hops,
      total_amount: totalAmount,
      is_suspicious: isSuspicious,
    };
  } catch (err) {
    console.error('[FalkorDB] Shortest path query failed:', err);
    return null;
  }
}

/**
 * Detect communities (connected components) using FalkorDB.
 */
export async function falkorCommunities(): Promise<Community[]> {
  const isLive = await healthCheck();
  if (!isLive) return [];

  try {
    // Get connected components via UNION approach
    const result = await graphQuery(
      `MATCH (a:Account)
       OPTIONAL MATCH (a)-[:TRANSFER*1..10]-(b:Account)
       WITH a, collect(DISTINCT b.id) AS connected
       RETURN a.id AS account_id, connected`
    );

    const rows = result?.[0] || [];
    if (!rows.length) return [];

    // Group accounts into communities
    const communityMap = new Map<string, Set<string>>();

    for (const row of rows) {
      const accountId = row[0] || row.account_id;
      const connected = row[1] || row.connected || [];

      // Find existing community or create new one
      let communityId = '';
      for (const [cid, members] of communityMap) {
        if (members.has(accountId) || connected.some((c: string) => members.has(c))) {
          communityId = cid;
          break;
        }
      }

      if (!communityId) {
        communityId = `COMM_${communityMap.size + 1}`;
        communityMap.set(communityId, new Set());
      }

      communityMap.get(communityId)!.add(accountId);
      for (const c of connected) {
        communityMap.get(communityId)!.add(c);
      }
    }

    // Get flow data for each community
    const communities: Community[] = [];
    for (const [id, members] of communityMap) {
      const memberArray = [...members];

      // Get total flow within community
      const flowResult = await graphQuery(
        `MATCH (a:Account)-[r:TRANSFER]->(b:Account)
         WHERE a.id IN $members AND b.id IN $members
         RETURN sum(r.amount) AS total_flow,
                count(CASE WHEN r.is_suspicious = true THEN 1 END) AS suspicious_count`,
        { members: memberArray }
      );

      const flowRow = flowResult?.[0]?.[0] || {};
      communities.push({
        id,
        member_account_ids: memberArray,
        total_flow: Number(flowRow.total_flow || flowRow[0] || 0),
        suspicious_edge_count: Number(flowRow.suspicious_count || flowRow[1] || 0),
      });
    }

    return communities.sort((a, b) => b.member_account_ids.length - a.member_account_ids.length);
  } catch (err) {
    console.error('[FalkorDB] Community detection failed:', err);
    return [];
  }
}

/**
 * Find suspicious layering chains using FalkorDB.
 */
export async function falkorSuspiciousChains(maxDepth = 4): Promise<PathResult[]> {
  const isLive = await healthCheck();
  if (!isLive) return [];

  try {
    const result = await graphQuery(
      `MATCH (source:Account)-[r:TRANSFER*2..${maxDepth}]->(target:Account)
       WHERE ALL(rel IN relationships(r) WHERE rel.is_suspicious = true)
       RETURN [n IN nodes(r) | n.id] AS path_nodes,
              [rel IN relationships(r) | rel.amount] AS amounts,
              length(r) AS hops
       LIMIT 100`
    );

    const rows = result?.[0] || [];
    return rows.map((row: any) => {
      const pathNodes = row[0] || row.path_nodes || [];
      const amounts = row[1] || row.amounts || [];
      const hops = row[2] || row.hops || 0;
      const totalAmount = amounts.reduce((sum: number, a: number) => sum + Number(a || 0), 0);

      return {
        source_account_id: pathNodes[0] || '',
        target_account_id: pathNodes[pathNodes.length - 1] || '',
        path_account_ids: pathNodes,
        hop_count: hops,
        total_amount: totalAmount,
        is_suspicious: true,
      };
    });
  } catch (err) {
    console.error('[FalkorDB] Suspicious chains query failed:', err);
    return [];
  }
}

/** Convenience: build a fully-populated graph from dataset + alert links. */
export function buildIntelligenceGraph(
  accounts: Account[],
  transactions: Transaction[],
  linkedTransactionIds: string[],
): Graph {
  const graph = buildGraph(accounts, transactions);
  markSuspicious(graph, new Set(linkedTransactionIds), transactions);
  return graph;
}
