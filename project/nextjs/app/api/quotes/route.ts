import { NextResponse } from 'next/server';
import type { Quote } from '@/lib/quote-types';

/*
  Kurse für Aktien, ETFs und Rohstoffe (serverseitig, weil Yahoo Finance
  keine Browser-Abfragen von fremden Seiten erlaubt).
  Quelle: öffentlicher Chart-Endpunkt von Yahoo Finance, ohne API-Schlüssel.
  Ergebnis wird am Vercel-CDN 60 s zwischengespeichert.
*/

export const dynamic = 'force-dynamic';

// Anzeige-Symbol -> Yahoo-Symbol (alles in USD notiert)
const SYMBOLS: Record<string, string> = {
  AAPL: 'AAPL', MSFT: 'MSFT', NVDA: 'NVDA', TSLA: 'TSLA', AMZN: 'AMZN', SAP: 'SAP',
  SPY: 'SPY', QQQ: 'QQQ', URTH: 'URTH', VT: 'VT',
  XAU: 'GC=F', XAG: 'SI=F', OIL: 'BZ=F'
};

// Für Tests überschreibbar (lokaler Mock-Server)
const BASE = process.env.YAHOO_BASE ?? 'https://query1.finance.yahoo.com';

interface YahooChart {
  chart: {
    result?: {
      meta: { regularMarketPrice: number; chartPreviousClose?: number; previousClose?: number; regularMarketVolume?: number };
      timestamp?: number[];
      indicators: { quote: { close: (number | null)[] }[] };
    }[];
  };
}

async function load(yahoo: string): Promise<Quote | null> {
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
    return { price, chg: prev ? (price / prev - 1) * 100 : 0, volNum: (r.meta.regularMarketVolume ?? 0) * price, hist, times };
  } catch {
    return null;
  }
}

export async function GET() {
  const entries = await Promise.all(Object.entries(SYMBOLS).map(async ([sym, y]) => [sym, await load(y)] as const));
  const quotes = Object.fromEntries(entries.filter(([, q]) => q)) as Record<string, Quote>;
  return NextResponse.json(
    { quotes, ts: Date.now() },
    { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' } }
  );
}
