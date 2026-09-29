'use client';
/*
  Live-Kurse.
  - Krypto: Binance-Marktdaten direkt im Browser (REST für Start + 24h-Verlauf,
    WebSocket für laufende Updates). Ohne API-Schlüssel.
  - Aktien, ETFs, Rohstoffe: eigene Route /api/quotes (Yahoo Finance, serverseitig).
  Fällt eine Quelle aus, bleiben die Beispielwerte aus lib/data.ts stehen und
  status meldet 'fallback'.
*/
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { COINS, fmtVol, type Asset, type Category, type Coin } from './data';
import type { Quote } from './quote-types';

const BINANCE_REST = 'https://data-api.binance.vision';
const BINANCE_WS = 'wss://data-stream.binance.vision/stream';
const CRYPTO = COINS.filter(c => c.cat === 'crypto').map(c => c.sym);
const pair = (sym: string) => `${sym}USDT`;

export type FeedStatus = 'loading' | 'live' | 'fallback';

interface Ctx {
  coins: Coin[];
  coinOf: (sym: string) => Coin | undefined;
  priceOf: (a: Asset) => number;
  status: { crypto: FeedStatus; tradfi: FeedStatus };
  statusOf: (cat: Category) => FeedStatus;
  /** true, sobald Kurse aus einer echten Quelle stammen (nicht die Beispielwerte) */
  isLive: (sym: string) => boolean;
}

const QuotesCtx = createContext<Ctx | null>(null);
export const useQuotes = () => {
  const c = useContext(QuotesCtx);
  if (!c) throw new Error('useQuotes muss innerhalb von <QuotesProvider> verwendet werden');
  return c;
};

type Live = Record<string, Partial<Quote>>;

async function getJson<T>(url: string): Promise<T> {
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json() as Promise<T>;
}

export function QuotesProvider({ children }: { children: ReactNode }) {
  const [live, setLive] = useState<Live>({});
  const [status, setStatus] = useState<{ crypto: FeedStatus; tradfi: FeedStatus }>({ crypto: 'loading', tradfi: 'loading' });
  const pending = useRef<Live>({});

  // Gebündelt übernehmen: WebSocket-Nachrichten kommen im Sekundentakt je Symbol
  const merge = useCallback((patch: Live) => {
    setLive(prev => {
      const next = { ...prev };
      for (const [k, v] of Object.entries(patch)) next[k] = { ...next[k], ...v };
      return next;
    });
  }, []);

  // ---- Krypto: Startwerte + 24h-Verlauf per REST
  const loadCryptoRest = useCallback(async () => {
    type Ticker = { symbol: string; lastPrice: string; priceChangePercent: string; quoteVolume: string };
    const symbols = encodeURIComponent(JSON.stringify(CRYPTO.map(pair)));
    const tickers = await getJson<Ticker[]>(`${BINANCE_REST}/api/v3/ticker/24hr?symbols=${symbols}`);
    const patch: Live = {};
    for (const t of tickers) {
      const sym = t.symbol.replace(/USDT$/, '');
      patch[sym] = { price: +t.lastPrice, chg: +t.priceChangePercent, volNum: +t.quoteVolume };
    }
    merge(patch);
    return patch;
  }, [merge]);

  const loadCryptoHistory = useCallback(async () => {
    type Kline = [number, string, string, string, string];
    const res = await Promise.allSettled(CRYPTO.map(async sym => {
      const k = await getJson<Kline[]>(`${BINANCE_REST}/api/v3/klines?symbol=${pair(sym)}&interval=15m&limit=96`);
      return [sym, { hist: k.map(x => +x[4]), times: k.map(x => x[0]) }] as const;
    }));
    const patch: Live = {};
    for (const r of res) if (r.status === 'fulfilled') patch[r.value[0]] = r.value[1];
    merge(patch);
  }, [merge]);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let closed = false;
    let retry = 0;
    let poll: ReturnType<typeof setInterval> | undefined;
    let reconnect: ReturnType<typeof setTimeout> | undefined;

    const flush = setInterval(() => {
      if (Object.keys(pending.current).length) { merge(pending.current); pending.current = {}; }
    }, 1000);

    const startPolling = () => {
      if (poll) return;
      poll = setInterval(() => { loadCryptoRest().catch(() => {}); }, 15000);
    };

    const connect = () => {
      const streams = CRYPTO.map(s => `${pair(s).toLowerCase()}@miniTicker`).join('/');
      try { ws = new WebSocket(`${BINANCE_WS}?streams=${streams}`); } catch { startPolling(); return; }
      ws.onopen = () => { retry = 0; if (poll) { clearInterval(poll); poll = undefined; } };
      ws.onmessage = ev => {
        try {
          const d = JSON.parse(ev.data as string).data as { s: string; c: string; o: string; q: string };
          const sym = d.s.replace(/USDT$/, '');
          const c = +d.c, o = +d.o;
          pending.current[sym] = { ...pending.current[sym], price: c, chg: o ? (c / o - 1) * 100 : 0, volNum: +d.q };
        } catch { /* unbekanntes Format ignorieren */ }
      };
      ws.onclose = () => {
        if (closed) return;
        startPolling(); // solange der Stream weg ist, per REST aktualisieren
        reconnect = setTimeout(connect, Math.min(30000, 2000 * 2 ** retry++));
      };
      ws.onerror = () => ws?.close();
    };

    loadCryptoRest()
      .then(() => { setStatus(s => ({ ...s, crypto: 'live' })); connect(); })
      .catch(() => { setStatus(s => ({ ...s, crypto: 'fallback' })); });
    loadCryptoHistory().catch(() => {});
    const histTimer = setInterval(() => { loadCryptoHistory().catch(() => {}); }, 5 * 60000);

    return () => {
      closed = true;
      ws?.close();
      clearInterval(flush); clearInterval(histTimer);
      if (poll) clearInterval(poll);
      if (reconnect) clearTimeout(reconnect);
    };
  }, [loadCryptoRest, loadCryptoHistory, merge]);

  // ---- Aktien, ETFs, Rohstoffe: eigene Server-Route, jede Minute
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const { quotes } = await getJson<{ quotes: Record<string, Quote> }>('/api/quotes');
        if (!alive) return;
        merge(quotes);
        setStatus(s => ({ ...s, tradfi: Object.keys(quotes).length ? 'live' : 'fallback' }));
      } catch {
        if (alive) setStatus(s => ({ ...s, tradfi: s.tradfi === 'live' ? 'live' : 'fallback' }));
      }
    };
    load();
    const t = setInterval(load, 60000);
    return () => { alive = false; clearInterval(t); };
  }, [merge]);

  const coins = useMemo(() => COINS.map(c => {
    const q = live[c.sym];
    if (!q?.price) return c;
    let hist = q.hist?.length ? q.hist : c.hist;
    // Verlauf endet immer beim aktuellen Kurs
    if (q.hist?.length) hist = [...q.hist.slice(0, -1), q.price];
    return {
      ...c,
      price: q.price,
      chg: q.chg ?? c.chg,
      volNum: q.volNum ?? c.volNum,
      vol: q.volNum ? `${fmtVol(q.volNum)} ${c.quote}` : c.vol,
      hist,
      times: q.hist?.length ? q.times : undefined
    };
  }), [live]);

  const value = useMemo<Ctx>(() => {
    const bySym = new Map(coins.map(c => [c.sym as string, c]));
    return {
      coins,
      coinOf: sym => bySym.get(sym),
      priceOf: a => (a === 'USDT' ? 1 : bySym.get(a)?.price ?? 0),
      status,
      statusOf: cat => (cat === 'crypto' ? status.crypto : status.tradfi),
      isLive: sym => !!live[sym]?.price
    };
  }, [coins, status, live]);

  return <QuotesCtx.Provider value={value}>{children}</QuotesCtx.Provider>;
}
