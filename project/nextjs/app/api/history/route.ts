import { NextResponse, type NextRequest } from 'next/server';
import { coinOf } from '@/lib/data';
import { rangeOf } from '@/lib/ranges';
import { usdFactor, yahooChart } from '@/lib/yahoo';

/*
  Kursverlauf eines Instruments für einen Zeitraum (1 Min, 5 Min, Tag, Monat, Jahr).
  - Aktien, ETFs, Rohstoffe: Yahoo Finance, in USD umgerechnet
  - Krypto: CoinGecko market_chart (für Coins mit Binance-Paar lädt der Browser direkt von Binance;
    diese Route ist dann nur der Ausweichweg). CoinGecko liefert höchstens 5-Minuten-Auflösung,
    für „1 Min“ werden daher 5-Minuten-Punkte gezeigt (note).
*/

export const dynamic = 'force-dynamic';

const CG = process.env.COINGECKO_BASE ?? 'https://api.coingecko.com';

export async function GET(req: NextRequest) {
  const coin = coinOf(req.nextUrl.searchParams.get('sym') ?? '');
  const range = rangeOf(req.nextUrl.searchParams.get('range') ?? '');
  if (!coin || !range) return NextResponse.json({ error: 'Unbekanntes Instrument oder Zeitraum' }, { status: 400 });

  let hist: number[] = [], times: number[] = [], note: string | undefined;

  if (coin.ids.yahoo && range.yahoo) {
    const s = await yahooChart(coin.ids.yahoo, range.yahoo.range, range.yahoo.interval, range.yahoo.prePost);
    const k = s ? await usdFactor(s.ccy) : NaN;
    if (s && Number.isFinite(k)) {
      const n = range.yahoo.last ?? s.hist.length;
      hist = s.hist.slice(-n).map(v => v * k);
      times = s.times.slice(-n);
    }
  } else if (coin.ids.coingecko && range.coingecko) {
    try {
      const key = process.env.COINGECKO_API_KEY;
      const res = await fetch(`${CG}/api/v3/coins/${encodeURIComponent(coin.ids.coingecko)}/market_chart?vs_currency=usd&days=${range.coingecko.days}`, {
        headers: { Accept: 'application/json', 'User-Agent': 'Auvryn/1.0', ...(key && { 'x-cg-demo-api-key': key }) },
        cache: 'no-store', signal: AbortSignal.timeout(8000)
      });
      if (res.ok) {
        const { prices } = (await res.json()) as { prices: [number, number][] };
        const pts = prices.filter(p => Number.isFinite(p[1])).slice(-(range.coingecko.last ?? prices.length));
        hist = pts.map(p => p[1]); times = pts.map(p => p[0]);
        if (range.key === '1m') note = 'Für diesen Coin gibt es nur 5-Minuten-Werte.';
      }
    } catch { /* leer lassen */ }
  }

  if (hist.length < 2) {
    return NextResponse.json({ hist: [], times: [], error: 'Kein Verlauf verfügbar' }, { status: 502, headers: { 'Cache-Control': 'public, s-maxage=20' } });
  }
  return NextResponse.json({ hist, times, note }, {
    headers: { 'Cache-Control': `public, s-maxage=${range.ttl}, stale-while-revalidate=${range.ttl * 2}` }
  });
}
