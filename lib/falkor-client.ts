/**
 * FalkorDB client — connects to a real FalkorDB instance via Redis protocol.
 *
 * FalkorDB is a Redis-compatible graph database. We use ioredis to connect
 * and execute FalkorDB's GRAPH.QUERY commands.
 *
 * Note: FalkorDB auto-creates graphs on first GRAPH.QUERY — no GRAPH.CREATE needed.
 */

import Redis from 'ioredis';

const FALKORDB_URL = process.env.FALKORDB_URL || 'redis://127.0.0.1:6379';
const GRAPH_NAME = 'graphsentinel';

let client: Redis | null = null;

export function getClient(): Redis {
  if (!client) {
    client = new Redis(FALKORDB_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 200, 2000);
        return delay;
      },
      lazyConnect: true,
    });

    client.on('error', (err) => {
      console.error('[FalkorDB] Connection error:', err.message);
    });

    client.on('connect', () => {
      console.log('[FalkorDB] Connected to', FALKORDB_URL.replace(/\/\/.*@/, '//***@'));
    });
  }
  return client;
}

/**
 * Execute a FalkorDB Cypher query.
 * Returns the result rows (first element of the FalkorDB response).
 */
export async function graphQuery(query: string, params?: Record<string, unknown>): Promise<any[][]> {
  const redis = getClient();
  const args = [GRAPH_NAME, query];
  if (params && Object.keys(params).length > 0) {
    args.push(JSON.stringify(params));
  }
  const result = (await redis.call('GRAPH.QUERY', ...args)) as unknown;
  // FalkorDB returns [columns, rows, stats] — we want the rows
  const rows = Array.isArray(result) && Array.isArray((result as unknown[])[1])
    ? (result as unknown[])[1] as any[][]
    : result as any[][];
  return rows;
}

/**
 * Delete the entire graph (for re-indexing).
 */
export async function graphDelete(): Promise<void> {
  const redis = getClient();
  try {
    await redis.call('GRAPH.DELETE', GRAPH_NAME);
  } catch {
    // Graph may not exist yet
  }
}

/**
 * Check if FalkorDB is reachable.
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const redis = getClient();
    await redis.ping();
    return true;
  } catch {
    return false;
  }
}
