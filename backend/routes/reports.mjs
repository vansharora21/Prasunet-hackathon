import { generateGoamlXml } from '../services/goaml.mjs';

export async function handleReports(req, res, url, supabase, readJsonBody, jsonResponse, loadDataset) {
  if (url.pathname !== '/api/reports') return false;

  if (req.method === 'GET') {
    const reports = await supabase.select('str_ctr_reports', {
      order: { column: 'created_at', ascending: false },
      limit: 1000,
    });
    jsonResponse(res, 200, { data: reports });
    return true;
  }

  if (req.method === 'PATCH') {
    const body = await readJsonBody(req);
    if (!body.id) {
      jsonResponse(res, 400, { error: 'id is required' });
      return true;
    }

    const { id, ...updates } = body;
    const updated = await supabase.update('str_ctr_reports', updates, { id });
    jsonResponse(res, 200, { report: updated?.[0] || { id, ...updates } });
    return true;
  }

  return false;
}

export async function handleReportSubmit(req, res, url, supabase, readJsonBody, jsonResponse) {
  if (url.pathname !== '/api/report/submit' || req.method !== 'POST') return false;

  const body = await readJsonBody(req);
  if (!body.id) {
    jsonResponse(res, 400, { error: 'id is required' });
    return true;
  }

  const now = new Date().toISOString();
  const updated = await supabase.update('str_ctr_reports', {
    submission_status: 'submitted',
    submitted_at: now,
  }, { id: body.id });

  jsonResponse(res, 200, {
    report: updated?.[0] || { id: body.id, submission_status: 'submitted', submitted_at: now },
  });
  return true;
}

export async function handleReportGenerate(req, res, url, supabase, readJsonBody, jsonResponse, loadDataset) {
  if (url.pathname !== '/api/reports/generate' || req.method !== 'POST') return false;

  const body = await readJsonBody(req);
  const reportType = body.reportType || 'STR';
  const dataset = await loadDataset();

  const alerts = (body.alertIds?.length
    ? dataset.alerts.filter((alert) => body.alertIds.includes(alert.id))
    : dataset.alerts.filter((alert) => alert.status === 'open')
  ).sort((left, right) => right.confidence_score - left.confidence_score);

  const transactions = dataset.transactions.filter((transaction) =>
    alerts.some((alert) => (alert.linked_transaction_ids || []).includes(transaction.id))
  );

  const xml = generateGoamlXml({
    report: { id: body.id, report_type: reportType, narrative: body.narrative },
    alerts,
    accounts: dataset.accounts,
    transactions,
  });

  const subjectAccounts = [...new Set(alerts.flatMap((alert) => alert.involved_accounts || []))].slice(0, 5);
  const totalAmount = alerts.reduce((sum, alert) => sum + Number(alert.total_amount || 0), 0);

  const reportPayload = {
    id: body.id || `RPT_${Date.now()}`,
    alert_ids: alerts.map((alert) => alert.id),
    report_type: reportType,
    goaml_xml: xml,
    narrative: body.narrative || 'Automatically generated compliance package based on suspicious transaction alerts.',
    subject_details: {
      account_ids: subjectAccounts,
      alert_count: alerts.length,
    },
    transaction_summary: {
      total_alert_amount: Number(totalAmount.toFixed(2)),
      transaction_count: transactions.length,
    },
    generation_time_seconds: Number(body.generationTimeSeconds || 0),
    submission_status: body.submissionStatus || 'draft',
    submitted_at: body.submissionStatus === 'submitted' ? new Date().toISOString() : null,
  };

  const inserted = await supabase.insert('str_ctr_reports', [reportPayload]);
  jsonResponse(res, 201, {
    report: inserted?.[0] || reportPayload,
    xml,
  });
  return true;
}
