import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

function loadEnvFile(fileUrl) {
  const filePath = fileURLToPath(fileUrl);

  if (!existsSync(filePath)) {
    return;
  }

  for (const line of readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
      continue;
    }

    const [key, ...valueParts] = trimmed.split('=');
    const value = valueParts.join('=').trim();

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(new URL('../../.env', import.meta.url));
loadEnvFile(new URL('../../.env.local', import.meta.url));
loadEnvFile(new URL('../../backend/.env', import.meta.url));

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error('Missing Supabase environment variables. Set SUPABASE_URL and SUPABASE_ANON_KEY.');
}

const REST_BASE = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1`;

function buildHeaders(extraHeaders = {}) {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Prefer: 'return=representation',
    ...extraHeaders,
  };
}

async function parseResponse(response, url) {
  const bodyText = await response.text();
  const payload = bodyText ? JSON.parse(bodyText) : null;

  if (!response.ok) {
    const message = payload?.message || payload?.error || bodyText || response.statusText;
    throw new Error(`Supabase request failed for ${url}: ${message}`);
  }

  return payload;
}

function appendFilters(searchParams, filters = {}) {
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }

    if (Array.isArray(value)) {
      searchParams.set(key, `in.(${value.join(',')})`);
      continue;
    }

    if (typeof value === 'object' && value !== null && 'op' in value && 'value' in value) {
      searchParams.set(key, `${value.op}.${value.value}`);
      continue;
    }

    searchParams.set(key, `eq.${value}`);
  }
}

export function createSupabaseClient() {
  async function request(path, { method = 'GET', body, headers = {}, query = {} } = {}) {
    const url = new URL(`${REST_BASE}/${path}`);

    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === '') {
        continue;
      }

      url.searchParams.set(key, String(value));
    }

    const response = await fetch(url, {
      method,
      headers: buildHeaders(headers),
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    return parseResponse(response, url.toString());
  }

  return {
    async select(table, { columns = '*', filters = {}, order, limit, offset } = {}) {
      const query = new URLSearchParams();
      query.set('select', columns);
      appendFilters(query, filters);

      if (order?.column) {
        query.set('order', `${order.column}.${order.ascending === false ? 'desc' : 'asc'}`);
      }

      if (limit !== undefined) {
        query.set('limit', String(limit));
      }

      if (offset !== undefined) {
        query.set('offset', String(offset));
      }

      const response = await fetch(`${REST_BASE}/${table}?${query.toString()}`, {
        headers: buildHeaders({ Prefer: 'return=representation' }),
      });

      return parseResponse(response, `${REST_BASE}/${table}`);
    },
    insert(table, rows) {
      return request(table, { method: 'POST', body: rows });
    },
    update(table, values, filters = {}) {
      const query = new URLSearchParams();
      appendFilters(query, filters);
      return request(`${table}?${query.toString()}`, { method: 'PATCH', body: values });
    },
  };
}