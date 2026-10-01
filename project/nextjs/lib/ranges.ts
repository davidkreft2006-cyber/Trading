/** Zeiträume für Kursverläufe. Gemeinsam für Browser (Binance) und /api/history (Yahoo, CoinGecko). */
export type RangeKey = '1s' | '5s' | '1m' | '5m' | '1d' | '1mo' | '1y';

export const RANGES: {
  key: RangeKey;
  label: string;   // Knopf
  desc: string;    // Bildunterschrift
  ttl: number;     // Cache in Sekunden
  binance: { interval: string; limit: number; bucket?: number };
  /** Sekunden-Zeiträume: aus Live-Ticks gebaut (Bucket in s, Anzahl Punkte); Yahoo/CoinGecko haben keine Sekundendaten */
  live?: { bucket: number; keep: number };
  yahoo?: { range: string; interval: string; last?: number; prePost?: boolean };
  coingecko?: { days: number; last?: number };
}[] = [
  { key: '1s', label: '1 Sek', desc: '1-Sekunden-Kurse, letzte 5 Minuten', ttl: 600,
    binance: { interval: '1s', limit: 300 }, live: { bucket: 1, keep: 300 } },
  { key: '5s', label: '5 Sek', desc: '5-Sekunden-Kurse, letzte 15 Minuten', ttl: 600,
    binance: { interval: '1s', limit: 900, bucket: 5 }, live: { bucket: 5, keep: 180 } },
  { key: '1m', label: '1 Min', desc: '1-Minuten-Kerzen, letzte 2 Stunden', ttl: 30,
    binance: { interval: '1m', limit: 120 }, yahoo: { range: '1d', interval: '1m', last: 120, prePost: true }, coingecko: { days: 1, last: 24 } },
  { key: '5m', label: '5 Min', desc: '5-Minuten-Kerzen, letzte 12 Stunden', ttl: 60,
    binance: { interval: '5m', limit: 144 }, yahoo: { range: '5d', interval: '5m', last: 144, prePost: true }, coingecko: { days: 1, last: 144 } },
  { key: '1d', label: 'Tag', desc: 'Letzte 24 Stunden', ttl: 120,
    binance: { interval: '15m', limit: 96 }, yahoo: { range: '1d', interval: '15m', prePost: true }, coingecko: { days: 1 } },
  { key: '1mo', label: 'Monat', desc: 'Letzte 30 Tage', ttl: 600,
    binance: { interval: '4h', limit: 180 }, yahoo: { range: '1mo', interval: '60m' }, coingecko: { days: 30 } },
  { key: '1y', label: 'Jahr', desc: 'Letzte 12 Monate', ttl: 3600,
    binance: { interval: '1d', limit: 365 }, yahoo: { range: '1y', interval: '1d' }, coingecko: { days: 365 } }
];
export const rangeOf = (k: string) => RANGES.find(r => r.key === k);
