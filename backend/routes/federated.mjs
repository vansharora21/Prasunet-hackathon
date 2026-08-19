export async function handleFederatedNodes(req, res, url, supabase, jsonResponse) {
  if (url.pathname !== '/api/federated-nodes') return false;

  const nodes = await supabase.select('federated_nodes', {
    order: { column: 'alerts_contributed', ascending: false },
    limit: 100,
  });

  jsonResponse(res, 200, { data: nodes });
  return true;
}
