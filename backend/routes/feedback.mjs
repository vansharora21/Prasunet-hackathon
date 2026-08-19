export async function handleFeedback(req, res, url, supabase, readJsonBody, jsonResponse) {
  if (url.pathname !== '/api/feedback' || req.method !== 'POST') return false;

  const body = await readJsonBody(req);
  if (!body.alert_id) {
    jsonResponse(res, 400, { error: 'alert_id is required' });
    return true;
  }

  const feedbackRecord = {
    id: body.id || `FB_${Date.now()}`,
    alert_id: body.alert_id,
    investigator_action: body.investigator_action || 'reviewed',
    investigator_name: body.investigator_name || 'Investigations Desk',
    notes: body.notes || '',
    created_at: new Date().toISOString(),
  };

  await supabase.update('fraud_alerts', {
    status: body.status || 'confirmed',
    assigned_investigator: body.investigator_name || 'Investigations Desk',
    notes: body.notes || '',
    updated_at: new Date().toISOString(),
  }, { id: body.alert_id });

  const inserted = await supabase.insert('investigator_feedback', [feedbackRecord]);
  jsonResponse(res, 201, { feedback: inserted?.[0] || feedbackRecord });
  return true;
}

export async function handleInvestigatorFeedback(req, res, url, supabase, jsonResponse) {
  if (url.pathname !== '/api/investigator-feedback') return false;

  const alertId = url.searchParams.get('alert_id');
  const limit = Number(url.searchParams.get('limit') || 30);
  const filters = alertId ? { alert_id: alertId } : {};

  const feedback = await supabase.select('investigator_feedback', {
    filters,
    order: { column: 'created_at', ascending: false },
    limit,
  });

  jsonResponse(res, 200, { data: feedback });
  return true;
}
