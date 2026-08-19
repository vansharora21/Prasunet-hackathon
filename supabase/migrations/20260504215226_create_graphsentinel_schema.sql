/*
  # GraphSentinel Core Schema

  ## Summary
  Creates the core database tables for the GraphSentinel AI-powered fund flow tracking
  and fraud detection system for Union Bank of India.

  ## New Tables

  ### accounts
  Customer/entity profiles with KYC information used for mismatch detection.
  - id, holder_name, bank_branch, account_type, declared_profession, declared_annual_income
  - created_at, last_activity_at, is_dormant, risk_score, risk_level

  ### transactions
  All banking transactions across NEFT, RTGS, UPI, and Core Banking channels.
  - id, sender_account_id, receiver_account_id, amount, channel, reference_number
  - status, timestamp, metadata (JSONB)

  ### graph_edges
  Derived directed edges between accounts for D3.js fund flow graph rendering.
  - source_account_id, target_account_id, total_amount, transaction_count, last_transaction_at

  ### fraud_patterns
  Configuration table for the five fraud detection pattern types with thresholds.
  - name, description, amount_ceiling, time_window_hours, hop_count, is_enabled

  ### fraud_alerts
  Flagged transactions with AI-generated SHAP narratives and investigator workflow status.
  - pattern_type, involved_accounts, linked_transaction_ids, confidence_score
  - shap_narrative, severity, status, assigned_investigator, notes

  ### investigator_feedback
  Human-in-the-loop feedback records used as model retraining signals.
  - alert_id, investigator_action, notes, timestamp

  ### str_ctr_reports
  Auto-generated STR/CTR evidence packages in goAML XML format.
  - alert_ids, report_type, goaml_xml, narrative, submission_status

  ### federated_nodes
  Participating public sector bank nodes in the federated learning network.
  - bank_name, bank_code, status, last_sync_at, alerts_contributed, model_version
  - precision_score, recall_score, f1_score

  ## Security
  - RLS enabled on all tables
  - Policies allow authenticated and anon users to read/write for demo purposes
*/

-- accounts table
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  holder_name TEXT NOT NULL,
  bank_branch TEXT NOT NULL,
  account_type TEXT NOT NULL DEFAULT 'savings',
  declared_profession TEXT NOT NULL DEFAULT 'salaried',
  declared_annual_income NUMERIC NOT NULL DEFAULT 500000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_dormant BOOLEAN NOT NULL DEFAULT false,
  risk_score NUMERIC NOT NULL DEFAULT 0,
  risk_level TEXT NOT NULL DEFAULT 'low'
);

ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to accounts"
  ON accounts FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow insert to accounts"
  ON accounts FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow update to accounts"
  ON accounts FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  sender_account_id TEXT NOT NULL REFERENCES accounts(id),
  receiver_account_id TEXT NOT NULL REFERENCES accounts(id),
  amount NUMERIC NOT NULL,
  channel TEXT NOT NULL DEFAULT 'NEFT',
  reference_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to transactions"
  ON transactions FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow insert to transactions"
  ON transactions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- graph_edges table
CREATE TABLE IF NOT EXISTS graph_edges (
  id TEXT PRIMARY KEY,
  source_account_id TEXT NOT NULL REFERENCES accounts(id),
  target_account_id TEXT NOT NULL REFERENCES accounts(id),
  total_amount NUMERIC NOT NULL DEFAULT 0,
  transaction_count INTEGER NOT NULL DEFAULT 0,
  last_transaction_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_suspicious BOOLEAN NOT NULL DEFAULT false
);

ALTER TABLE graph_edges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to graph_edges"
  ON graph_edges FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow insert to graph_edges"
  ON graph_edges FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow update to graph_edges"
  ON graph_edges FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- fraud_patterns table
CREATE TABLE IF NOT EXISTS fraud_patterns (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  amount_ceiling NUMERIC NOT NULL DEFAULT 1000000,
  time_window_hours INTEGER NOT NULL DEFAULT 48,
  hop_count INTEGER NOT NULL DEFAULT 3,
  multiplier NUMERIC NOT NULL DEFAULT 3.0,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE fraud_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to fraud_patterns"
  ON fraud_patterns FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow update to fraud_patterns"
  ON fraud_patterns FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- fraud_alerts table
CREATE TABLE IF NOT EXISTS fraud_alerts (
  id TEXT PRIMARY KEY,
  pattern_type TEXT NOT NULL,
  involved_accounts TEXT[] NOT NULL DEFAULT '{}',
  linked_transaction_ids TEXT[] NOT NULL DEFAULT '{}',
  total_amount NUMERIC NOT NULL DEFAULT 0,
  confidence_score NUMERIC NOT NULL DEFAULT 0,
  shap_narrative TEXT NOT NULL DEFAULT '',
  shap_factors JSONB NOT NULL DEFAULT '[]'::jsonb,
  severity TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open',
  assigned_investigator TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE fraud_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to fraud_alerts"
  ON fraud_alerts FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow insert to fraud_alerts"
  ON fraud_alerts FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow update to fraud_alerts"
  ON fraud_alerts FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- investigator_feedback table
CREATE TABLE IF NOT EXISTS investigator_feedback (
  id TEXT PRIMARY KEY,
  alert_id TEXT NOT NULL REFERENCES fraud_alerts(id),
  investigator_action TEXT NOT NULL,
  investigator_name TEXT NOT NULL DEFAULT 'Investigator',
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE investigator_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to investigator_feedback"
  ON investigator_feedback FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow insert to investigator_feedback"
  ON investigator_feedback FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- str_ctr_reports table
CREATE TABLE IF NOT EXISTS str_ctr_reports (
  id TEXT PRIMARY KEY,
  alert_ids TEXT[] NOT NULL DEFAULT '{}',
  report_type TEXT NOT NULL DEFAULT 'STR',
  goaml_xml TEXT NOT NULL DEFAULT '',
  narrative TEXT NOT NULL DEFAULT '',
  subject_details JSONB NOT NULL DEFAULT '{}'::jsonb,
  transaction_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  generation_time_seconds INTEGER NOT NULL DEFAULT 0,
  submission_status TEXT NOT NULL DEFAULT 'draft',
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE str_ctr_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to str_ctr_reports"
  ON str_ctr_reports FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow insert to str_ctr_reports"
  ON str_ctr_reports FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow update to str_ctr_reports"
  ON str_ctr_reports FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- federated_nodes table
CREATE TABLE IF NOT EXISTS federated_nodes (
  id TEXT PRIMARY KEY,
  bank_name TEXT NOT NULL,
  bank_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  last_sync_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  alerts_contributed INTEGER NOT NULL DEFAULT 0,
  model_version TEXT NOT NULL DEFAULT 'v1.0.0',
  precision_score NUMERIC NOT NULL DEFAULT 0,
  recall_score NUMERIC NOT NULL DEFAULT 0,
  f1_score NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE federated_nodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to federated_nodes"
  ON federated_nodes FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow update to federated_nodes"
  ON federated_nodes FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);
