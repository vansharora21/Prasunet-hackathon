import 'server-only';
import { supabase } from './supabase';
import type { FraudAlert } from './types';

/**
 * Vector DB (pgvector) + FalkorDB-style graph intelligence.
 *
 * Embeddings are generated deterministically with feature hashing over the
 * alert's SHAP narrative + pattern + severity, so no external embedding model
 * is required. The vectors are stored in the `alert_embeddings` table and
 * searched via the `search_alert_embeddings` RPC (cosine similarity).
 */

export const EMBEDDING_DIM = 384;

/** Deterministic string hash (FNV-1a) used for feature hashing. */
function fnv1a(str: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Tokenize + normalize text into lowercase word tokens. */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Produce a fixed-dimension embedding vector from text using signed feature
 * hashing. Deterministic across runs so the same alert always maps to the
 * same vector.
 */
export function embedText(text: string): number[] {
  const vector = new Array<number>(EMBEDDING_DIM).fill(0);
  const tokens = tokenize(text);

  for (const token of tokens) {
    const hash = fnv1a(token);
    const index = hash % EMBEDDING_DIM;
    // Signed hashing: positive or negative contribution based on a second hash.
    const sign = (fnv1a(token + ':sign') & 1) === 0 ? 1 : -1;
    vector[index] += sign;
  }

  // L2-normalize so cosine similarity is meaningful.
  const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0)) || 1;
  return vector.map((v) => v / norm);
}

/** Build the source text that represents an alert for embedding. */
export function alertSourceText(alert: FraudAlert): string {
  return [
    alert.pattern_type,
    alert.severity,
    alert.status,
    alert.shap_narrative,
    (alert.shap_factors || []).map((f) => f.factor).join(' '),
  ].join(' ');
}

/** Format a numeric vector as a Postgres pgvector literal: `[0.1,0.2,...]`. */
function vectorToPgVector(vector: number[]): string {
  return `[${vector.map((v) => v.toFixed(6)).join(',')}]`;
}

/** PostgREST request helpers (raw REST so we can pass pgvector literals). */
function restHeaders() {
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    '';
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
}

function restBase(): string {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    '';
  if (!url) throw new Error('Missing Supabase URL for vector operations.');
  return `${url.replace(/\/$/, '')}/rest/v1`;
}

/**
 * (Re)index all alerts into the pgvector `alert_embeddings` table.
 * Returns the number of alerts indexed.
 */
export async function indexAlertEmbeddings(): Promise<number> {
  const alerts = await supabase.select<FraudAlert>('fraud_alerts', {
    order: { column: 'created_at', ascending: false },
    limit: 2000,
  });

  let indexed = 0;
  for (const alert of alerts) {
    const sourceText = alertSourceText(alert);
    const embedding = embedText(sourceText);
    const payload = {
      alert_id: alert.id,
      embedding: vectorToPgVector(embedding),
      source_text: sourceText,
      updated_at: new Date().toISOString(),
    };
    const response = await fetch(`${restBase()}/alert_embeddings`, {
      method: 'POST',
      headers: { ...restHeaders(), Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify([payload]),
      cache: 'no-store',
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to upsert embedding for ${alert.id}: ${text}`);
    }
    indexed += 1;
  }

  return indexed;
}

/**
 * Semantic search over alert embeddings. Returns the most similar alerts
 * ranked by cosine similarity, joined with their full alert records.
 */
export async function searchSimilarAlerts(query: string, limit = 10) {
  const queryVector = embedText(query);
  const response = await fetch(`${restBase()}/rpc/search_alert_embeddings`, {
    method: 'POST',
    headers: restHeaders(),
    body: JSON.stringify({ query_vector: vectorToPgVector(queryVector), result_limit: limit }),
    cache: 'no-store',
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Semantic search failed: ${text}`);
  }

  const matches = (await response.json()) as { alert_id: string; similarity: number }[];
  if (!matches.length) return [];

  const ids = matches.map((m) => m.alert_id);
  const alerts = await supabase.select<FraudAlert>('fraud_alerts', {
    filters: { id: ids },
    limit,
  });

  const byId = new Map(alerts.map((a) => [a.id, a]));
  return matches
    .map((m) => ({ alert: byId.get(m.alert_id), similarity: m.similarity }))
    .filter((r): r is { alert: FraudAlert; similarity: number } => Boolean(r.alert));
}