import { NextResponse } from 'next/server';
import { COINS } from '@/lib/data';
import type { Quote } from '@/lib/quote-types';
import { localPrice, pool, usdFactor, yahooChart } from '@/lib/yahoo';

/*
  Kurse für Aktien, ETFs und Rohstoffe (serverseitig, weil Yahoo Finance
  keine Browser-Abfragen von fremden Seiten erlaubt).
  Kennung je Instrument ist das Yahoo-Symbol mit Börsensuffix (lib/data.ts, ids.yahoo).
  Nicht-USD-Börsen (EUR, CHF, GBp, JPY …) werden mit dem aktuellen Devisenkurs in USD umgerechnet.
  Inklusive vor- und nachbörslicher Kurse (US: ca. 10:00–02:00 Uhr deutscher Zeit) und Börsenstatus.
  Ergebnis wird am Vercel-CDN 60 s zwischengespeichert.
*/

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// Letzter erfolgreicher Kurs je Instrument (solange die Server-Instanz lebt). Fällt ein Symbol
// kurzzeitig aus (z. B. Rate-Limit), wird der letzte echte Wert statt einer Lücke geliefert.
const lastGood: Record<string, Quote> = {};
let lastEurUsd: number | null = null;

// Anzeige-Kürzel -> Yahoo-Symbol
const SYMBOLS = COINS.filter(c => c.ids.yahoo).map(c => [c.sym, c.ids.yahoo!] as const);

export async function GET() {
  const raw = await pool(SYMBOLS, 16, async ([sym, y]) => [sym, await yahooChart(y, '1d', '15m', true)] as const);

  // Devisenkurse einmal je Währung laden
  const fx = new Map<string, number>();
  const ccys = [...new Set(raw.flatMap(([, q]) => (q && q.ccy !== 'USD' ? [q.ccy] : [])))];
  const factor = Object.fromEntries(await pool(ccys, 8, async c => [c, await usdFactor(c, fx)] as const));

  const quotes: Record<string, Quote> = {};
  for (const [sym, q] of raw) {
    if (!q) continue;
    const k = q.ccy === 'USD' ? 1 : factor[q.ccy];
    if (!Number.isFinite(k)) continue; // ohne Devisenkurs kein verlässlicher USD-Preis
    const hist = q.hist.length ? [...q.hist.slice(0, -1), q.price] : [q.prev, q.price];
    const times = q.hist.length ? q.times : [Date.now() - 864e5, Date.now()];
    quotes[sym] = {
      price: q.price * k,
      chg: q.prev ? (q.price / q.prev - 1) * 100 : 0,
      volNum: q.volume * q.price * k,
      hist: hist.map(v => v * k), times,
      market: q.market, nextOpen: q.nextOpen,
      ...(q.ccy !== 'USD' && { local: localPrice(q.price, q.ccy) })
    };
  }
  Object.assign(lastGood, quotes);
  // Euro-Kurs für die Zusatzanzeige in € (1 EUR = eurUsd USD)
  const eur = await usdFactor('EUR', fx);
  if (Number.isFinite(eur)) lastEurUsd = eur;
  return NextResponse.json(
    { quotes: { ...lastGood }, eurUsd: lastEurUsd, ts: Date.now() },
    { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' } }
  );
}
