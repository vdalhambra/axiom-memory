// GET /api/sync/manifest — return the list of files (path + sha256) for the authed user.
import { authUser, supabaseService, corsHeaders } from '../_lib/auth.js';

export const config = { runtime: 'edge' };

export default async function handler(req) {
  const headers = { 'Content-Type': 'application/json', ...corsHeaders(req) };
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (req.method !== 'GET') return new Response('method_not_allowed', { status: 405, headers });

  const user = await authUser(req);
  if (!user) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers });

  const sb = supabaseService();
  const { data, error } = await sb
    .from('memory_files')
    .select('path, sha256, bytes, updated_at')
    .eq('user_id', user.id);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers });

  return new Response(JSON.stringify({ files: data || [] }), { status: 200, headers });
}
