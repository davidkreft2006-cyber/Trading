/** Live-Kurs eines Instruments (gemeinsam für Server-Route und Browser) */
export interface Quote {
  price: number;
  chg: number;     // % in 24 h bzw. gegenüber dem Vortagesschluss
  volNum: number;  // Handelsvolumen in USD/USDT
  hist: number[];
  times: number[]; // Unix-Millisekunden je Punkt in hist
}
