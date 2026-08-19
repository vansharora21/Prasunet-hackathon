/*
  # GraphSentinel Vector Intelligence (pgvector) + Graph Analytics

  ## Summary
  Adds semantic-search and graph-intelligence capabilities on top of the core
  schema.

  ## Vector DB (pgvector)
  - Enables the `vector` extension.
  - `alert_embeddings` stores a 384-dim embedding per fraud alert, generated
    deterministically from the alert's SHAP narrative + pattern + severity.
  - `search_alert_embeddings(query_vector, k)` returns the k most similar
    alerts by cosine distance.

  ## Graph Intelligence (FalkorDB-style)
  - `graph_communities` stores detected community clusters over the fund-flow
    graph (account -> account edges). Populated by the Node/Next.js service
    using a FalkorDB-compatible graph store (falls back to in-memory when no
    FalkorDB instance is reachable).
  - `graph_paths` caches shortest-path / layering-chain results for quick
    investigator lookup.

  ## Security
  - RLS enabled; read/write allowed for anon + authenticated (demo).
*/

-- ── pgvector extension ────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS vector;

-- ── alert_embeddings ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alert_embeddings (
  alert_id TEXT PRIMARY KEY REFERENCES fraud_alerts(id) ON DELETE CASCADE,
  embedding vector(384) NOT NULL,
  source_text TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE alert_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to alert_embeddings"
  ON alert_embeddings FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow insert to alert_embeddings"
  ON alert_embeddings FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow update to alert_embeddings"
  ON alert_embeddings FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow delete from alert_embeddings"
  ON alert_embeddings FOR DELETE
  TO anon, authenticated
  USING (true);

-- Cosine-similarity search over alert embeddings.
-- Returns alert_id + similarity (1 = identical, 0 = orthogonal).
CREATE OR REPLACE FUNCTION search_alert_embeddings(
  query_vector vector(384),
  result_limit integer DEFAULT 10
)
RETURNS TABLE (alert_id text, similarity double precision)
LANGUAGE sql STABLE
AS $$
  SELECT
    alert_id,
    1 - (embedding <=> query_vector) AS similarity
  FROM alert_embeddings
  ORDER BY embedding <=> query_vector ASC
  LIMIT result_limit;
$$;

-- ── graph_communities (FalkorDB-style) ────────────────────────────
CREATE TABLE IF NOT EXISTS graph_communities (
  id TEXT PRIMARY KEY,
  community_id TEXT NOT NULL,
  member_account_ids TEXT[] NOT NULL DEFAULT '{}',
  total_flow NUMERIC NOT NULL DEFAULT 0,
  suspicious_edge_count INTEGER NOT NULL DEFAULT 0,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE graph_communities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to graph_communities"
  ON graph_communities FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow insert to graph_communities"
  ON graph_communities FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow delete from graph_communities"
  ON graph_communities FOR DELETE
  TO anon, authenticated
  USING (true);

-- ── graph_paths (shortest-path / layering chains) ─────────────────
CREATE TABLE IF NOT EXISTS graph_paths (
  id TEXT PRIMARY KEY,
  source_account_id TEXT NOT NULL,
  target_account_id TEXT NOT NULL,
  path_account_ids TEXT[] NOT NULL DEFAULT '{}',
  hop_count INTEGER NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  is_suspicious BOOLEAN NOT NULL DEFAULT false,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE graph_paths ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to graph_paths"
  ON graph_paths FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow insert to graph_paths"
  ON graph_paths FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow delete from graph_paths"
  ON graph_paths FOR DELETE
  TO anon, authenticated
  USING (true);