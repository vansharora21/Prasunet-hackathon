export function handleHealth(req, res, url, jsonResponse) {
  if (url.pathname !== '/health') return false;

  jsonResponse(res, 200, {
    ok: true,
    service: 'graphsentinel-backend',
    timestamp: new Date().toISOString(),
  });

  return true;
}
