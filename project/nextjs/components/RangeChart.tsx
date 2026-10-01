'use client';
import { useEffect, useState } from 'react';
import { fmtChg, type Coin } from '@/lib/data';
import { RANGES, rangeOf, type RangeKey } from '@/lib/ranges';
import { PriceChart, Segmented } from '@/components/ui/primitives';
import { useQuotes } from '@/lib/quotes';

/*
  Kursverlauf mit Zeitraum-Umschalter (1 Sek, 5 Sek, 1 Min, 5 Min, Tag, Monat, Jahr).
  „Tag“ nutzt den ohnehin live gehaltenen 24h-Verlauf. Alle anderen Zeiträume werden bei Bedarf geladen:
  Coins mit Binance-Paar direkt von Binance, alles andere über /api/history (Yahoo bzw. CoinGecko).
  Sekunden-Zeiträume: Binance-1-Sekunden-Kerzen als Vorlauf, danach laufend aus den Live-Ticks ergänzt.
  Für Aktien gibt es keine Sekundendaten zum Nachladen; dort wächst der Verlauf aus den Live-Kursen
  (Abfrage alle 3 s) ab dem Öffnen der Ansicht.
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
        if (k.length > 1) {
          // Schlusskurs der Kerze, Zeitpunkt = Kerzenende (passt zu den Live-Ticks)
          const pts = k.map(x => [x[0] + (r.binance.interval === '1s' ? 1000 : 0), +x[4]] as [number, number]);
          const b = r.binance.bucket ? bucketize(pts, r.binance.bucket) : pts;
          return { hist: b.map(p => p[1]), times: b.map(p => p[0]), at: Date.now() };
        }
      }
    } catch { /* weiter mit dem Ausweichweg */ }
  }
  // Sekundendaten gibt es nur von Binance; sonst ausschließlich Live-Ticks
  if (r.live) return { hist: [], times: [], at: Date.now() };
  const res = await fetch(`/api/history?sym=${encodeURIComponent(coin.sym)}&range=${key}`);
  if (!res.ok) throw new Error(String(res.status));
  const d = (await res.json()) as { hist: number[]; times: number[]; note?: string };
  return { ...d, at: Date.now() };
}

/** Letzter Kurs je Zeitfenster von `sec` Sekunden */
function bucketize(pts: [number, number][], sec: number): [number, number][] {
  const out: [number, number][] = [];
  for (const [t, v] of pts) {
    const b = Math.floor(t / (sec * 1000)) * sec * 1000;
    if (out.length && out[out.length - 1][0] === b) out[out.length - 1][1] = v; else out.push([b, v]);
  }
  return out;
}

function useRangeSeries(coin: Coin, key: RangeKey) {
  const { statusOf, ticksOf } = useQuotes();
  const dayLoading = statusOf(coin.cat) === 'loading';
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

  if (key === '1d') return { hist: coin.hist, times: coin.times ?? [], loading: coin.hist.length < 2 && dayLoading, failed: false, note: undefined };
  const live = rangeOf(key)!.live;
  if (live) {
    // Vorlauf (Binance-Kerzen) + Live-Ticks danach, auf das Zeitfenster gebündelt
    const base: [number, number][] = series ? series.times.map((t, i) => [t, series.hist[i]]) : [];
    const lastT = base.length ? base[base.length - 1][0] : 0;
    const pts = bucketize([...base, ...ticksOf(coin.sym).filter(([t]) => t > lastT)], live.bucket).slice(-live.keep);
    // Ein einzelner Kurs reicht für eine Linie: ab „jetzt“ waagerecht fortschreiben
    if (pts.length === 1) pts.push([Date.now(), pts[0][1]]);
    return { hist: pts.map(p => p[1]), times: pts.map(p => p[0]), loading: !series && !failed && !pts.length, failed: false, note: undefined, collecting: pts.length < 2 };
  }
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
  const { hist, times, loading, failed, note, collecting } = useRangeSeries(coin, key) as ReturnType<typeof useRangeSeries> & { collecting?: boolean };
  const closed = coin.market === 'closed';
  const chg = hist.length > 1 && hist[0] ? (hist[hist.length - 1] / hist[0] - 1) * 100 : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        {/* Sieben Zeiträume: auf schmalen Handys seitlich wischbar */}
        <div className="-mx-4 w-[calc(100%+2rem)] overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:w-auto sm:px-0">
          <Segmented label="Zeitraum" value={key} onChange={pick} className="min-w-max"
            options={RANGES.map(r => ({ value: r.key, label: r.label }))} />
        </div>
        {chg !== null && (
          <span className="text-[13px] text-muted">
            <span className={`num font-medium ${chg >= 0 ? 'text-up' : 'text-down'}`}>{fmtChg(chg)}</span> im Zeitraum
          </span>
        )}
      </div>
      {loading ? (
        <div className="skeleton h-[clamp(220px,34vw,340px)]" aria-busy="true" aria-label="Verlauf wird geladen" />
      ) : collecting ? (
        <div className="flex h-[clamp(220px,34vw,340px)] flex-col items-center justify-center gap-2 rounded-ctl border border-dashed border-line text-center">
          <span className="h-2 w-2 rounded-full bg-accent motion-safe:animate-pulse" aria-hidden />
          <span className="text-sm font-medium text-muted">Sammle Live-Kurse …</span>
          <span className="max-w-[36ch] text-[13px] text-faint">Für {coin.sym} gibt es keine Sekundendaten zum Nachladen. Der Verlauf entsteht ab jetzt aus den Live-Kursen.</span>
        </div>
      ) : (
        <PriceChart data={hist} times={times} up={(chg ?? coin.chg) >= 0} label={`${coin.sym}/${coin.quote}, ${range.label}`} unit={coin.quote} />
      )}
      <p className="hint">
        {range.live && !coin.ids.binance ? `Live-Kurse seit dem Öffnen (alle ${coin.ids.yahoo ? 3 : 15} s abgefragt)` : range.desc}
        {note ? `. ${note}` : ''}
        {failed ? '. Verlauf gerade nicht verfügbar, bitte später erneut versuchen.' : ''}
        {closed && range.live ? '. Börse geschlossen, der Kurs bewegt sich erst wieder zur nächsten Sitzung.' : ''}
      </p>
    </div>
  );
}
