import { NextResponse } from 'next/server';
import { COINS } from '@/lib/data';
import type { Quote } from '@/lib/quote-types';

/*
  Kurse für Aktien, ETFs und Rohstoffe (serverseitig, weil Yahoo Finance
  keine Browser-Abfragen von fremden Seiten erlaubt).
  Quelle: öffentlicher Chart-Endpunkt von Yahoo Finance, ohne API-Schlüssel.
  Kennung je Instrument ist das Yahoo-Symbol mit Börsensuffix (lib/data.ts, ids.yahoo).
  Nicht-USD-Börsen (EUR, CHF, GBp, JPY …) werden mit dem aktuellen Devisenkurs in USD umgerechnet.
  Ergebnis wird am Vercel-CDN 60 s zwischengespeichert.
*/

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// Anzeige-Kürzel -> Yahoo-Symbol
const SYMBOLS = COINS.filter(c => c.ids.yahoo).map(c => [c.sym, c.ids.yahoo!] as const);

// Für Tests überschreibbar (lokaler Mock-Server)
const BASE = process.env.YAHOO_BASE ?? 'https://query1.finance.yahoo.com';

interface YahooChart {
  chart: {
    result?: {
      meta: { regularMarketPrice: number; chartPreviousClose?: number; previousClose?: number; regularMarketVolume?: number; currency?: string };
      timestamp?: number[];
      indicators: { quote: { close: (number | null)[] }[] };
    }[];
  };
}

type Raw = Omit<Quote, 'local'> & { ccy: string };

async function load(yahoo: string): Promise<Raw | null> {
  try {
    const res = await fetch(`${BASE}/v8/finance/chart/${encodeURIComponent(yahoo)}?range=1d&interval=15m`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Auvryn/1.0)', Accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(8000)
    });
    if (!res.ok) return null;
    const r = ((await res.json()) as YahooChart).chart.result?.[0];
    if (!r || !Number.isFinite(r.meta.regularMarketPrice)) return null;
    const price = r.meta.regularMarketPrice;
    const prev = r.meta.chartPreviousClose ?? r.meta.previousClose ?? price;
    const closes = r.indicators.quote[0]?.close ?? [];
    const hist: number[] = [], times: number[] = [];
    (r.timestamp ?? []).forEach((t, i) => {
      const c = closes[i];
      if (c != null && Number.isFinite(c)) { hist.push(c); times.push(t * 1000); }
    });
    // Letzter Punkt = aktueller Kurs, damit Chart und Anzeige übereinstimmen
    if (hist.length) hist[hist.length - 1] = price; else { hist.push(prev, price); times.push(Date.now() - 864e5, Date.now()); }
    return { price, chg: prev ? (price / prev - 1) * 100 : 0, volNum: (r.meta.regularMarketVolume ?? 0) * price, hist, times, ccy: r.meta.currency ?? 'USD' };
  } catch {
    return null;
  }
}

/** Parallel, aber höchstens `limit` Anfragen gleichzeitig (schont das Rate-Limit) */
async function pool<T, R>(items: readonly T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) { const i = next++; out[i] = await fn(items[i]); }
  }));
  return out;
}

export async function GET() {
  const raw = await pool(SYMBOLS, 16, async ([sym, y]) => [sym, await load(y)] as const);

  // Devisenkurse für alle vorkommenden Nicht-USD-Währungen (GBp = Pence -> GBP / 100)
  const ccys = [...new Set(raw.flatMap(([, q]) => (q && q.ccy !== 'USD' ? [q.ccy === 'GBp' ? 'GBP' : q.ccy.toUpperCase()] : [])))];
  const fx = Object.fromEntries((await pool(ccys, 8, async c => [c, (await load(`${c}USD=X`))?.price] as const)).filter(([, v]) => v)) as Record<string, number>;
  const toUsd = (ccy: string) => (ccy === 'USD' ? 1 : ccy === 'GBp' ? (fx.GBP ?? NaN) / 100 : fx[ccy.toUpperCase()] ?? NaN);

  const quotes: Record<string, Quote> = {};
  for (const [sym, q] of raw) {
    if (!q) continue;
    const k = toUsd(q.ccy);
    if (!Number.isFinite(k)) continue; // ohne Devisenkurs kein verlässlicher USD-Preis
    quotes[sym] = {
      price: q.price * k, chg: q.chg, volNum: q.volNum * k, hist: q.hist.map(v => v * k), times: q.times,
      ...(q.ccy !== 'USD' && { local: { price: q.ccy === 'GBp' ? q.price / 100 : q.price, ccy: q.ccy === 'GBp' ? 'GBP' : q.ccy } })
    };
  }
  return NextResponse.json(
    { quotes, ts: Date.now() },
    { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' } }
  );
}
