'use client';
import { createClient } from '@neondatabase/neon-js';

/*
  Neon-Projekt „auvryn“ (Frankfurt). Die URL ist öffentlich (wie ein Supabase-Anon-Key):
  Zugriffsschutz passiert in der Datenbank über Row-Level Security und die
  geprüften Funktionen add_funds / execute_trade / transfer_out / reset_account.
  Über NEXT_PUBLIC_NEON_URL überschreibbar, z. B. für einen Test-Branch.
*/
export const NEON_URL = process.env.NEXT_PUBLIC_NEON_URL ?? 'https://ep-odd-glade-b1ncnkm9.c-5.eu-central-1.aws.neon.tech/neondb';

let client: ReturnType<typeof createClient> | null = null;

/**
  Einmalige Client-Instanz (nur im Browser verwenden).
  Auth läuft über /api/auth auf der eigenen Domain (siehe app/api/auth/[...path]/route.ts),
  sonst verwirft Safari das Sitzungs-Cookie als Fremd-Cookie.
*/
export function neon() {
  if (!client) client = createClient(NEON_URL, { auth: { url: `${window.location.origin}/api/auth` } });
  return client;
}

/** Fehlermeldungen von Neon Auth ins Deutsche übersetzen */
export function authError(err: unknown): string {
  const e = (err ?? {}) as { code?: string; message?: string; status?: number };
  const code = (e.code ?? '').toUpperCase();
  const msg = (e.message ?? '').toLowerCase();
  const map: [RegExp | string, string][] = [
    ['INVALID_EMAIL_OR_PASSWORD', 'E-Mail oder Passwort ist falsch.'],
    ['INVALID_PASSWORD', 'Das aktuelle Passwort ist falsch.'],
    ['USER_ALREADY_EXISTS', 'Für diese E-Mail gibt es bereits ein Konto.'],
    ['USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL', 'Für diese E-Mail gibt es bereits ein Konto.'],
    ['PASSWORD_TOO_SHORT', 'Das Passwort muss mindestens 8 Zeichen haben.'],
    ['PASSWORD_TOO_LONG', 'Das Passwort ist zu lang.'],
    ['INVALID_EMAIL', 'Bitte eine gültige E-Mail-Adresse eingeben.'],
    ['INVALID_OTP', 'Der Code ist ungültig oder abgelaufen.'],
    ['OTP_EXPIRED', 'Der Code ist abgelaufen. Fordere einen neuen an.'],
    ['TOO_MANY_ATTEMPTS', 'Zu viele Versuche. Fordere einen neuen Code an.'],
    ['USER_NOT_FOUND', 'Zu dieser E-Mail gibt es kein Konto.'],
    ['EMAIL_NOT_VERIFIED', 'Bitte bestätige zuerst deine E-Mail-Adresse.']
  ];
  for (const [k, v] of map) if (code === k) return v;
  if (msg.includes('invalid email or password')) return 'E-Mail oder Passwort ist falsch.';
  if (msg === 'invalid password') return 'Das aktuelle Passwort ist falsch.';
  if (msg.includes('already exists')) return 'Für diese E-Mail gibt es bereits ein Konto.';
  if (msg.includes('password') && msg.includes('short')) return 'Das Passwort muss mindestens 8 Zeichen haben.';
  if (msg.includes('otp') || msg.includes('code')) return 'Der Code ist ungültig oder abgelaufen.';
  if (e.status === 429 || msg.includes('too many')) return 'Zu viele Versuche. Bitte kurz warten.';
  if (msg.includes('failed to fetch') || msg.includes('network')) return 'Keine Verbindung zum Server. Bitte später erneut versuchen.';
  return e.message || 'Das hat nicht geklappt. Bitte erneut versuchen.';
}
