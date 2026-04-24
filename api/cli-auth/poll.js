// GET /api/cli-auth/poll?code=XXX — CLI polls here. Returns 202 until the user approves.
import { supabaseService, corsHeaders } from '../_lib/auth.js';

export const config = { runtime: 'edge' };

export default async function handler(req) {
  const headers = { 'Content-Type': 'application/json', ...corsHeaders(req) };
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (req.method !== 'GET') return new Response('method_not_allowed', { status: 405, headers });

  const url = new URL(req.url);
  const code = url.searchParams.get('code') || '';
  if (!code || code.length < 16) {
    return new Response(JSON.stringify({ error: 'invalid_code' }), { status: 400, headers });
  }

  const sb = supabaseService();
  const { data, error } = await sb
    .from('cli_sessions')
    .select('code, user_id, access_token, refresh_token, approved_at')
    .eq('code', code)
    .limit(1);

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers });

  const row = (data || [])[0];

  if (!row) {
    await sb.from('cli_sessions').insert([{ code }], { onConflict: 'ignore-duplicates' });
    return new Response(JSON.stringify({ status: 'pending' }), { status: 202, headers });
  }

  if (!row.approved_at || !row.access_token) {
    return new Response(JSON.stringify({ status: 'pending' }), { status: 202, headers });
  }

  return new Response(
    JSON.stringify({
      status: 'approved',
      access_token: row.access_token,
      refresh_token: row.refresh_token,
    }),
    { status: 200, headers },
  );
}
