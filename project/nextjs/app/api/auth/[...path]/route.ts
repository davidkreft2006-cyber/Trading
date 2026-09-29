/*
  Anmeldung über die eigene Domain an Neon Auth weiterleiten.
  Safari (und iOS generell) blockiert Cookies von fremden Domains. Läuft die Anmeldung
  direkt gegen *.neon.tech, wird das Sitzungs-Cookie verworfen und man ist sofort wieder
  abgemeldet. Über diesen Proxy setzt die eigene Domain das Cookie (First-Party).
  Vorbild: authApiHandler aus @neondatabase/auth/next.
*/
import type { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

const AUTH_BASE = process.env.NEON_AUTH_BASE_URL
  ?? 'https://ep-odd-glade-b1ncnkm9.neonauth.c-5.eu-central-1.aws.neon.tech/neondb/auth';
const COOKIE_PREFIX = '__Secure-neon-auth';
const FORWARD_HEADERS = ['user-agent', 'authorization', 'referer', 'content-type'];
const RETURN_HEADERS = ['content-type', 'set-auth-jwt', 'set-auth-token', 'x-neon-ret-request-id'];

/** Upstream-Cookie für die eigene Domain umschreiben: ohne Domain/Partitioned, SameSite=Lax, Secure */
function rewriteCookie(raw: string) {
  const [pair, ...attrs] = raw.split(';').map(s => s.trim());
  const keep = attrs.filter(a => !/^(domain|samesite|partitioned|secure)\b/i.test(a));
  return [pair, ...keep, 'Secure', 'SameSite=Lax'].join('; ');
}

async function handle(req: NextRequest, { params }: { params: { path: string[] } }) {
  const url = new URL(`${AUTH_BASE}/${params.path.map(encodeURIComponent).join('/')}`);
  url.search = req.nextUrl.search;

  const headers = new Headers();
  for (const h of FORWARD_HEADERS) { const v = req.headers.get(h); if (v) headers.set(h, v); }
  headers.set('Origin', req.headers.get('origin') ?? req.nextUrl.origin);
  headers.set('x-neon-auth-middleware', 'true');
  const cookies = req.cookies.getAll().filter(c => c.name.startsWith(COOKIE_PREFIX)).map(c => `${c.name}=${c.value}`).join('; ');
  if (cookies) headers.set('Cookie', cookies);

  let upstream: Response;
  try {
    upstream = await fetch(url, {
      method: req.method,
      headers,
      body: req.method === 'GET' || req.method === 'HEAD' ? undefined : await req.text(),
      redirect: 'manual',
      cache: 'no-store'
    });
  } catch {
    return Response.json({ code: 'NETWORK_ERROR', message: 'Anmeldeserver nicht erreichbar' }, { status: 502 });
  }

  const out = new Headers({ 'cache-control': 'no-store' });
  for (const h of RETURN_HEADERS) { const v = upstream.headers.get(h); if (v) out.set(h, v); }
  for (const c of upstream.headers.getSetCookie()) out.append('Set-Cookie', rewriteCookie(c));
  const location = upstream.headers.get('location');
  if (location) out.set('location', location);

  return new Response(upstream.body, { status: upstream.status, statusText: upstream.statusText, headers: out });
}

export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE };
