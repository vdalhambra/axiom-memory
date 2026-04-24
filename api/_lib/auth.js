// Shared helpers for edge API routes.

export const ALLOWED_ORIGINS = [
  'https://axiommemory.dev',
  'https://axiom-memory.vercel.app',
  'http://localhost:3000',
];

export function corsHeaders(req) {
  const origin = req.headers.get('origin') || '';
  const ok = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': ok,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

export function supabaseService() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('supabase_env_missing');
  return {
    async from(table) {
      const state = { table, filters: [], select: '*', order: null, limit: null };
      const build = () => {
        const qs = new URLSearchParams();
        if (state.select) qs.set('select', state.select);
        for (const f of state.filters) qs.append(f.col, `${f.op}.${f.val}`);
        if (state.order) qs.set('order', state.order);
        if (state.limit) qs.set('limit', state.limit);
        return `${url}/rest/v1/${state.table}?${qs.toString()}`;
      };
      const headersCommon = {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      };
      return {
        select(cols) { state.select = cols; return this; },
        eq(col, val) { state.filters.push({ col, op: 'eq', val }); return this; },
        order(col, { ascending = true } = {}) { state.order = `${col}.${ascending ? 'asc' : 'desc'}`; return this; },
        limit(n) { state.limit = n; return this; },
        async then(resolve) {
          const resp = await fetch(build(), { headers: headersCommon });
          if (!resp.ok) return resolve({ data: null, error: { message: await resp.text() } });
          return resolve({ data: await resp.json(), error: null });
        },
        async insert(rows, opts = {}) {
          const resp = await fetch(`${url}/rest/v1/${state.table}`, {
            method: 'POST',
            headers: {
              ...headersCommon,
              Prefer: `resolution=${opts.onConflict || 'ignore-duplicates'},return=representation`,
            },
            body: JSON.stringify(rows),
          });
          if (!resp.ok) return { data: null, error: { message: await resp.text() } };
          return { data: await resp.json(), error: null };
        },
        async upsert(rows, opts = {}) {
          const resp = await fetch(
            `${url}/rest/v1/${state.table}?on_conflict=${opts.onConflict || 'id'}`,
            {
              method: 'POST',
              headers: { ...headersCommon, Prefer: 'resolution=merge-duplicates,return=representation' },
              body: JSON.stringify(rows),
            },
          );
          if (!resp.ok) return { data: null, error: { message: await resp.text() } };
          return { data: await resp.json(), error: null };
        },
      };
    },
  };
}

export async function authUser(req) {
  const header = req.headers.get('authorization') || '';
  const m = header.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  const token = m[1];
  const url = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anon) return null;
  const resp = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: anon, Authorization: `Bearer ${token}` },
  });
  if (!resp.ok) return null;
  return await resp.json();
}
