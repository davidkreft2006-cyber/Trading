'use client';
import { useEffect, useState } from 'react';
import { fmtChg, type Coin } from '@/lib/data';
import { RANGES, rangeOf, type RangeKey } from '@/lib/ranges';
import { PriceChart, Segmented } from '@/components/ui/primitives';

/*
  Kursverlauf mit Zeitraum-Umschalter (1 Min, 5 Min, Tag, Monat, Jahr).
  „Tag“ nutzt den ohnehin live gehaltenen 24h-Verlauf. Alle anderen Zeiträume werden bei Bedarf geladen:
  Coins mit Binance-Paar direkt von Binance, alles andere über /api/history (Yahoo bzw. CoinGecko).
  Ergebnisse bleiben je Instrument und Zeitraum für die Cache-Dauer im Speicher.
*/

type Series = { hist: number[]; times: number[]; note?: string; at: number };
const cache = new Map<string, Series>();
const STORE_KEY = 'auvryn:chart-range';

async function fetchSeries(coin: Coin, key: RangeKey): Promise<Series> {
  const r = rangeOf(key)!;
  if (coin.ids.binance) {
    try {
      const res = await fetch(`https://data-api.binance.vision/api/v3/klines?symbol=${coin.ids.binance}&interval=${r.binance.interval}&limit=${r.binance.limit}`, { cache: 'no-store', signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const k = (await res.json()) as [number, string, string, string, string][];
        if (k.length > 1) return { hist: k.map(x => +x[4]), times: k.map(x => x[0]), at: Date.now() };
      }
    } catch { /* weiter mit dem Ausweichweg */ }
  }
  const res = await fetch(`/api/history?sym=${encodeURIComponent(coin.sym)}&range=${key}`);
  if (!res.ok) throw new Error(String(res.status));
  const d = (await res.json()) as { hist: number[]; times: number[]; note?: string };
  return { ...d, at: Date.now() };
}

function useRangeSeries(coin: Coin, key: RangeKey) {
  const id = `${coin.sym}:${key}`;
  const [series, setSeries] = useState<Series | undefined>(() => cache.get(id));
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (key === '1d') return;
    let alive = true;
    const ttl = rangeOf(key)!.ttl * 1000;
    setSeries(cache.get(id));
    setFailed(false);
    const load = () => {
      const hit = cache.get(id);
      if (hit && Date.now() - hit.at < ttl) { setSeries(hit); return; }
      fetchSeries(coin, key)
        .then(s => { cache.set(id, s); if (alive) setSeries(s); })
        .catch(() => { if (alive && !cache.get(id)) setFailed(true); });
    };
    load();
    const t = setInterval(load, ttl);
    return () => { alive = false; clearInterval(t); };
    // coin wechselt bei jedem Kurs-Tick; neu laden nur bei anderem Instrument oder Zeitraum
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (key === '1d') return { hist: coin.hist, times: coin.times ?? [], loading: false, failed: false, note: undefined };
  if (!series) return { hist: [], times: [], loading: !failed, failed, note: undefined };
  // Letzter Punkt = aktueller Live-Kurs, damit Chart und Kursanzeige übereinstimmen
  const hist = coin.price ? [...series.hist.slice(0, -1), coin.price] : series.hist;
  return { hist, times: series.times, loading: false, failed: false, note: series.note };
}

export default function RangeChart({ coin }: { coin: Coin }) {
  const [key, setKey] = useState<RangeKey>('1d');
  // Gewählten Zeitraum für alle Charts merken (nur Komfort, darf fehlen)
  useEffect(() => {
    try { const v = localStorage.getItem(STORE_KEY); if (v && rangeOf(v)) setKey(v as RangeKey); } catch { /* ohne Speicher */ }
  }, []);
  const pick = (k: RangeKey) => { setKey(k); try { localStorage.setItem(STORE_KEY, k); } catch { /* ohne Speicher */ } };

  const range = rangeOf(key)!;
  const { hist, times, loading, failed, note } = useRangeSeries(coin, key);
  const chg = hist.length > 1 && hist[0] ? (hist[hist.length - 1] / hist[0] - 1) * 100 : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <Segmented label="Zeitraum" value={key} onChange={pick} className="w-full sm:w-auto"
          options={RANGES.map(r => ({ value: r.key, label: r.label }))} />
        {chg !== null && (
          <span className="text-[13px] text-muted">
            <span className={`num font-medium ${chg >= 0 ? 'text-up' : 'text-down'}`}>{fmtChg(chg)}</span> im Zeitraum
          </span>
        )}
      </div>
      {loading ? (
        <div className="skeleton h-[clamp(220px,34vw,340px)]" aria-busy="true" aria-label="Verlauf wird geladen" />
      ) : (
        <PriceChart data={hist} times={times} up={(chg ?? coin.chg) >= 0} label={`${coin.sym}/${coin.quote}, ${range.label}`} unit={coin.quote} />
      )}
      <p className="hint">{range.desc}{note ? `. ${note}` : ''}{failed ? '. Verlauf gerade nicht verfügbar, bitte später erneut versuchen.' : ''}</p>
    </div>
  );
}
