'use client';

import type {
  Account,
  FederatedNode,
  FraudAlert,
  FraudPattern,
  InvestigatorFeedback,
  GraphEdge,
  StrCtrReport,
  Transaction,
  DashboardSummary,
  GraphData,
  AnalyzeResult,
} from '@/lib/types';

/**
 * Client-side API client. Calls the Next.js route handlers on the same origin
 * (relative paths). Migrated from src/lib/api.ts.
 */

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    ...init,
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(payload?.error || `Request failed for ${path}`);
  }

  return payload as T;
}

export async function fetchDashboardSummary() {
  return request<DashboardSummary>('/api/summary');
}

export async function fetchTransactions(limit = 200) {
  const { data } = await request<{ data: Transaction[] }>(`/api/transactions?limit=${limit}`);
  return data || [];
}

export async function fetchAlerts() {
  const { data } = await request<{ data: FraudAlert[] }>('/api/fraud-alerts');
  return data || [];
}

export async function fetchAccounts() {
  const { data } = await request<{ data: Account[] }>('/api/accounts');
  return data || [];
}

export async function fetchReports() {
  const { data } = await request<{ data: StrCtrReport[] }>('/api/reports');
  return data || [];
}

export async function fetchPatterns() {
  const { data } = await request<{ data: FraudPattern[] }>('/api/fraud-patterns');
  return data || [];
}

export async function fetchFederatedNodes() {
  const { data } = await request<{ data: FederatedNode[] }>('/api/federated-nodes');
  return data || [];
}

export async function fetchGraph() {
  return request<GraphData>('/api/graph');
}

export async function fetchFeedback(alertId: string) {
  const { data } = await request<{ data: InvestigatorFeedback[] }>(`/api/investigator-feedback?alert_id=${encodeURIComponent(alertId)}`);
  return data || [];
}

export async function fetchAuditLog(limit = 30) {
  const { data } = await request<{ data: InvestigatorFeedback[] }>(`/api/investigator-feedback?limit=${limit}`);
  return data || [];
}

export async function updateAlert(payload: Partial<FraudAlert> & { id: string }) {
  return request<{ alert: FraudAlert }>('/api/fraud-alerts', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function updatePattern(payload: Partial<FraudPattern> & { id: string }) {
  return request<{ pattern: FraudPattern }>('/api/fraud-patterns', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function postFeedback(payload: {
  alert_id: string;
  status: string;
  investigator_action: string;
  investigator_name: string;
  notes: string;
}) {
  return request<{ feedback: InvestigatorFeedback }>('/api/feedback', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function generateReport(payload: {
  alertIds: string[];
  reportType: 'STR' | 'CTR';
  narrative: string;
  submissionStatus?: 'draft' | 'submitted';
}) {
  return request<{ report: StrCtrReport; xml: string }>('/api/reports/generate', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateReport(payload: Partial<StrCtrReport> & { id: string }) {
  return request<{ report: StrCtrReport }>('/api/reports', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function submitReport(id: string) {
  return request<{ report: StrCtrReport }>('/api/report/submit', {
    method: 'POST',
    body: JSON.stringify({ id }),
  });
}

export async function retrainModel(payload?: { epochs?: number; feedbackLimit?: number }) {
  return request<Record<string, unknown>>('/api/retrain', {
    method: 'POST',
    body: JSON.stringify(payload || {}),
  });
}

export async function postTransaction(payload: {
  sender_account_id: string;
  receiver_account_id: string;
  amount: number;
  channel?: string;
  status?: string;
}) {
  return request<{ transaction: Transaction; alerts: FraudAlert[] }>('/api/transactions', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function triggerAnalysis() {
  return request<AnalyzeResult>('/api/analyze', {
    method: 'POST',
  });
}

// ── Groq AI summaries ───────────────────────────────────────────────

export type AlertSummary = {
  summary: string;
  recommendedAction: string;
  riskRationale: string;
  model: string;
};

export async function summarizeAlert(alert: FraudAlert) {
  return request<{ summary: AlertSummary }>('/api/ai/summarize', {
    method: 'POST',
    body: JSON.stringify({ alert }),
  });
}

// ── Vector DB + FalkorDB intelligence ─────────────────────────────

export type VectorSearchResult = {
  alert: FraudAlert;
  similarity: number;
};

export async function searchVector(query: string, limit = 10) {
  return request<{ query: string; results: VectorSearchResult[] }>('/api/vector/search', {
    method: 'POST',
    body: JSON.stringify({ query, limit }),
  });
}

export async function indexVectors() {
  return request<{ indexed: number; status: string }>('/api/vector/index', {
    method: 'POST',
  });
}

export type GraphIntelligence = {
  nodeCount: number;
  edgeCount: number;
  communities: { id: string; member_account_ids: string[]; total_flow: number; suspicious_edge_count: number }[];
  suspiciousChains: { source_account_id: string; target_account_id: string; path_account_ids: string[]; hop_count: number; total_amount: number; is_suspicious: boolean }[];
};

export async function fetchGraphIntelligence() {
  return request<GraphIntelligence>('/api/graph-db');
}

export async function findShortestPath(source: string, target: string) {
  return request<{ path: { source_account_id: string; target_account_id: string; path_account_ids: string[]; hop_count: number; total_amount: number; is_suspicious: boolean } | null; message?: string }>('/api/graph-db', {
    method: 'POST',
    body: JSON.stringify({ source_account_id: source, target_account_id: target }),
  });
}