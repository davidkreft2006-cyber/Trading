import type { MarketState } from './quote-types';

/*
  Serverseitiger Zugriff auf den öffentlichen Chart-Endpunkt von Yahoo Finance (ohne API-Schlüssel).
  Gemeinsam genutzt von /api/quotes (aktuelle Kurse) und /api/history (Verläufe je Zeitraum).
*/

// Für Tests überschreibbar (lokaler Mock-Server)
const BASE = process.env.YAHOO_BASE ?? 'https://query1.finance.yahoo.com';

interface YahooChart {
  chart: {
    result?: {
      meta: {
        regularMarketPrice: number; regularMarketTime?: number; chartPreviousClose?: number; previousClose?: number;
        regularMarketVolume?: number; currency?: string;
        currentTradingPeriod?: Record<'pre' | 'regular' | 'post', { start: number; end: number; gmtoffset?: number }>;
      };
      timestamp?: number[];
      indicators: { quote: { close: (number | null)[] }[] };
    }[];
  };
}

export interface YahooSeries {
  price: number;   // aktuellster Kurs, auch vor-/nachbörslich
  regular: number; // Kurs der regulären Sitzung
  prev: number;    // Vortagesschluss
  volume: number;  // Stück
  ccy: string;     // Börsenwährung laut Yahoo (GBp = Pence)
  hist: number[];
  times: number[]; // Unix-Millisekunden
  market: MarketState;
  nextOpen?: number;
}

/** Börsenstatus aus den Handelszeiten, die Yahoo mitliefert (Feiertage nicht berücksichtigt) */
function sessionOf(p: NonNullable<YahooChart['chart']['result']>[number]['meta']['currentTradingPeriod'], nowSec: number): { market: MarketState; nextOpen?: number } {
  if (!p) return { market: 'regular' };
  const pre = p.pre ?? p.regular, post = p.post ?? p.regular;
  if (nowSec >= pre.start && nowSec < p.regular.start) return { market: pre.start < p.regular.start ? 'pre' : 'closed', nextOpen: p.regular.start * 1000 };
  if (nowSec >= p.regular.start && nowSec < p.regular.end) return { market: 'regular' };
  if (nowSec >= p.regular.end && nowSec < post.end) return { market: post.end > p.regular.end ? 'post' : 'closed', nextOpen: undefined };
  if (nowSec < pre.start) return { market: 'closed', nextOpen: pre.start * 1000 };
  // Nach Handelsende: nächster Werktag zur selben Uhrzeit (Wochenende überspringen)
  const off = p.regular.gmtoffset ?? 0;
  let next = pre.start + 86400;
  while ([0, 6].includes(new Date((next + off) * 1000).getUTCDay())) next += 86400;
  return { market: 'closed', nextOpen: next * 1000 };
}

/** prePost: vor- und nachbörsliche Kurse einbeziehen (US-Börsen: ca. 10:00–02:00 Uhr deutscher Zeit) */
export async function yahooChart(symbol: string, range = '1d', interval = '15m', prePost = false): Promise<YahooSeries | null> {
  try {
    const res = await fetch(`${BASE}/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}${prePost ? '&includePrePost=true' : ''}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Auvryn/1.0)', Accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(8000)
    });
    if (!res.ok) return null;
    const r = ((await res.json()) as YahooChart).chart.result?.[0];
    if (!r || !Number.isFinite(r.meta.regularMarketPrice)) return null;
    const regular = r.meta.regularMarketPrice;
    const closes = r.indicators.quote[0]?.close ?? [];
    const hist: number[] = [], times: number[] = [];
    (r.timestamp ?? []).forEach((t, i) => {
      const c = closes[i];
      if (c != null && Number.isFinite(c)) { hist.push(c); times.push(t * 1000); }
    });
    // Jüngster Punkt nach der regulären Sitzung (vor-/nachbörslich) ist der aktuellere Kurs
    const lastT = times[times.length - 1] ?? 0;
    const regT = (r.meta.regularMarketTime ?? 0) * 1000;
    const price = prePost && hist.length && lastT > regT + 60e3 ? hist[hist.length - 1] : regular;
    return {
      price, regular,
      ...sessionOf(r.meta.currentTradingPeriod, Date.now() / 1000),
      prev: r.meta.chartPreviousClose ?? r.meta.previousClose ?? regular,
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
