export async function handleTransactions(req, res, url, supabase, readJsonBody, jsonResponse, { loadDataset, analyzeWithMlService }) {
  if (url.pathname !== '/api/transactions') return false;

  if (req.method === 'GET') {
    const limit = Number(url.searchParams.get('limit') || 200);
    const transactions = await supabase.select('transactions', {
      order: { column: 'timestamp', ascending: false },
      limit,
    });
    jsonResponse(res, 200, { data: transactions });
    return true;
  }

  if (req.method === 'POST') {
    const body = await readJsonBody(req);
    const payload = {
      id: body.id || `TXN_${Date.now()}`,
      sender_account_id: body.sender_account_id,
      receiver_account_id: body.receiver_account_id,
      amount: body.amount,
      channel: body.channel || 'NEFT',
      reference_number: body.reference_number || `REF_${Date.now()}`,
      status: body.status || 'completed',
      timestamp: body.timestamp || new Date().toISOString(),
      metadata: body.metadata || {},
    };

    const inserted = await supabase.insert('transactions', [payload]);
    const dataset = await loadDataset();
    const analysis = await analyzeWithMlService({
      accounts: dataset.accounts,
      transactions: dataset.transactions,
      patterns: dataset.patterns,
    });

    jsonResponse(res, 201, {
      transaction: inserted?.[0] || payload,
      alerts: analysis.alerts || [],
    });
    return true;
  }

  if (req.method === 'PATCH') {
    const body = await readJsonBody(req);
    const id = body.id;
    if (!id) {
      jsonResponse(res, 400, { error: 'id is required' });
      return true;
    }

    const { id: _ignored, ...updates } = body;
    const updated = await supabase.update('transactions', updates, { id });
    jsonResponse(res, 200, { transaction: updated?.[0] || { id, ...updates } });
    return true;
  }

  return false;
}
