import { createServer } from 'node:http';
import { URL } from 'node:url';
import { createSupabaseClient } from './services/supabase.mjs';
import { loadDataset, analyzeWithMlService, retrainMlService } from './services/ml-client.mjs';

// Route handlers
import { handleHealth } from './routes/health.mjs';
import { handleAccounts } from './routes/accounts.mjs';
import { handleTransactions } from './routes/transactions.mjs';
import { handleFraudAlerts, handleFraudPatterns } from './routes/alerts.mjs';
import { handleReports, handleReportSubmit, handleReportGenerate } from './routes/reports.mjs';
import { handleAnalyze, handleRetrain } from './routes/analysis.mjs';
import { handleFeedback, handleInvestigatorFeedback } from './routes/feedback.mjs';
import { handleFederatedNodes } from './routes/federated.mjs';
import { handleGraph, handleSummary } from './routes/graph.mjs';

const PORT = Number(process.env.PORT || 8787);
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
const supabase = createSupabaseClient();

function jsonResponse(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': CORS_ORIGIN,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
  });
  res.end(body);
}

function textResponse(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Access-Control-Allow-Origin': CORS_ORIGIN,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
  });
  res.end(payload);
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  if (chunks.length === 0) return {};
  const bodyText = Buffer.concat(chunks).toString('utf8');
  return bodyText ? JSON.parse(bodyText) : {};
}

const ctx = { supabase, readJsonBody, jsonResponse, loadDataset: () => loadDataset(supabase), analyzeWithMlService, retrainMlService };

async function handleRequest(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': CORS_ORIGIN,
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
    });
    res.end();
    return;
  }

  try {
    // Health check
    if (handleHealth(req, res, url, jsonResponse)) return;

    // Data routes
    if (await handleAccounts(req, res, url, supabase, readJsonBody, jsonResponse)) return;
    if (await handleTransactions(req, res, url, supabase, readJsonBody, jsonResponse, ctx)) return;
    if (await handleFraudAlerts(req, res, url, supabase, readJsonBody, jsonResponse)) return;
    if (await handleFraudPatterns(req, res, url, supabase, readJsonBody, jsonResponse)) return;
    if (await handleFederatedNodes(req, res, url, supabase, jsonResponse)) return;

    // Graph & summary
    if (await handleGraph(req, res, url, jsonResponse, ctx.loadDataset)) return;
    if (await handleSummary(req, res, url, jsonResponse, ctx.loadDataset)) return;

    // Analysis & retraining
    if (await handleAnalyze(req, res, url, supabase, readJsonBody, jsonResponse, ctx)) return;
    if (await handleRetrain(req, res, url, supabase, readJsonBody, jsonResponse, ctx)) return;

    // Reports
    if (await handleReports(req, res, url, supabase, readJsonBody, jsonResponse, ctx.loadDataset)) return;
    if (await handleReportSubmit(req, res, url, supabase, readJsonBody, jsonResponse)) return;
    if (await handleReportGenerate(req, res, url, supabase, readJsonBody, jsonResponse, ctx.loadDataset)) return;

    // Feedback
    if (await handleFeedback(req, res, url, supabase, readJsonBody, jsonResponse)) return;
    if (await handleInvestigatorFeedback(req, res, url, supabase, jsonResponse)) return;

    textResponse(res, 404, 'Not found');
  } catch (error) {
    jsonResponse(res, 500, {
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}

createServer(handleRequest).listen(PORT, () => {
  console.log(`GraphSentinel backend listening on http://localhost:${PORT}`);
});
