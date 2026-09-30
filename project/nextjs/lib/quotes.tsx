'use client';
/*
  Live-Kurse.
  - Krypto: /api/crypto (CoinGecko, alle Coins in einer Abfrage, jede Minute) als Grundlage.
    Coins mit Binance-Paar zusätzlich direkt von Binance im Browser (REST zum Start,
    WebSocket für sekündliche Updates). Ohne API-Schlüssel.
  - Aktien, ETFs, Rohstoffe: /api/quotes (Yahoo Finance, serverseitig, in USD umgerechnet).
  - Detailverlauf (15-Minuten-Kerzen) wird nur für das gerade angesehene Instrument geladen (useHistory).
  Fällt eine Quelle aus, bleiben Beispielwerte (nur ursprüngliche Instrumente) bzw. „–“ stehen.
*/
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { COINS, fmtVol, type Asset, type Category, type Coin } from './data';
import type { Quote } from './quote-types';

const BINANCE_REST = 'https://data-api.binance.vision';
const BINANCE_WS = 'wss://data-stream.binance.vision/stream';
const PAIRS = COINS.filter(c => c.ids.binance).map(c => c.ids.binance!);
const SYM_BY_PAIR = new Map(COINS.filter(c => c.ids.binance).map(c => [c.ids.binance!, c.sym as string]));

export type FeedStatus = 'loading' | 'live' | 'fallback';

interface Ctx {
  coins: Coin[];
  coinOf: (sym: string) => Coin | undefined;
  priceOf: (a: Asset) => number;
  status: { crypto: FeedStatus; tradfi: FeedStatus };
  statusOf: (cat: Category) => FeedStatus;
  /** true, sobald Kurse aus einer echten Quelle stammen (nicht die Beispielwerte) */
  isLive: (sym: string) => boolean;
  /** Detailverlauf für ein Instrument anfordern (lädt höchstens alle 5 Minuten neu) */
  requestHistory: (sym: string) => void;
}

const QuotesCtx = createContext<Ctx | null>(null);
export const useQuotes = () => {
  const c = useContext(QuotesCtx);
  if (!c) throw new Error('useQuotes muss innerhalb von <QuotesProvider> verwendet werden');
  return c;
};

/** Detailverlauf für das angezeigte Instrument laden */
export function useHistory(sym: string | undefined) {
  const { requestHistory } = useQuotes();
  useEffect(() => { if (sym) requestHistory(sym); }, [sym, requestHistory]);
}

type Live = Record<string, Partial<Quote>>;

async function getJson<T>(url: string): Promise<T> {
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json() as Promise<T>;
}

const chunks = <T,>(a: T[], n: number) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));

export function QuotesProvider({ children }: { children: ReactNode }) {
  const [live, setLive] = useState<Live>({});
  const [status, setStatus] = useState<{ crypto: FeedStatus; tradfi: FeedStatus }>({ crypto: 'loading', tradfi: 'loading' });
  const pending = useRef<Live>({});
  const binanceSeen = useRef(new Set<string>()); // Kurs kommt von Binance (hat Vorrang vor CoinGecko)
  const detailed = useRef(new Set<string>());    // Verlauf aus 15-Minuten-Kerzen (hat Vorrang)
  const histLoaded = useRef(new Map<string, number>());

  const merge = useCallback((patch: Live) => {
    setLive(prev => {
      const next = { ...prev };
      for (const [k, v] of Object.entries(patch)) next[k] = { ...next[k], ...v };
      return next;
    });
  }, []);

  // ---- Binance: Startwerte per REST. Paketweise, damit ein nicht (mehr) gelistetes Paar
  // nicht die ganze Abfrage scheitern lässt; scheitert ein Paket, einzeln nachladen.
  const loadBinanceRest = useCallback(async () => {
    type Ticker = { symbol: string; lastPrice: string; priceChangePercent: string; quoteVolume: string };
    const one = (list: string[]) => getJson<Ticker[]>(`${BINANCE_REST}/api/v3/ticker/24hr?symbols=${encodeURIComponent(JSON.stringify(list))}`);
    const res = await Promise.all(chunks(PAIRS, 20).map(async c => {
      try { return await one(c); } catch {
        const single = await Promise.allSettled(c.map(p => one([p])));
        return single.flatMap(r => (r.status === 'fulfilled' ? r.value : []));
      }
    }));
    const patch: Live = {};
    for (const t of res.flat()) {
      const sym = SYM_BY_PAIR.get(t.symbol);
      if (!sym || !+t.lastPrice) continue;
      binanceSeen.current.add(sym);
      patch[sym] = { price: +t.lastPrice, chg: +t.priceChangePercent, volNum: +t.quoteVolume };
    }
    merge(patch);
    return Object.keys(patch).length;
  }, [merge]);

  // ---- CoinGecko (über eigene Route): alle Coins inkl. 24h-Verlauf
  const loadCoinGecko = useCallback(async () => {
    const { quotes } = await getJson<{ quotes: Record<string, Quote> }>('/api/crypto');
    const patch: Live = {};
    for (const [sym, q] of Object.entries(quotes)) {
      const histPart = detailed.current.has(sym) ? {} : { hist: q.hist, times: q.times };
      patch[sym] = binanceSeen.current.has(sym) ? histPart : { ...q, ...histPart };
    }
    merge(patch);
    return Object.keys(quotes).length;
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
      poll = setInterval(() => { loadBinanceRest().catch(() => {}); }, 15000);
    };

    const connect = () => {
      const streams = PAIRS.map(p => `${p.toLowerCase()}@miniTicker`).join('/');
      try { ws = new WebSocket(`${BINANCE_WS}?streams=${streams}`); } catch { startPolling(); return; }
      ws.onopen = () => { retry = 0; if (poll) { clearInterval(poll); poll = undefined; } };
      ws.onmessage = ev => {
        try {
          const d = JSON.parse(ev.data as string).data as { s: string; c: string; o: string; q: string };
          const sym = SYM_BY_PAIR.get(d.s);
          if (!sym) return;
          const c = +d.c, o = +d.o;
          binanceSeen.current.add(sym);
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

    const count = (p: Promise<number>) => p.catch(() => 0);
    Promise.all([count(loadBinanceRest()), count(loadCoinGecko())]).then(([b, g]) => {
      setStatus(s => ({ ...s, crypto: b + g > 0 ? 'live' : 'fallback' }));
    });
    connect();
    const cgTimer = setInterval(() => {
      loadCoinGecko().then(n => { if (n) setStatus(s => ({ ...s, crypto: 'live' })); }).catch(() => {});
    }, 60000);

    return () => {
      closed = true;
      ws?.close();
      clearInterval(flush); clearInterval(cgTimer);
      if (poll) clearInterval(poll);
      if (reconnect) clearTimeout(reconnect);
    };
  }, [loadBinanceRest, loadCoinGecko, merge]);

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

  // ---- Detailverlauf: 24 h in 15-Minuten-Kerzen von Binance (Aktien haben ihn schon aus /api/quotes)
  const requestHistory = useCallback((sym: string) => {
    const pair = COINS.find(c => c.sym === sym)?.ids.binance;
    if (!pair) return;
    const last = histLoaded.current.get(sym) ?? 0;
    if (Date.now() - last < 5 * 60000) return;
    histLoaded.current.set(sym, Date.now());
    type Kline = [number, string, string, string, string];
    getJson<Kline[]>(`${BINANCE_REST}/api/v3/klines?symbol=${pair}&interval=15m&limit=96`)
      .then(k => {
        if (k.length < 2) return;
        detailed.current.add(sym);
        merge({ [sym]: { hist: k.map(x => +x[4]), times: k.map(x => x[0]) } });
      })
      .catch(() => histLoaded.current.set(sym, last));
  }, [merge]);

  const coins = useMemo(() => COINS.map(c => {
    const q = live[c.sym];
    if (!q?.price) return c;
    // Verlauf endet immer beim aktuellen Kurs
    const hasHist = (q.hist?.length ?? 0) > 1;
    return {
      ...c,
      price: q.price,
      chg: q.chg ?? c.chg,
      volNum: q.volNum ?? c.volNum,
      vol: q.volNum ? `${fmtVol(q.volNum)} ${c.quote}` : c.vol,
      hist: hasHist ? [...q.hist!.slice(0, -1), q.price] : c.hist,
      times: hasHist ? q.times : undefined,
      local: q.local
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
      isLive: sym => !!live[sym]?.price,
      requestHistory
    };
  }, [coins, status, live, requestHistory]);

  return <QuotesCtx.Provider value={value}>{children}</QuotesCtx.Provider>;
}
