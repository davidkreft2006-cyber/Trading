// Fiktive, statische Beispieldaten. Keine Live-Kurse, keine Anbindung an eine Börse.
export const ASSETS = ['USDT', 'BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'DOGE', 'ADA', 'LINK'] as const;
export type Asset = (typeof ASSETS)[number];
export type CoinSym = Exclude<Asset, 'USDT'>;

export interface Coin {
  sym: CoinSym;
  name: string;
  price: number; // USDT
  chg: number;   // 24h in %
  vol: string;
  volNum: number; // für Sortierung, in USDT
  hist: number[];
}

// Deterministischer Zufallspfad (gleicher Seed = gleiche Kurve), damit Server- und Client-Render identisch sind.
// Der Pfad wird so geneigt, dass Start- und Endwert zur angegebenen 24h-Änderung passen.
function makeHist(price: number, chg: number, seed: number): number[] {
  let t = seed * 0x9e3779b9;
  const rnd = () => { t = (t + 0x6d2b79f5) | 0; let r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; };
  const out: number[] = [];
  let v = 1, drift = 0;
  for (let i = 0; i < 60; i++) {
    drift = drift * 0.85 + (rnd() - 0.5) * 0.004;
    v *= 1 + drift + (rnd() - 0.5) * 0.006;
    out.push(v);
  }
  const n = out.length - 1;
  const norm = out.map(x => (x / out[n]) * price);
  const tilt = 1 / (1 + chg / 100) / (norm[0] / price);
  return norm.map((x, i) => x * tilt ** ((n - i) / n));
}

const raw: Omit<Coin, 'hist' | 'volNum'>[] = [
  { sym: 'BTC', name: 'Bitcoin', price: 64250, chg: 2.14, vol: '1,82 Mrd. USDT' },
  { sym: 'ETH', name: 'Ethereum', price: 3120.5, chg: -0.86, vol: '912 Mio. USDT' },
  { sym: 'SOL', name: 'Solana', price: 148.22, chg: 4.37, vol: '421 Mio. USDT' },
  { sym: 'BNB', name: 'BNB', price: 578.4, chg: 0.45, vol: '198 Mio. USDT' },
  { sym: 'XRP', name: 'XRP', price: 0.5234, chg: -1.72, vol: '265 Mio. USDT' },
  { sym: 'DOGE', name: 'Dogecoin', price: 0.1236, chg: 6.02, vol: '143 Mio. USDT' },
  { sym: 'ADA', name: 'Cardano', price: 0.3812, chg: -2.41, vol: '88 Mio. USDT' },
  { sym: 'LINK', name: 'Chainlink', price: 13.46, chg: 1.18, vol: '64 Mio. USDT' }
];

const parseVol = (v: string) => parseFloat(v.replace(',', '.')) * (v.includes('Mrd.') ? 1e9 : 1e6);

export const COINS: Coin[] = raw.map((c, i) => ({ ...c, volNum: parseVol(c.vol), hist: makeHist(c.price, c.chg, i + 3) }));
export const coinOf = (sym: string) => COINS.find(c => c.sym === sym);

export const priceOf = (a: Asset) => (a === 'USDT' ? 1 : COINS.find(c => c.sym === a)!.price);
export const nameOf = (a: Asset) => (a === 'USDT' ? 'Tether' : COINS.find(c => c.sym === a)!.name);

export const nf = (v: number, d: number) =>
  v.toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d });
export const fmtPrice = (p: number) => nf(p, p < 1 ? 4 : 2);
export const fmtQty = (q: number) => q.toLocaleString('de-DE', { maximumFractionDigits: 8 });
export const fmtUsd = (v: number) => v.toLocaleString('de-DE', { style: 'currency', currency: 'USD' });
export const fmtChg = (c: number) => `${c >= 0 ? '+' : '−'}${nf(Math.abs(c), 2)} %`;
// Akzeptiert deutsche Schreibweise ("12.500,5", "1.000") und einfache Dezimalpunkte ("0.25").
export const parseAmount = (s: string) => {
  const t = s.trim().replace(/[\s\u00a0']/g, '');
  if (t.includes(',')) return parseFloat(t.replace(/\./g, '').replace(',', '.'));
  if (/^[1-9]\d{0,2}(\.\d{3})+$/.test(t)) return parseFloat(t.replace(/\./g, ''));
  return parseFloat(t);
};
