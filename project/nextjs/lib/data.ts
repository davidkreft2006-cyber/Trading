/*
  Stammdaten der Instrumente.
  Jedes Instrument hat ein Anzeige-Kürzel (sym, zugleich Schlüssel in der Datenbank) und
  zusätzlich eindeutige Kennungen der Kursanbieter, weil Kürzel allein nicht eindeutig sind:
  - Krypto: CoinGecko-ID (z. B. "avalanche-2") und, falls dort gehandelt, das Binance-Paar (z. B. "AVAXUSDT")
  - Aktien, ETFs, Rohstoffe: Yahoo-Finance-Symbol mit Börsenkürzel (z. B. "SAP.DE", "7203.T", "BRK-B")
  Kurse kommen ausschließlich aus echten Quellen (lib/quotes.tsx). Es gibt keine erfundenen
  Beispielwerte: bis ein echter Kurs da ist (live oder zuletzt gespeichert), steht „–“ und das
  Instrument ist nicht handelbar.
*/

export type Category = 'crypto' | 'stock' | 'etf' | 'commodity';
export type Region = 'us' | 'eu' | 'asia';

// [Kürzel, Name, CoinGecko-ID, auf Binance als <Kürzel>USDT gehandelt]
const CRYPTO_DEF = [
  ['BTC', 'Bitcoin', 'bitcoin', 1], ['ETH', 'Ethereum', 'ethereum', 1], ['SOL', 'Solana', 'solana', 1],
  ['XRP', 'XRP', 'ripple', 1], ['BNB', 'BNB', 'binancecoin', 1], ['ADA', 'Cardano', 'cardano', 1],
  ['DOGE', 'Dogecoin', 'dogecoin', 1], ['TRX', 'TRON', 'tron', 1], ['LINK', 'Chainlink', 'chainlink', 1],
  ['AVAX', 'Avalanche', 'avalanche-2', 1], ['XLM', 'Stellar', 'stellar', 1], ['SUI', 'Sui', 'sui', 1],
  ['HBAR', 'Hedera', 'hedera-hashgraph', 1], ['LTC', 'Litecoin', 'litecoin', 1], ['BCH', 'Bitcoin Cash', 'bitcoin-cash', 1],
  ['XMR', 'Monero', 'monero', 0], ['ZEC', 'Zcash', 'zcash', 1], ['DOT', 'Polkadot', 'polkadot', 1],
  ['UNI', 'Uniswap', 'uniswap', 1], ['AAVE', 'Aave', 'aave', 1], ['NEAR', 'NEAR Protocol', 'near', 1],
  ['ATOM', 'Cosmos', 'cosmos', 1], ['ICP', 'Internet Computer', 'internet-computer', 1], ['ETC', 'Ethereum Classic', 'ethereum-classic', 1],
  ['ALGO', 'Algorand', 'algorand', 1], ['FIL', 'Filecoin', 'filecoin', 1], ['RENDER', 'Render', 'render-token', 1],
  ['TAO', 'Bittensor', 'bittensor', 1], ['QNT', 'Quant', 'quant-network', 1], ['HYPE', 'Hyperliquid', 'hyperliquid', 0],
  ['POL', 'Polygon', 'polygon-ecosystem-token', 1], ['ARB', 'Arbitrum', 'arbitrum', 1], ['OP', 'Optimism', 'optimism', 1],
  ['KAS', 'Kaspa', 'kaspa', 0], ['CRO', 'Cronos', 'crypto-com-chain', 0], ['SHIB', 'Shiba Inu', 'shiba-inu', 1],
  ['PEPE', 'Pepe', 'pepe', 1], ['BONK', 'Bonk', 'bonk', 1], ['WIF', 'dogwifhat', 'dogwifcoin', 1],
  ['ONDO', 'Ondo', 'ondo-finance', 0], ['ENA', 'Ethena', 'ethena', 1], ['MNT', 'Mantle', 'mantle', 0],
  ['PENDLE', 'Pendle', 'pendle', 1], ['INJ', 'Injective', 'injective-protocol', 1], ['FET', 'Artificial Superintelligence Alliance', 'fetch-ai', 1],
  ['WLD', 'Worldcoin', 'worldcoin-wld', 1], ['PUMP', 'Pump.fun', 'pump-fun', 0], ['VIRTUAL', 'Virtuals Protocol', 'virtual-protocol', 0],
  ['STX', 'Stacks', 'blockstack', 1], ['SEI', 'Sei', 'sei-network', 1], ['APT', 'Aptos', 'aptos', 1],
  ['TIA', 'Celestia', 'celestia', 1], ['JUP', 'Jupiter', 'jupiter-exchange-solana', 1], ['RAY', 'Raydium', 'raydium', 1],
  ['PYTH', 'Pyth Network', 'pyth-network', 1], ['CRV', 'Curve DAO', 'curve-dao-token', 1], ['CAKE', 'PancakeSwap', 'pancakeswap-token', 1],
  ['LDO', 'Lido DAO', 'lido-dao', 1], ['SKY', 'Sky', 'sky', 0], ['MORPHO', 'Morpho', 'morpho', 0],
  ['ETHFI', 'ether.fi', 'ether-fi', 1], ['ZRO', 'LayerZero', 'layerzero', 1], ['IMX', 'Immutable', 'immutable-x', 1],
  ['GRT', 'The Graph', 'the-graph', 1], ['SAND', 'The Sandbox', 'the-sandbox', 1], ['MANA', 'Decentraland', 'decentraland', 1],
  ['AXS', 'Axie Infinity', 'axie-infinity', 1], ['GALA', 'Gala', 'gala', 1], ['CHZ', 'Chiliz', 'chiliz', 1],
  ['ENJ', 'Enjin Coin', 'enjincoin', 1], ['THETA', 'Theta Network', 'theta-token', 1], ['FLOW', 'Flow', 'flow', 1],
  ['NEO', 'Neo', 'neo', 1], ['VET', 'VeChain', 'vechain', 1], ['XDC', 'XDC Network', 'xdce-crowd-sale', 0],
  ['FLR', 'Flare', 'flare-networks', 0], ['DASH', 'Dash', 'dash', 1], ['BAT', 'Basic Attention Token', 'basic-attention-token', 1],
  ['COMP', 'Compound', 'compound-governance-token', 1], ['SNX', 'Synthetix', 'havven', 1], ['1INCH', '1inch', '1inch', 1],
  ['ZRX', '0x', '0x', 1], ['YFI', 'yearn.finance', 'yearn-finance', 1], ['SUSHI', 'SushiSwap', 'sushi', 1],
  ['DYDX', 'dYdX', 'dydx-chain', 1], ['GMX', 'GMX', 'gmx', 1], ['RUNE', 'THORChain', 'thorchain', 1],
  ['USDC', 'USD Coin', 'usd-coin', 1], ['DAI', 'Dai', 'dai', 0], ['PYUSD', 'PayPal USD', 'paypal-usd', 0],
  ['EURC', 'EURC', 'euro-coin', 0], ['PAXG', 'PAX Gold', 'pax-gold', 1], ['XAUT', 'Tether Gold', 'tether-gold', 0],
  ['OKB', 'OKB', 'okb', 0], ['GT', 'GateToken', 'gatechain-token', 0], ['KCS', 'KuCoin Token', 'kucoin-shares', 0],
  ['BGB', 'Bitget Token', 'bitget-token', 0], ['NEXO', 'Nexo', 'nexo', 0], ['PI', 'Pi', 'pi-network', 0]
] as const;

// [Kürzel, Name, Yahoo-Symbol]. Ohne Börsensuffix = US-Börse in USD.
const STOCK_DEF = [
  ['NVDA', 'NVIDIA', 'NVDA'], ['AAPL', 'Apple', 'AAPL'], ['MSFT', 'Microsoft', 'MSFT'], ['GOOGL', 'Alphabet', 'GOOGL'],
  ['AMZN', 'Amazon', 'AMZN'], ['META', 'Meta', 'META'], ['TSLA', 'Tesla', 'TSLA'], ['AVGO', 'Broadcom', 'AVGO'],
  ['AMD', 'AMD', 'AMD'], ['TSM', 'TSMC', 'TSM'], ['BRK.B', 'Berkshire Hathaway', 'BRK-B'], ['JPM', 'JPMorgan Chase', 'JPM'],
  ['V', 'Visa', 'V'], ['MA', 'Mastercard', 'MA'], ['WMT', 'Walmart', 'WMT'], ['COST', 'Costco', 'COST'],
  ['JNJ', 'Johnson & Johnson', 'JNJ'], ['LLY', 'Eli Lilly', 'LLY'], ['ABBV', 'AbbVie', 'ABBV'], ['UNH', 'UnitedHealth', 'UNH'],
  ['PFE', 'Pfizer', 'PFE'], ['MRK', 'Merck & Co.', 'MRK'], ['PG', 'Procter & Gamble', 'PG'], ['KO', 'Coca-Cola', 'KO'],
  ['PEP', 'PepsiCo', 'PEP'], ['MCD', 'McDonald’s', 'MCD'], ['HD', 'Home Depot', 'HD'], ['DIS', 'Disney', 'DIS'],
  ['NFLX', 'Netflix', 'NFLX'], ['CRM', 'Salesforce', 'CRM'], ['ORCL', 'Oracle', 'ORCL'], ['ADBE', 'Adobe', 'ADBE'],
  ['NOW', 'ServiceNow', 'NOW'], ['PLTR', 'Palantir', 'PLTR'], ['INTC', 'Intel', 'INTC'], ['MU', 'Micron', 'MU'],
  ['QCOM', 'Qualcomm', 'QCOM'], ['AMAT', 'Applied Materials', 'AMAT'], ['LRCX', 'Lam Research', 'LRCX'], ['KLAC', 'KLA', 'KLAC'],
  ['TXN', 'Texas Instruments', 'TXN'], ['CSCO', 'Cisco', 'CSCO'], ['IBM', 'IBM', 'IBM'], ['PANW', 'Palo Alto Networks', 'PANW'],
  ['CRWD', 'CrowdStrike', 'CRWD'], ['SNOW', 'Snowflake', 'SNOW'], ['UBER', 'Uber', 'UBER'], ['ABNB', 'Airbnb', 'ABNB'],
  ['BKNG', 'Booking Holdings', 'BKNG'], ['PYPL', 'PayPal', 'PYPL'], ['COIN', 'Coinbase', 'COIN'], ['HOOD', 'Robinhood', 'HOOD'],
  ['MSTR', 'Strategy', 'MSTR'], ['XOM', 'Exxon Mobil', 'XOM'], ['CVX', 'Chevron', 'CVX'], ['CAT', 'Caterpillar', 'CAT'],
  ['BA', 'Boeing', 'BA'], ['GE', 'GE Aerospace', 'GE'], ['GEV', 'GE Vernova', 'GEV'], ['NKE', 'Nike', 'NKE'],
  ['SAP', 'SAP', 'SAP.DE'], ['SIE', 'Siemens', 'SIE.DE'], ['ALV', 'Allianz', 'ALV.DE'], ['DTE', 'Deutsche Telekom', 'DTE.DE'],
  ['RHM', 'Rheinmetall', 'RHM.DE'], ['ENR', 'Siemens Energy', 'ENR.DE'], ['MBG', 'Mercedes-Benz', 'MBG.DE'], ['BMW', 'BMW', 'BMW.DE'],
  ['VOW3', 'Volkswagen Vz.', 'VOW3.DE'], ['IFX', 'Infineon', 'IFX.DE'], ['BAS', 'BASF', 'BAS.DE'], ['BAYN', 'Bayer', 'BAYN.DE'],
  ['DBK', 'Deutsche Bank', 'DBK.DE'], ['AIR', 'Airbus', 'AIR.PA'], ['ASML', 'ASML', 'ASML.AS'], ['MC', 'LVMH', 'MC.PA'],
  ['OR', 'L’Oréal', 'OR.PA'], ['SU', 'Schneider Electric', 'SU.PA'], ['TTE', 'TotalEnergies', 'TTE.PA'], ['NESN', 'Nestlé', 'NESN.SW'],
  ['NOVN', 'Novartis', 'NOVN.SW'], ['ROG', 'Roche', 'ROG.SW'], ['NOVO-B', 'Novo Nordisk', 'NOVO-B.CO'], ['AZN', 'AstraZeneca', 'AZN.L'],
  ['SHEL', 'Shell', 'SHEL.L'], ['UBSG', 'UBS', 'UBSG.SW'], ['HSBA', 'HSBC', 'HSBA.L'], ['RR', 'Rolls-Royce', 'RR.L'],
  ['BARC', 'Barclays', 'BARC.L'], ['ULVR', 'Unilever', 'ULVR.L'], ['005930', 'Samsung Electronics', '005930.KS'], ['000660', 'SK Hynix', '000660.KS'],
  ['7203', 'Toyota', '7203.T'], ['6758', 'Sony', '6758.T'], ['9984', 'SoftBank Group', '9984.T'], ['7974', 'Nintendo', '7974.T'],
  ['0700', 'Tencent', '0700.HK'], ['9988', 'Alibaba', '9988.HK'], ['1211', 'BYD', '1211.HK'], ['2454', 'MediaTek', '2454.TW']
] as const;

const ETF_DEF = [
  ['SPY', 'S&P 500 ETF', 'SPY'], ['QQQ', 'Nasdaq 100 ETF', 'QQQ'], ['URTH', 'MSCI World ETF', 'URTH'], ['VT', 'Vanguard Total World ETF', 'VT']
] as const;
const COMMODITY_DEF = [
  ['XAU', 'Gold (Feinunze)', 'GC=F'], ['XAG', 'Silber (Feinunze)', 'SI=F'], ['OIL', 'Rohöl Brent (Barrel)', 'BZ=F']
] as const;

export type CoinSym =
  | (typeof CRYPTO_DEF)[number][0] | (typeof STOCK_DEF)[number][0]
  | (typeof ETF_DEF)[number][0] | (typeof COMMODITY_DEF)[number][0];
export type Asset = 'USDT' | CoinSym;

export const CATEGORIES: { key: Category; label: string }[] = [
  { key: 'crypto', label: 'Krypto' },
  { key: 'stock', label: 'Aktien' },
  { key: 'etf', label: 'ETFs' },
  { key: 'commodity', label: 'Rohstoffe' }
];
export const categoryLabel = (c: Category) => CATEGORIES.find(x => x.key === c)!.label;
export const REGIONS: { key: Region; label: string }[] = [
  { key: 'us', label: 'USA' }, { key: 'eu', label: 'Europa' }, { key: 'asia', label: 'Asien' }
];

/** Instrument (Krypto, Aktie, ETF oder Rohstoff). Abgerechnet wird immer in USDT (1 USDT = 1 USD). */
export interface Coin {
  sym: CoinSym;
  name: string;
  cat: Category;
  quote: 'USDT' | 'USD'; // Kurswährung in der Anzeige
  price: number;         // 0 = noch kein Kurs verfügbar
  chg: number;           // 24h in %
  vol: string;
  volNum: number;        // für Sortierung
  hist: number[];
  times?: number[];      // Zeitstempel zu hist (nur bei Live-Daten)
  /** Eindeutige Kennungen der Kursanbieter */
  ids: { coingecko?: string; binance?: string; yahoo?: string };
  region?: Region;
  /** Kurs in Börsenwährung, falls nicht USD (z. B. 245,10 EUR) */
  local?: { price: number; ccy: string };
}

const regionOf = (yahoo: string): Region =>
  /\.(KS|T|HK|TW)$/.test(yahoo) ? 'asia' : /\.(DE|PA|AS|SW|CO|L)$/.test(yahoo) ? 'eu' : 'us';

function make(sym: CoinSym, name: string, cat: Category, ids: Coin['ids']): Coin {
  // Bewusst ohne erfundene Startwerte: bis echte Kurse da sind, gilt price = 0 („–“, nicht handelbar)
  return {
    sym, name, cat, ids, quote: cat === 'crypto' ? 'USDT' : 'USD',
    region: ids.yahoo && cat === 'stock' ? regionOf(ids.yahoo) : undefined,
    price: 0, chg: 0, vol: '–', volNum: 0, hist: []
  };
}

export const COINS: Coin[] = [
  ...CRYPTO_DEF.map(([s, n, cg, bn]) => make(s, n, 'crypto', { coingecko: cg, binance: bn ? `${s}USDT` : undefined })),
  ...STOCK_DEF.map(([s, n, y]) => make(s, n, 'stock', { yahoo: y })),
  ...ETF_DEF.map(([s, n, y]) => make(s, n, 'etf', { yahoo: y })),
  ...COMMODITY_DEF.map(([s, n, y]) => make(s, n, 'commodity', { yahoo: y }))
];

/** Alle Assets inkl. USDT (Abrechnungswährung) */
export const ASSETS: readonly Asset[] = ['USDT', ...COINS.map(c => c.sym)];
export const isAsset = (s: string): s is Asset => ASSETS.includes(s as Asset);

export const coinsIn = (cat: Category) => COINS.filter(c => c.cat === cat);
/** Mit diesen Währungen lässt sich die Wallet aufladen; alles andere kauft man mit USDT. */
export const FUNDABLE: Asset[] = ['USDT', 'BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'DOGE', 'ADA', 'LINK'];
/** Auf der Startseite zuerst gezeigt */
export const FEATURED_CRYPTO: CoinSym[] = ['BTC', 'ETH', 'SOL', 'XRP'];
export const FEATURED_STOCKS: CoinSym[] = ['NVDA', 'AAPL', 'MSFT', 'TSLA'];

/** Volumen als Kurztext, z. B. 1,82 Mrd. */
export const fmtVol = (v: number) =>
  v >= 1e9 ? `${nf(v / 1e9, v >= 1e10 ? 1 : 2)} Mrd.` : v >= 1e6 ? `${Math.round(v / 1e6).toLocaleString('de-DE')} Mio.` : v.toLocaleString('de-DE', { maximumFractionDigits: 0 });

/** Volumen ohne Währungszusatz, für Tabellen */
export const volShort = (c: Coin) => c.vol.replace(/ USDT?$/, '');
export const coinOf = (sym: string) => COINS.find(c => c.sym === sym);

export const nameOf = (a: Asset) => (a === 'USDT' ? 'Tether' : coinOf(a)?.name ?? a);

/** Lesbare Bezeichnung der Kursquelle, z. B. „Yahoo Finance: SAP.DE“ */
export const sourceLabel = (c: Coin) =>
  c.ids.yahoo ? `Yahoo Finance: ${c.ids.yahoo}`
  : [c.ids.binance && `Binance: ${c.ids.binance}`, c.ids.coingecko && `CoinGecko: ${c.ids.coingecko}`].filter(Boolean).join(' · ');

export const nf = (v: number, d: number) =>
  v.toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d });
/** Kurs: ab 1 mit 2, darunter mit 4 Nachkommastellen, sehr kleine Werte mit 4 gültigen Ziffern; 0 = kein Kurs */
export const fmtPrice = (p: number) =>
  !p ? '–' : p >= 1 ? nf(p, 2) : p >= 0.01 ? nf(p, 4) : p.toLocaleString('de-DE', { maximumSignificantDigits: 4 });
export const fmtQty = (q: number) => q.toLocaleString('de-DE', { maximumFractionDigits: 8 });
export const fmtUsd = (v: number) => v.toLocaleString('de-DE', { style: 'currency', currency: 'USD' });
export const fmtChg = (c: number) => `${c >= 0 ? '+' : '−'}${nf(Math.abs(c), 2)} %`;
// Akzeptiert deutsche Schreibweise ("12.500,5", "1.000") und einfache Dezimalpunkte ("0.25").
export const parseAmount = (s: string) => {
  const t = s.trim().replace(/[\s ']/g, '');
  if (t.includes(',')) return parseFloat(t.replace(/\./g, '').replace(',', '.'));
  if (/^[1-9]\d{0,2}(\.\d{3})+$/.test(t)) return parseFloat(t.replace(/\./g, ''));
  return parseFloat(t);
};

/**
  Suche über Kürzel, Name und Anbieter-Kennungen, sortiert nach Relevanz:
  exaktes Kürzel > Kürzel beginnt mit > Name beginnt mit > Name/Kennung enthält.
*/
export function searchCoins<T extends Coin>(list: T[], query: string): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return list;
  const rank = (c: Coin) => {
    const sym = c.sym.toLowerCase(), name = c.name.toLowerCase();
    if (sym === q) return 0;
    if (sym.startsWith(q)) return 1;
    if (name.startsWith(q) || name.split(/[\s.-]+/).some(w => w.startsWith(q))) return 2;
    if ([name, c.ids.yahoo, c.ids.coingecko, c.ids.binance].some(v => v?.toLowerCase().includes(q))) return 3;
    return -1;
  };
  return list.map(c => [c, rank(c)] as const).filter(([, r]) => r >= 0).sort((a, b) => a[1] - b[1]).map(([c]) => c);
}
