/*
  Serverseitiger Zugriff auf den öffentlichen Chart-Endpunkt von Yahoo Finance (ohne API-Schlüssel).
  Gemeinsam genutzt von /api/quotes (aktuelle Kurse) und /api/history (Verläufe je Zeitraum).
*/

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

export interface YahooSeries {
  price: number;
  prev: number;    // Vortagesschluss
  volume: number;  // Stück
  ccy: string;     // Börsenwährung laut Yahoo (GBp = Pence)
  hist: number[];
  times: number[]; // Unix-Millisekunden
}

export async function yahooChart(symbol: string, range = '1d', interval = '15m'): Promise<YahooSeries | null> {
  try {
    const res = await fetch(`${BASE}/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Auvryn/1.0)', Accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(8000)
    });
    if (!res.ok) return null;
    const r = ((await res.json()) as YahooChart).chart.result?.[0];
    if (!r || !Number.isFinite(r.meta.regularMarketPrice)) return null;
    const price = r.meta.regularMarketPrice;
    const closes = r.indicators.quote[0]?.close ?? [];
    const hist: number[] = [], times: number[] = [];
    (r.timestamp ?? []).forEach((t, i) => {
      const c = closes[i];
      if (c != null && Number.isFinite(c)) { hist.push(c); times.push(t * 1000); }
    });
    return {
      price,
      prev: r.meta.chartPreviousClose ?? r.meta.previousClose ?? price,
      volume: r.meta.regularMarketVolume ?? 0,
      ccy: r.meta.currency ?? 'USD',
      hist, times
    };
  } catch {
    return null;
  }
}

/** Faktor Börsenwährung -> USD (GBp = Pence). NaN, wenn kein Devisenkurs verfügbar ist. */
export async function usdFactor(ccy: string, cache = new Map<string, number>()): Promise<number> {
  if (ccy === 'USD') return 1;
  const base = ccy === 'GBp' ? 'GBP' : ccy.toUpperCase();
  if (!cache.has(base)) cache.set(base, (await yahooChart(`${base}USD=X`))?.price ?? NaN);
  const k = cache.get(base)!;
  return ccy === 'GBp' ? k / 100 : k;
}

/** Angezeigte Börsenwährung (Pence als Pfund) und Kurs darin */
export const localPrice = (price: number, ccy: string) =>
  ccy === 'GBp' ? { price: price / 100, ccy: 'GBP' } : { price, ccy };

/** Parallel, aber höchstens `limit` Anfragen gleichzeitig (schont das Rate-Limit) */
export async function pool<T, R>(items: readonly T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) { const i = next++; out[i] = await fn(items[i]); }
  }));
  return out;
}
