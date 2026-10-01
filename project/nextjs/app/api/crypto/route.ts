import { NextResponse } from 'next/server';
import { COINS } from '@/lib/data';
import type { Quote } from '@/lib/quote-types';

/*
  Krypto-Kurse aller gelisteten Coins in einer Abfrage über CoinGecko
  (eindeutige CoinGecko-IDs aus lib/data.ts, ids.coingecko): Kurs, 24h-Änderung,
  Volumen und Verlauf der letzten 24 Stunden (stündlich).
  Coins mit Binance-Paar bekommen im Browser zusätzlich sekündliche Updates von Binance.
  Optional: COINGECKO_API_KEY (Demo-Key) für ein höheres Limit.
  Ergebnis wird am Vercel-CDN 60 s zwischengespeichert.
*/

export const dynamic = 'force-dynamic';

const BASE = process.env.COINGECKO_BASE ?? 'https://api.coingecko.com';
// Letzter erfolgreicher Stand (solange die Server-Instanz lebt), z. B. bei CoinGecko-Rate-Limit
const lastGood: Record<string, Quote> = {};

const BY_ID = new Map(COINS.filter(c => c.ids.coingecko).map(c => [c.ids.coingecko!, c.sym]));

interface Market {
  id: string;
  current_price: number | null;
  price_change_percentage_24h: number | null;
  total_volume: number | null;
  last_updated?: string;
  sparkline_in_7d?: { price: number[] };
}

export async function GET() {
  const url = `${BASE}/api/v3/coins/markets?vs_currency=usd&ids=${[...BY_ID.keys()].join(',')}&sparkline=true&price_change_percentage=24h&per_page=250&page=1`;
  const key = process.env.COINGECKO_API_KEY;
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'Auvryn/1.0', ...(key && { 'x-cg-demo-api-key': key }) },
      cache: 'no-store',
      signal: AbortSignal.timeout(10000)
    });
    if (!res.ok) throw new Error(String(res.status));
    const list = (await res.json()) as Market[];
    const quotes: Record<string, Quote> = {};
    for (const m of list) {
      const sym = BY_ID.get(m.id);
      if (!sym || !m.current_price) continue;
      // Sparkline: 7 Tage stündlich; die letzten 25 Punkte = 24 Stunden
      const spark = (m.sparkline_in_7d?.price ?? []).filter(Number.isFinite).slice(-25);
      const end = m.last_updated ? Date.parse(m.last_updated) : Date.now();
      const hist = spark.length > 1 ? [...spark.slice(0, -1), m.current_price] : [];
      quotes[sym] = {
        price: m.current_price,
        chg: m.price_change_percentage_24h ?? 0,
        volNum: m.total_volume ?? 0,
        hist,
        times: hist.map((_, i) => end - (hist.length - 1 - i) * 3600e3)
      };
    }
    Object.assign(lastGood, quotes);
    return NextResponse.json({ quotes: { ...lastGood }, ts: Date.now() }, { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } });
  } catch {
    if (Object.keys(lastGood).length) {
      return NextResponse.json({ quotes: { ...lastGood }, ts: Date.now(), stale: true }, { headers: { 'Cache-Control': 'public, s-maxage=20' } });
    }
    // Kurz cachen, damit ein Ausfall/Rate-Limit nicht bei jedem Aufruf erneut abgefragt wird
    return NextResponse.json({ quotes: {}, ts: Date.now(), error: 'unavailable' }, { status: 502, headers: { 'Cache-Control': 'public, s-maxage=20' } });
  }
}
