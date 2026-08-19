export type Account = {
  id: string;
  holder_name: string;
  bank_branch: string;
  account_type: string;
  declared_profession: string;
  declared_annual_income: number;
  created_at: string;
  last_activity_at: string;
  is_dormant: boolean;
  risk_score: number;
  risk_level: string;
};

export type Transaction = {
  id: string;
  sender_account_id: string;
  receiver_account_id: string;
  amount: number;
  channel: string;
  reference_number: string;
  status: string;
  timestamp: string;
  metadata: Record<string, unknown>;
};

export type GraphEdge = {
  id: string;
  source_account_id: string;
  target_account_id: string;
  total_amount: number;
  transaction_count: number;
  last_transaction_at: string;
  is_suspicious: boolean;
};

export type FraudPattern = {
  id: string;
  name: string;
  description: string;
  amount_ceiling: number;
  time_window_hours: number;
  hop_count: number;
  multiplier: number;
  is_enabled: boolean;
  created_at: string;
};

export type ShapFactor = {
  factor: string;
  weight: number;
  direction: 'increases_risk' | 'decreases_risk';
};

export type FraudAlert = {
  id: string;
  pattern_type: string;
  involved_accounts: string[];
  linked_transaction_ids: string[];
  total_amount: number;
  confidence_score: number;
  shap_narrative: string;
  shap_factors: ShapFactor[];
  severity: string;
  status: string;
  assigned_investigator: string;
  notes: string;
  created_at: string;
  updated_at: string;
};

export type InvestigatorFeedback = {
  id: string;
  alert_id: string;
  investigator_action: string;
  investigator_name: string;
  notes: string;
  created_at: string;
};

export type StrCtrReport = {
  id: string;
  alert_ids: string[];
  report_type: string;
  goaml_xml: string;
  narrative: string;
  subject_details: Record<string, string>;
  transaction_summary: Record<string, unknown>;
  generation_time_seconds: number;
  submission_status: string;
  submitted_at: string | null;
  created_at: string;
};

export type FederatedNode = {
  id: string;
  bank_name: string;
  bank_code: string;
  status: string;
  last_sync_at: string;
  alerts_contributed: number;
  model_version: string;
  precision_score: number;
  recall_score: number;
  f1_score: number;
  created_at: string;
};

export type DashboardSummary = {
  accounts: number;
  transactions: number;
  alerts: number;
  openAlerts: number;
  criticalAlerts: number;
  dormantAccounts: number;
  suspiciousVolume: number;
  draftReports: number;
  submittedReports: number;
  activeBanks: number;
};

export type GraphData = {
  nodes: Account[];
  edges: GraphEdge[];
};

export type AnalyzeResult = {
  alerts: FraudAlert[];
  inserted: number;
  updated: number;
  deduplicated: number;
  count: number;
  model: string;
};