'use client';
/*
  Zugriff auf die Neon Data API (PostgREST) mit selbst verwaltetem Zugangs-Token.

  Warum nicht der Client aus @neondatabase/neon-js? Der entscheidet intern, welches Token
  er mitschickt. Ist das abgelaufen oder kein gültiges JWT (z. B. nach längerer Pause,
  gesperrtem Handy), kommt die Anfrage in der Datenbank als „nicht angemeldet“ an.
  Hier gilt stattdessen:
  - JWT kommt frisch von Neon Auth (über /api/auth auf der eigenen Domain) und wird geprüft
    (drei Teile, Nutzer-ID „sub“, Ablaufzeit).
  - Es wird bis kurz vor Ablauf wiederverwendet.
  - Meldet die Datenbank „abgelaufen“ oder „nicht angemeldet“, wird ein neues Token geholt
    und die Anfrage genau einmal wiederholt.
*/

export const DATA_API = process.env.NEXT_PUBLIC_NEON_DATA_API
  ?? 'https://ep-odd-glade-b1ncnkm9.apirest.c-5.eu-central-1.aws.neon.tech/neondb/rest/v1';

let cached: { jwt: string; exp: number } | null = null;
let inflight: Promise<string | null> | null = null;

function claims(jwt: string | null | undefined): { sub?: string; exp?: number } | null {
  if (!jwt) return null;
  const parts = jwt.split('.');
  if (parts.length !== 3) return null;
  try {
    return JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
}

/** Gültiges JWT mit Nutzer-ID, sonst null */
const usable = (jwt: string | null | undefined) => {
  const c = claims(jwt);
  return c?.sub && (!c.exp || c.exp * 1000 > Date.now() + 5000) ? { jwt: jwt!, exp: (c.exp ?? Date.now() / 1000 + 300) * 1000 } : null;
};

async function fetchJwt(): Promise<string | null> {
  // 1. Sitzung abfragen: Neon Auth liefert das JWT im Header set-auth-jwt
  try {
    const r = await fetch('/api/auth/get-session', { credentials: 'include', cache: 'no-store' });
    const t = usable(r.headers.get('set-auth-jwt'));
    if (t) { cached = t; return t.jwt; }
    if (r.ok && (await r.clone().json().catch(() => null)) === null) return null; // wirklich abgemeldet
  } catch { /* weiter mit Schritt 2 */ }
  // 2. Ausweichweg: Token-Endpunkt
  try {
    const r = await fetch('/api/auth/token', { credentials: 'include', cache: 'no-store' });
    const t = usable(r.ok ? ((await r.json()) as { token?: string }).token : null);
    if (t) { cached = t; return t.jwt; }
  } catch { /* kein Token */ }
  return null;
}

/** Aktuelles JWT; force: auf jeden Fall neu holen */
export async function accessToken(force = false): Promise<string | null> {
  if (!force && cached && cached.exp - 30_000 > Date.now()) return cached.jwt;
  inflight ??= fetchJwt().finally(() => { inflight = null; });
  return inflight;
}

export function clearAccessToken() { cached = null; }

export interface ApiError { message: string; code?: string; status: number }

const needsNewToken = (e: ApiError) =>
  e.status === 401 || /jwt|token/i.test(e.message) || e.message === 'Nicht angemeldet';

/** Anfrage an die Data API; bei Token-Problemen einmal mit frischem Token wiederholen */
export async function dataApi<T>(path: string, init: RequestInit = {}, retry = true): Promise<{ data: T | null; error: ApiError | null }> {
  const token = await accessToken(!retry);
  if (!token) return { data: null, error: { message: 'Nicht angemeldet', status: 401, code: 'NO_SESSION' } };
  let res: Response;
  try {
    res = await fetch(`${DATA_API}/${path}`, {
      ...init,
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...init.headers, Authorization: `Bearer ${token}` }
    });
  } catch {
    return { data: null, error: { message: 'Keine Verbindung zum Server. Bitte erneut versuchen.', status: 0 } };
  }
  if (res.ok) {
    const text = await res.text();
    return { data: (text ? JSON.parse(text) : null) as T, error: null };
  }
  const body = (await res.json().catch(() => ({}))) as { message?: string; code?: string };
  const error: ApiError = { message: body.message ?? `HTTP ${res.status}`, code: body.code, status: res.status };
  if (retry && needsNewToken(error)) {
    clearAccessToken();
    return dataApi<T>(path, init, false);
  }
  return { data: null, error };
}

export const rpc = (fn: string, args: Record<string, unknown>) =>
  dataApi<unknown>(`rpc/${fn}`, { method: 'POST', body: JSON.stringify(args) });
