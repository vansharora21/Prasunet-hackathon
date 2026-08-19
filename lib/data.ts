import 'server-only';
import { cache } from 'react';
import { supabase } from './supabase';
import type { Account, FraudAlert, FraudPattern, Transaction, StrCtrReport, FederatedNode } from './types';

/**
 * Shared dataset loading + alert deduplication logic.
 * Wrapped in React.cache() so multiple server components on the same request
 * share one Supabase round-trip instead of firing 6 queries each.
 */

export const loadDataset = cache(async function loadDataset() {
  const [accounts, transactions, alerts, reports, patterns, nodes] = await Promise.all([
    supabase.select<Account>('accounts', { order: { column: 'created_at', ascending: true }, limit: 1000 }),
    supabase.select<Transaction>('transactions', { order: { column: 'timestamp', ascending: true }, limit: 5000 }),
    supabase.select<FraudAlert>('fraud_alerts', { order: { column: 'created_at', ascending: false }, limit: 1000 }),
    supabase.select<StrCtrReport>('str_ctr_reports', { order: { column: 'created_at', ascending: false }, limit: 1000 }),
    supabase.select<FraudPattern>('fraud_patterns', { order: { column: 'created_at', ascending: true }, limit: 100 }),
    supabase.select<FederatedNode>('federated_nodes', { order: { column: 'alerts_contributed', ascending: false }, limit: 100 }),
  ]);

  return { accounts, transactions, alerts, reports, patterns, nodes };
});

/**
 * Deduplicates ML-generated alerts against the last 24 h of open alerts in
 * Supabase. Returns { toInsert, toUpdate } so callers can persist only net-new
 * records and update confidence on existing ones.
 */
export async function deduplicateAlerts(newAlerts: FraudAlert[]) {
  if (!newAlerts.length) return { toInsert: [] as FraudAlert[], toUpdate: [] as FraudAlert[] };

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const existing = await supabase.select<FraudAlert>('fraud_alerts', {
    order: { column: 'created_at', ascending: false },
    limit: 500,
  });

  const recentOpen = (existing || []).filter(
    (a) => a.status === 'open' && a.created_at >= cutoff,
  );

  const toInsert: FraudAlert[] = [];
  const toUpdate: FraudAlert[] = [];

  for (const alert of newAlerts) {
    const newAccounts = new Set(alert.involved_accounts || []);
    const duplicate = recentOpen.find(
      (a) =>
        a.pattern_type === alert.pattern_type &&
        (a.involved_accounts || []).some((id) => newAccounts.has(id)),
    );

    if (duplicate) {
      // Bump confidence & amount only if the new score is higher
      if (alert.confidence_score > (duplicate.confidence_score || 0)) {
        toUpdate.push({
          ...duplicate,
          confidence_score: alert.confidence_score,
          total_amount: alert.total_amount,
          shap_narrative: alert.shap_narrative,
          shap_factors: alert.shap_factors,
          notes: alert.notes,
          updated_at: new Date().toISOString(),
        });
      }
    } else {
      toInsert.push(alert);
    }
  }

  return { toInsert, toUpdate };
}