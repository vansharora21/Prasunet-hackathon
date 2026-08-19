import { summarizeGraph, summarizeDashboard } from '../services/detection.mjs';

export async function handleGraph(req, res, url, jsonResponse, loadDataset) {
  if (url.pathname !== '/api/graph') return false;

  const dataset = await loadDataset();
  jsonResponse(res, 200, summarizeGraph(dataset.accounts, dataset.transactions, dataset.alerts));
  return true;
}

export async function handleSummary(req, res, url, jsonResponse, loadDataset) {
  if (url.pathname !== '/api/summary') return false;

  const dataset = await loadDataset();
  jsonResponse(
    res,
    200,
    summarizeDashboard({
      accounts: dataset.accounts,
      transactions: dataset.transactions,
      alerts: dataset.alerts,
      reports: dataset.reports,
      nodes: dataset.nodes,
    }),
  );
  return true;
}
