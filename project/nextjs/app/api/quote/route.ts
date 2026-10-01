import { NextResponse, type NextRequest } from 'next/server';
import { coinOf } from '@/lib/data';
import type { Quote } from '@/lib/quote-types';
import { localPrice, usdFactor, yahooChart } from '@/lib/yahoo';

/*
  Einzelkurs für das gerade angesehene Instrument, damit sich der Kurs im Sekundenbereich bewegt
  statt nur einmal pro Minute (Liste über /api/quotes).
  - Aktien, ETFs, Rohstoffe: Yahoo 1-Minuten-Daten inkl. vor-/nachbörslich; 2 s CDN-Cache
  - Krypto ohne Binance-Paar: CoinGecko simple/price; 15 s CDN-Cache (Rate-Limit)
  Coins mit Binance-Paar brauchen das nicht, die kommen per WebSocket sekündlich.
*/

export const dynamic = 'force-dynamic';

const CG = process.env.COINGECKO_BASE ?? 'https://api.coingecko.com';

export async function GET(req: NextRequest) {
  const coin = coinOf(req.nextUrl.searchParams.get('sym') ?? '');
  if (!coin) return NextResponse.json({ error: 'Unbekanntes Instrument' }, { status: 400 });

  if (coin.ids.yahoo) {
    const s = await yahooChart(coin.ids.yahoo, '1d', '1m', true);
    const k = s ? await usdFactor(s.ccy) : NaN;
    if (!s || !Number.isFinite(k)) return NextResponse.json({ error: 'Kein Kurs' }, { status: 502, headers: { 'Cache-Control': 'public, s-maxage=5' } });
    const quote: Partial<Quote> = {
      price: s.price * k,
      chg: s.prev ? (s.price / s.prev - 1) * 100 : 0,
      market: s.market, nextOpen: s.nextOpen,
      ...(s.ccy !== 'USD' && { local: localPrice(s.price, s.ccy) })
    };
    return NextResponse.json({ quote, ts: Date.now() }, { headers: { 'Cache-Control': 'public, s-maxage=2, stale-while-revalidate=5' } });
  }

  if (coin.ids.coingecko) {
    try {
      const key = process.env.COINGECKO_API_KEY;
      const res = await fetch(`${CG}/api/v3/simple/price?ids=${encodeURIComponent(coin.ids.coingecko)}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true`, {
        headers: { Accept: 'application/json', 'User-Agent': 'Auvryn/1.0', ...(key && { 'x-cg-demo-api-key': key }) },
        cache: 'no-store', signal: AbortSignal.timeout(6000)
      });
      const d = res.ok ? ((await res.json()) as Record<string, { usd?: number; usd_24h_change?: number; usd_24h_vol?: number }>)[coin.ids.coingecko] : undefined;
      if (d?.usd) {
        return NextResponse.json({ quote: { price: d.usd, chg: d.usd_24h_change ?? 0, volNum: d.usd_24h_vol ?? 0 }, ts: Date.now() },
          { headers: { 'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=30' } });
      }
    } catch { /* unten */ }
  }
  return NextResponse.json({ error: 'Kein Kurs' }, { status: 502, headers: { 'Cache-Control': 'public, s-maxage=10' } });
}
