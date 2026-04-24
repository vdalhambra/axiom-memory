// Vercel serverless function — waitlist signup
// Appends email to Supabase table `waitlist` or falls back to console + email forwarding via Resend.
// Zero paid infra required for launch — can upgrade to Supabase when volume justifies it.

export const config = { runtime: 'edge' };

const ALLOWED_ORIGINS = [
  'https://axiommemory.dev',
  'https://axiom-memory.vercel.app',
  'http://localhost:3000',
];

function cors(origin) {
  const ok = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': ok,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export default async function handler(req) {
  const origin = req.headers.get('origin') || '';
  const headers = { 'Content-Type': 'application/json', ...cors(origin) };

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers });

  let body;
  try { body = await req.json(); } catch { return new Response(JSON.stringify({ error: 'bad_json' }), { status: 400, headers }); }

  const email = (body.email || '').trim().toLowerCase();
  const source = (body.source || 'unknown').slice(0, 50);
  const userAgent = req.headers.get('user-agent')?.slice(0, 200) || '';
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '';

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new Response(JSON.stringify({ error: 'invalid_email' }), { status: 400, headers });
  }

  // Store via Supabase REST if configured, else log to console (Vercel logs capture it)
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  let supabaseStatus = 'skip';
  let supabaseError = null;
  if (SUPABASE_URL && SUPABASE_KEY) {
    try {
      const resp = await fetch(`${SUPABASE_URL}/rest/v1/waitlist`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=ignore-duplicates,return=minimal',
        },
        body: JSON.stringify({ email, source, user_agent: userAgent, ip }),
      });
      supabaseStatus = resp.status;
      if (!resp.ok && resp.status !== 409) {
        supabaseError = await resp.text();
        console.error('supabase waitlist insert failed', resp.status, supabaseError);
      }
    } catch (e) {
      supabaseStatus = 'threw';
      supabaseError = String(e);
      console.error('supabase call threw', e);
    }
  } else {
    console.log('[waitlist-no-supabase]', { email, source, SUPABASE_URL: !!SUPABASE_URL, SUPABASE_KEY: !!SUPABASE_KEY });
    supabaseStatus = 'env_missing';
  }

  // Optional: forward to Resend for founder notification
  const RESEND_KEY = process.env.RESEND_API_KEY;
  const NOTIFY_TO = process.env.WAITLIST_NOTIFY_EMAIL || 'vdalhambra@gmail.com';
  if (RESEND_KEY) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Axiom Memory <waitlist@axiommemory.dev>',
          to: NOTIFY_TO,
          subject: `New waitlist: ${email}`,
          text: `${email} joined from ${source}.`,
        }),
      });
    } catch (e) {
      console.error('resend notify failed', e);
    }
  }

  return new Response(JSON.stringify({ ok: true, debug: { supabaseStatus, supabaseError } }), { status: 200, headers });
}
