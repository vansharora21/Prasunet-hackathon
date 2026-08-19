import 'server-only';
import type { FraudAlert } from './types';

/**
 * Groq LLM integration for human-readable fraud alert summaries.
 *
 * Uses Groq's OpenAI-compatible chat completions endpoint. The model is
 * configured via GROQ_MODEL (default: llama-3.3-70b-versatile). If
 * GROQ_API_KEY is not set, the helper throws so the route can return a
 * friendly 503 instead of failing silently.
 */

const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

export type AlertSummary = {
  summary: string;
  recommendedAction: string;
  riskRationale: string;
  model: string;
};

function groqHeaders() {
  const key = process.env.GROQ_API_KEY || '';
  if (!key) throw new Error('GROQ_API_KEY is not configured on the server.');
  return {
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  };
}

function buildPrompt(alert: FraudAlert): { system: string; user: string } {
  const factors = (alert.shap_factors || [])
    .map((f) => `- ${f.factor} (weight ${(f.weight * 100).toFixed(0)}%, ${f.direction})`)
    .join('\n');

  const system = [
    'You are a senior AML/financial-crime investigator for Union Bank of India.',
    'Write a concise, decision-ready summary of a fraud alert in plain English.',
    'Return ONLY valid JSON with exactly these keys: summary, recommendedAction, riskRationale.',
    '- summary: 2-3 sentences explaining what happened and why it is suspicious.',
    '- recommendedAction: one concrete next step for the investigator (e.g. "Request source of funds documentation for the 3 linked accounts before closing").',
    '- riskRationale: 1-2 sentences explaining the risk in business terms.',
    'Do not use markdown. Do not include anything outside the JSON object.',
  ].join(' ');

  const user = [
    `Pattern: ${alert.pattern_type}`,
    `Severity: ${alert.severity}`,
    `Confidence: ${(alert.confidence_score * 100).toFixed(0)}%`,
    `Total exposure: INR ${alert.total_amount.toLocaleString('en-IN')}`,
    `Number of involved accounts: ${alert.involved_accounts.length}`,
    `Linked transactions: ${alert.linked_transaction_ids.length}`,
    '',
    'ML SHAP narrative:',
    alert.shap_narrative,
    '',
    'Key risk factors:',
    factors || '(none provided)',
  ].join('\n');

  return { system, user };
}

function parseSummary(raw: string): AlertSummary {
  // Groq sometimes wraps JSON in ```json fences — strip them defensively.
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim();

  const jsonStart = cleaned.indexOf('{');
  const jsonEnd = cleaned.lastIndexOf('}');
  if (jsonStart === -1 || jsonEnd === -1) {
    throw new Error('Groq response was not valid JSON.');
  }

  const parsed = JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1)) as Partial<AlertSummary>;
  return {
    summary: parsed.summary || 'No summary provided.',
    recommendedAction: parsed.recommendedAction || 'Review the alert details and take appropriate action.',
    riskRationale: parsed.riskRationale || 'No rationale provided.',
    model: '',
  };
}

/**
 * Generate a plain-English summary of a fraud alert via Groq.
 * Throws if the API key is missing or the request fails.
 */
export async function summarizeAlert(alert: FraudAlert): Promise<AlertSummary> {
  const { system, user } = buildPrompt(alert);
  const model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

  const response = await fetch(GROQ_ENDPOINT, {
    method: 'POST',
    headers: groqHeaders(),
    body: JSON.stringify({
      model,
      temperature: 0.3,
      max_tokens: 400,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      response_format: { type: 'json_object' },
    }),
    cache: 'no-store',
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Groq request failed (${response.status}): ${text.slice(0, 300)}`);
  }

  const payload = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };

  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error('Groq returned an empty response.');

  const summary = parseSummary(content);
  summary.model = model;
  return summary;
}
