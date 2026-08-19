import 'server-only';
import type { Account, FraudAlert, FraudPattern, Transaction } from './types';

/**
 * Client for the Python ML service (backend/ml_service.py).
 * The service runs as a separate process on ML_SERVICE_URL (default :8790).
 * It exposes POST /analyze and POST /retrain.
 */

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://127.0.0.1:8790';

async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${ML_SERVICE_URL.replace(/\/$/, '')}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error((payload as { error?: string })?.error || `ML service returned ${response.status}`);
  }

  return payload as T;
}

export type AnalyzePayload = {
  accounts: Account[];
  transactions: Transaction[];
  patterns: FraudPattern[];
};

export type AnalyzeResponse = {
  ok: boolean;
  model: string;
  version: string;
  count: number;
  alerts: FraudAlert[];
};

export type RetrainPayload = {
  accounts: Account[];
  transactions: Transaction[];
  alerts: FraudAlert[];
  patterns: FraudPattern[];
  feedback: unknown[];
  epochs?: number;
};

export type RetrainResponse = {
  ok: boolean;
  model: string;
  trained_samples: number;
  epochs: number;
  version: string;
  history?: Record<string, number[]>;
};

export async function analyzeWithMlService(payload: AnalyzePayload): Promise<AnalyzeResponse> {
  return post<AnalyzeResponse>('/analyze', payload);
}

export async function retrainMlService(payload: RetrainPayload): Promise<RetrainResponse> {
  return post<RetrainResponse>('/retrain', payload);
}