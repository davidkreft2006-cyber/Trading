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
  hist: number[];
}

// Deterministischer Verlauf, damit Server- und Client-Render identisch sind.
function makeHist(price: number, seed: number): number[] {
  const out: number[] = [];
  let v = price;
  for (let i = 59; i >= 0; i--) {
    out.unshift(v);
    v = v / (1 + Math.sin((i + seed) * 0.7) * 0.004 + Math.cos((i * seed) / 5) * 0.003);
  }
  return out;
}

const raw: Omit<Coin, 'hist'>[] = [
  { sym: 'BTC', name: 'Bitcoin', price: 64250, chg: 2.14, vol: '1,82 Mrd. USDT' },
  { sym: 'ETH', name: 'Ethereum', price: 3120.5, chg: -0.86, vol: '912 Mio. USDT' },
  { sym: 'SOL', name: 'Solana', price: 148.22, chg: 4.37, vol: '421 Mio. USDT' },
  { sym: 'BNB', name: 'BNB', price: 578.4, chg: 0.45, vol: '198 Mio. USDT' },
  { sym: 'XRP', name: 'XRP', price: 0.5234, chg: -1.72, vol: '265 Mio. USDT' },
  { sym: 'DOGE', name: 'Dogecoin', price: 0.1236, chg: 6.02, vol: '143 Mio. USDT' },
  { sym: 'ADA', name: 'Cardano', price: 0.3812, chg: -2.41, vol: '88 Mio. USDT' },
  { sym: 'LINK', name: 'Chainlink', price: 13.46, chg: 1.18, vol: '64 Mio. USDT' }
];

export const COINS: Coin[] = raw.map((c, i) => ({ ...c, hist: makeHist(c.price, i + 3) }));

export const priceOf = (a: Asset) => (a === 'USDT' ? 1 : COINS.find(c => c.sym === a)!.price);
export const nameOf = (a: Asset) => (a === 'USDT' ? 'Tether' : COINS.find(c => c.sym === a)!.name) + ' (Demo)';

export const nf = (v: number, d: number) =>
  v.toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d });
export const fmtPrice = (p: number) => nf(p, p < 1 ? 4 : 2);
export const fmtQty = (q: number) => q.toLocaleString('de-DE', { maximumFractionDigits: 8 });
export const fmtUsd = (v: number) => v.toLocaleString('de-DE', { style: 'currency', currency: 'USD' });
export const fmtChg = (c: number) => `${c >= 0 ? '+' : ''}${nf(c, 2)} %`;
export const parseAmount = (s: string) => {
  const t = s.trim();
  return t.includes(',') ? parseFloat(t.replace(/\./g, '').replace(',', '.')) : parseFloat(t);
};
