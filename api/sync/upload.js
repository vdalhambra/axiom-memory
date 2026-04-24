// POST /api/sync/upload — write a single memory file for the authenticated user.
import { authUser, supabaseService, corsHeaders } from '../_lib/auth.js';

export const config = { runtime: 'edge' };

async function sha256(str) {
  const data = new TextEncoder().encode(str);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export default async function handler(req) {
  const headers = { 'Content-Type': 'application/json', ...corsHeaders(req) };
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (req.method !== 'POST') return new Response('method_not_allowed', { status: 405, headers });

  const user = await authUser(req);
  if (!user) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers });

  let body;
  try { body = await req.json(); } catch { return new Response(JSON.stringify({ error: 'bad_json' }), { status: 400, headers }); }

  const path = String(body.path || '').trim();
  const content = String(body.content || '');
  if (!path || path.includes('..') || path.startsWith('/')) {
    return new Response(JSON.stringify({ error: 'invalid_path' }), { status: 400, headers });
  }
  if (content.length > 500_000) {
    return new Response(JSON.stringify({ error: 'too_large' }), { status: 413, headers });
  }

  const hash = await sha256(content);
  const sb = supabaseService();
  const { error } = await sb.from('memory_files').upsert(
    [{ user_id: user.id, path, sha256: hash, content, bytes: content.length, updated_at: new Date().toISOString() }],
    { onConflict: 'user_id,path' },
  );
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers });

  return new Response(JSON.stringify({ ok: true, sha256: hash }), { status: 200, headers });
}
