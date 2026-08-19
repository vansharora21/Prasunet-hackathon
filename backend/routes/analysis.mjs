/**
 * Deduplicates ML-generated alerts against the last 24 h of open alerts.
 */
async function deduplicateAlerts(supabase, newAlerts) {
  if (!newAlerts.length) return { toInsert: [], toUpdate: [] };

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const existing = await supabase.select('fraud_alerts', {
    order: { column: 'created_at', ascending: false },
    limit: 500,
  });

  const recentOpen = (existing || []).filter(
    (a) => a.status === 'open' && a.created_at >= cutoff,
  );

  const toInsert = [];
  const toUpdate = [];

  for (const alert of newAlerts) {
    const newAccounts = new Set(alert.involved_accounts || []);
    const duplicate = recentOpen.find(
      (a) =>
        a.pattern_type === alert.pattern_type &&
        (a.involved_accounts || []).some((id) => newAccounts.has(id)),
    );

    if (duplicate) {
      if (alert.confidence_score > (duplicate.confidence_score || 0)) {
        toUpdate.push({
          id: duplicate.id,
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

export async function handleAnalyze(req, res, url, supabase, readJsonBody, jsonResponse, { loadDataset, analyzeWithMlService }) {
  if (url.pathname !== '/api/analyze' || req.method !== 'POST') return false;

  const dataset = await loadDataset();
  const analysis = await analyzeWithMlService({
    accounts: dataset.accounts,
    transactions: dataset.transactions,
    patterns: dataset.patterns,
  });

  const rawAlerts = analysis.alerts || [];
  const { toInsert, toUpdate } = await deduplicateAlerts(supabase, rawAlerts);

  if (toInsert.length) {
    await supabase.insert('fraud_alerts', toInsert);
  }

  for (const upd of toUpdate) {
    await supabase.update('fraud_alerts', upd, { id: upd.id });
  }

  jsonResponse(res, 200, {
    alerts: [...toInsert, ...toUpdate],
    inserted: toInsert.length,
    updated: toUpdate.length,
    deduplicated: rawAlerts.length - toInsert.length - toUpdate.length,
    count: toInsert.length + toUpdate.length,
    model: analysis.model || 'python-ml-service',
  });
  return true;
}

export async function handleRetrain(req, res, url, supabase, readJsonBody, jsonResponse, { loadDataset, retrainMlService }) {
  if (url.pathname !== '/api/retrain' || req.method !== 'POST') return false;

  const body = await readJsonBody(req);
  const dataset = await loadDataset();
  const feedback = await supabase.select('investigator_feedback', {
    order: { column: 'created_at', ascending: false },
    limit: Number(body.feedbackLimit || 200),
  });

  const metrics = await retrainMlService({
    ...dataset,
    feedback,
    epochs: Number(body.epochs || 5),
  });

  jsonResponse(res, 200, metrics);
  return true;
}
