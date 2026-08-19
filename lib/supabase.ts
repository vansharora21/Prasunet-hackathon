import 'server-only';

/**
 * Supabase REST client for server-side use.
 * Mirrors the original backend/lib/supabase.mjs behavior exactly, but typed.
 * Uses the PostgREST REST API directly (no @supabase/supabase-js needed server-side).
 */

const SUPABASE_URL: string =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  '';
const SUPABASE_KEY: string =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  '';

function requireConfig() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.');
  }
  return `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1`;
}

function buildHeaders(extraHeaders: Record<string, string> = {}) {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Prefer: 'return=representation',
    ...extraHeaders,
  };
}

async function parseResponse(response: Response, url: string) {
  const bodyText = await response.text();
  const payload = bodyText ? JSON.parse(bodyText) : null;

  if (!response.ok) {
    const message = payload?.message || payload?.error || bodyText || response.statusText;
    throw new Error(`Supabase request failed for ${url}: ${message}`);
  }

  return payload;
}

export type FilterValue = string | number | boolean | string[] | { op: string; value: string };

function appendFilters(searchParams: URLSearchParams, filters: Record<string, FilterValue> = {}) {
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }

    if (Array.isArray(value)) {
      searchParams.set(key, `in.(${value.join(',')})`);
      continue;
    }

    if (typeof value === 'object' && 'op' in value && 'value' in value) {
      searchParams.set(key, `${value.op}.${value.value}`);
      continue;
    }

    searchParams.set(key, `eq.${value}`);
  }
}

export type SelectOptions = {
  columns?: string;
  filters?: Record<string, FilterValue>;
  order?: { column: string; ascending?: boolean };
  limit?: number;
  offset?: number;
};

export const supabase = {
  async select<T = Record<string, unknown>>(table: string, options: SelectOptions = {}): Promise<T[]> {
    const { columns = '*', filters = {}, order, limit, offset } = options;
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

    const response = await fetch(`${requireConfig()}/${table}?${query.toString()}`, {
      headers: buildHeaders({ Prefer: 'return=representation' }),
      cache: 'no-store',
    });

    return parseResponse(response, `${requireConfig()}/${table}`);
  },

  async insert<T = Record<string, unknown>>(table: string, rows: unknown[]): Promise<T[]> {
    const url = new URL(`${requireConfig()}/${table}`);
    const response = await fetch(url, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(rows),
      cache: 'no-store',
    });

    return parseResponse(response, url.toString());
  },

  async update<T = Record<string, unknown>>(
    table: string,
    values: Record<string, unknown>,
    filters: Record<string, FilterValue> = {}
  ): Promise<T[]> {
    const query = new URLSearchParams();
    appendFilters(query, filters);
    const url = new URL(`${requireConfig()}/${table}?${query.toString()}`);
    const response = await fetch(url, {
      method: 'PATCH',
      headers: buildHeaders(),
      body: JSON.stringify(values),
      cache: 'no-store',
    });

    return parseResponse(response, url.toString());
  },
};