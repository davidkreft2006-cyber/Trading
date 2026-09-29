// Fiktive, statische Beispieldaten. Keine Live-Kurse, keine Anbindung an eine Börse.
export const ASSETS = [
  'USDT', 'BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'DOGE', 'ADA', 'LINK',
  'AAPL', 'MSFT', 'NVDA', 'TSLA', 'AMZN', 'SAP',
  'SPY', 'QQQ', 'IWDA', 'VWCE',
  'XAU', 'XAG', 'OIL'
] as const;
export type Asset = (typeof ASSETS)[number];
export type CoinSym = Exclude<Asset, 'USDT'>;

export type Category = 'crypto' | 'stock' | 'etf' | 'commodity';
export const CATEGORIES: { key: Category; label: string }[] = [
  { key: 'crypto', label: 'Krypto' },
  { key: 'stock', label: 'Aktien' },
  { key: 'etf', label: 'ETFs' },
  { key: 'commodity', label: 'Rohstoffe' }
];
export const categoryLabel = (c: Category) => CATEGORIES.find(x => x.key === c)!.label;

/** Instrument (Krypto, Aktie, ETF oder Rohstoff). Abgerechnet wird immer in USDT (1 USDT = 1 USD). */
export interface Coin {
  sym: CoinSym;
  name: string;
  cat: Category;
  quote: 'USDT' | 'USD'; // Kurswährung in der Anzeige
  price: number;
  chg: number;   // 24h in %
  vol: string;
  volNum: number; // für Sortierung
  hist: number[];
}

// Deterministischer Zufallspfad (gleicher Seed = gleiche Kurve), damit Server- und Client-Render identisch sind.
// Der Pfad wird so geneigt, dass Start- und Endwert zur angegebenen 24h-Änderung passen.
function makeHist(price: number, chg: number, seed: number, vola = 1): number[] {
  let t = seed * 0x9e3779b9;
  const rnd = () => { t = (t + 0x6d2b79f5) | 0; let r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; };
  const out: number[] = [];
  let v = 1, drift = 0;
  for (let i = 0; i < 60; i++) {
    drift = drift * 0.85 + (rnd() - 0.5) * 0.004 * vola;
    v *= 1 + drift + (rnd() - 0.5) * 0.006 * vola;
    out.push(v);
  }
  const n = out.length - 1;
  const norm = out.map(x => (x / out[n]) * price);
  const tilt = 1 / (1 + chg / 100) / (norm[0] / price);
  return norm.map((x, i) => x * tilt ** ((n - i) / n));
}

type Raw = Omit<Coin, 'hist' | 'volNum' | 'cat' | 'quote'>;
const crypto: Raw[] = [
  { sym: 'BTC', name: 'Bitcoin', price: 64250, chg: 2.14, vol: '1,82 Mrd. USDT' },
  { sym: 'ETH', name: 'Ethereum', price: 3120.5, chg: -0.86, vol: '912 Mio. USDT' },
  { sym: 'SOL', name: 'Solana', price: 148.22, chg: 4.37, vol: '421 Mio. USDT' },
  { sym: 'BNB', name: 'BNB', price: 578.4, chg: 0.45, vol: '198 Mio. USDT' },
  { sym: 'XRP', name: 'XRP', price: 0.5234, chg: -1.72, vol: '265 Mio. USDT' },
  { sym: 'DOGE', name: 'Dogecoin', price: 0.1236, chg: 6.02, vol: '143 Mio. USDT' },
  { sym: 'ADA', name: 'Cardano', price: 0.3812, chg: -2.41, vol: '88 Mio. USDT' },
  { sym: 'LINK', name: 'Chainlink', price: 13.46, chg: 1.18, vol: '64 Mio. USDT' }
];
const stocks: Raw[] = [
  { sym: 'AAPL', name: 'Apple', price: 228.52, chg: 0.84, vol: '9,6 Mrd. USD' },
  { sym: 'MSFT', name: 'Microsoft', price: 431.18, chg: -0.37, vol: '7,1 Mrd. USD' },
  { sym: 'NVDA', name: 'NVIDIA', price: 118.46, chg: 2.91, vol: '31,4 Mrd. USD' },
  { sym: 'TSLA', name: 'Tesla', price: 246.81, chg: -1.64, vol: '18,2 Mrd. USD' },
  { sym: 'AMZN', name: 'Amazon', price: 186.33, chg: 0.52, vol: '6,8 Mrd. USD' },
  { sym: 'SAP', name: 'SAP', price: 203.64, chg: 1.12, vol: '742 Mio. USD' }
];
const etfs: Raw[] = [
  { sym: 'SPY', name: 'S&P 500 ETF', price: 562.41, chg: 0.46, vol: '28,7 Mrd. USD' },
  { sym: 'QQQ', name: 'Nasdaq 100 ETF', price: 482.13, chg: 0.71, vol: '17,9 Mrd. USD' },
  { sym: 'IWDA', name: 'MSCI World ETF', price: 102.35, chg: 0.28, vol: '214 Mio. USD' },
  { sym: 'VWCE', name: 'FTSE All-World ETF', price: 124.82, chg: 0.33, vol: '96 Mio. USD' }
];
const commodities: Raw[] = [
  { sym: 'XAU', name: 'Gold (Feinunze)', price: 2381.4, chg: 0.62, vol: '146 Mrd. USD' },
  { sym: 'XAG', name: 'Silber (Feinunze)', price: 28.47, chg: -0.94, vol: '31 Mrd. USD' },
  { sym: 'OIL', name: 'Rohöl Brent (Barrel)', price: 82.13, chg: -1.21, vol: '24 Mrd. USD' }
];

const parseVol = (v: string) => parseFloat(v.replace(',', '.')) * (v.includes('Mrd.') ? 1e9 : 1e6);

// Schwankungsbreite des Beispielverlaufs je Kategorie (Krypto am stärksten)
const VOLA: Record<Category, number> = { crypto: 1, stock: 0.6, etf: 0.35, commodity: 0.45 };
const build = (list: Raw[], cat: Category, seed: number): Coin[] => list.map((c, i) => ({
  ...c, cat, quote: cat === 'crypto' ? 'USDT' : 'USD', volNum: parseVol(c.vol), hist: makeHist(c.price, c.chg, seed + i, VOLA[cat])
}));

export const COINS: Coin[] = [
  ...build(crypto, 'crypto', 3), ...build(stocks, 'stock', 20), ...build(etfs, 'etf', 40), ...build(commodities, 'commodity', 60)
];
export const coinsIn = (cat: Category) => COINS.filter(c => c.cat === cat);
/** Mit diesen Währungen lässt sich die Wallet aufladen; Aktien, ETFs und Rohstoffe kauft man mit USDT. */
export const FUNDABLE: Asset[] = ['USDT', ...coinsIn('crypto').map(c => c.sym)];
/** Volumen ohne Währungszusatz, für Tabellen */
export const volShort = (c: Coin) => c.vol.replace(/ USDT?$/, '');
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
