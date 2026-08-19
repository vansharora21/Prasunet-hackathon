export async function handleAccounts(req, res, url, supabase, readJsonBody, jsonResponse) {
  if (url.pathname !== '/api/accounts') return false;

  if (req.method === 'GET') {
    const accounts = await supabase.select('accounts', {
      order: { column: 'created_at', ascending: true },
      limit: 1000,
    });
    jsonResponse(res, 200, { data: accounts });
    return true;
  }

  if (req.method === 'POST') {
    const body = await readJsonBody(req);
    const payload = {
      id: body.id || `ACC_${Date.now()}`,
      holder_name: body.holder_name,
      bank_branch: body.bank_branch,
      account_type: body.account_type || 'savings',
      declared_profession: body.declared_profession || 'salaried',
      declared_annual_income: body.declared_annual_income || 0,
      created_at: body.created_at || new Date().toISOString(),
      last_activity_at: body.last_activity_at || new Date().toISOString(),
      is_dormant: Boolean(body.is_dormant),
      risk_score: body.risk_score || 0,
      risk_level: body.risk_level || 'low',
    };

    const inserted = await supabase.insert('accounts', [payload]);
    jsonResponse(res, 201, { account: inserted?.[0] || payload });
    return true;
  }

  return false;
}
