export async function handleFraudAlerts(req, res, url, supabase, readJsonBody, jsonResponse) {
  if (url.pathname !== '/api/fraud-alerts') return false;

  if (req.method === 'GET') {
    const alerts = await supabase.select('fraud_alerts', {
      order: { column: 'created_at', ascending: false },
      limit: 1000,
    });
    jsonResponse(res, 200, { data: alerts });
    return true;
  }

  if (req.method === 'PATCH') {
    const body = await readJsonBody(req);
    if (!body.id) {
      jsonResponse(res, 400, { error: 'id is required' });
      return true;
    }

    const { id, ...updates } = body;
    const updated = await supabase.update('fraud_alerts', updates, { id });
    jsonResponse(res, 200, { alert: updated?.[0] || { id, ...updates } });
    return true;
  }

  return false;
}

export async function handleFraudPatterns(req, res, url, supabase, readJsonBody, jsonResponse) {
  if (url.pathname !== '/api/fraud-patterns') return false;

  if (req.method === 'GET') {
    const patterns = await supabase.select('fraud_patterns', {
      order: { column: 'created_at', ascending: true },
      limit: 100,
    });
    jsonResponse(res, 200, { data: patterns });
    return true;
  }

  if (req.method === 'PATCH') {
    const body = await readJsonBody(req);
    if (!body.id) {
      jsonResponse(res, 400, { error: 'id is required' });
      return true;
    }

    const { id, ...updates } = body;
    const updated = await supabase.update('fraud_patterns', updates, { id });
    jsonResponse(res, 200, { pattern: updated?.[0] || { id, ...updates } });
    return true;
  }

  return false;
}
