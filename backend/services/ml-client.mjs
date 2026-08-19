const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://127.0.0.1:8790';

export async function loadDataset(supabase) {
  const [accounts, transactions, alerts, reports, patterns, nodes] = await Promise.all([
    supabase.select('accounts', { order: { column: 'created_at', ascending: true }, limit: 1000 }),
    supabase.select('transactions', { order: { column: 'timestamp', ascending: true }, limit: 5000 }),
    supabase.select('fraud_alerts', { order: { column: 'created_at', ascending: false }, limit: 1000 }),
    supabase.select('str_ctr_reports', { order: { column: 'created_at', ascending: false }, limit: 1000 }),
    supabase.select('fraud_patterns', { order: { column: 'created_at', ascending: true }, limit: 100 }),
    supabase.select('federated_nodes', { order: { column: 'alerts_contributed', ascending: false }, limit: 100 }),
  ]);

  return { accounts, transactions, alerts, reports, patterns, nodes };
}

export async function analyzeWithMlService(dataset) {
  const response = await fetch(`${ML_SERVICE_URL.replace(/\/$/, '')}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(dataset),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error || `ML service returned ${response.status}`);
  }
  return payload;
}

export async function retrainMlService(dataset) {
  const response = await fetch(`${ML_SERVICE_URL.replace(/\/$/, '')}/retrain`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(dataset),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error || `ML service returned ${response.status}`);
  }
  return payload;
}
