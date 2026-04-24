// GET /api/sync/fetch?path=... — return a single file's content.
import { authUser, supabaseService, corsHeaders } from '../_lib/auth.js';

export const config = { runtime: 'edge' };

export default async function handler(req) {
  const headers = { 'Content-Type': 'application/json', ...corsHeaders(req) };
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (req.method !== 'GET') return new Response('method_not_allowed', { status: 405, headers });

  const user = await authUser(req);
  if (!user) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers });

  const url = new URL(req.url);
  const path = url.searchParams.get('path') || '';
  if (!path) return new Response(JSON.stringify({ error: 'missing_path' }), { status: 400, headers });

  const sb = supabaseService();
  const { data, error } = await sb
    .from('memory_files')
    .select('path, content, sha256, bytes')
    .eq('user_id', user.id)
    .eq('path', path)
    .limit(1);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers });
  const row = (data || [])[0];
  if (!row) return new Response(JSON.stringify({ error: 'not_found' }), { status: 404, headers });

  return new Response(JSON.stringify({ ...row }), { status: 200, headers });
}
