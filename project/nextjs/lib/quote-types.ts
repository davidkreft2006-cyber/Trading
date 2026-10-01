/** Live-Kurs eines Instruments (gemeinsam für Server-Routen und Browser) */
export interface Quote {
  price: number;   // in USD bzw. USDT
  chg: number;     // % in 24 h bzw. gegenüber dem Vortagesschluss
  volNum: number;  // Handelsvolumen in USD/USDT
  hist: number[];
  times: number[]; // Unix-Millisekunden je Punkt in hist
  /** Kurs in Börsenwährung, falls diese nicht USD ist */
  local?: { price: number; ccy: string };
  /** Börsenstatus (nur Aktien/ETFs/Rohstoffe): vorbörslich, regulär, nachbörslich, geschlossen */
  market?: MarketState;
  /** Nächste Handelsmöglichkeit (Vorbörse bzw. Eröffnung), Unix-Millisekunden */
  nextOpen?: number;
}

export type MarketState = 'pre' | 'regular' | 'post' | 'closed';
