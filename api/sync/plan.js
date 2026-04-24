// POST /api/sync/plan — compare client manifest to server state, return which files need uploading.
import { authUser, supabaseService, corsHeaders } from '../_lib/auth.js';

export const config = { runtime: 'edge' };

export default async function handler(req) {
  const headers = { 'Content-Type': 'application/json', ...corsHeaders(req) };
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (req.method !== 'POST') return new Response('method_not_allowed', { status: 405, headers });

  const user = await authUser(req);
  if (!user) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers });

  let body;
  try { body = await req.json(); } catch { return new Response(JSON.stringify({ error: 'bad_json' }), { status: 400, headers }); }
  const manifest = Array.isArray(body.manifest) ? body.manifest : [];

  const sb = supabaseService();
  const { data: existing, error } = await sb
    .from('memory_files')
    .select('path, sha256')
    .eq('user_id', user.id);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers });

  const remoteMap = new Map((existing || []).map((r) => [r.path, r.sha256]));
  const upload = manifest
    .filter((m) => remoteMap.get(m.path) !== m.sha256)
    .map((m) => m.path);

  return new Response(JSON.stringify({ upload }), { status: 200, headers });
}
