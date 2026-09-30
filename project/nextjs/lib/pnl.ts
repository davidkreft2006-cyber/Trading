/*
  Gewinn/Verlust je Asset nach der Durchschnittskosten-Methode.
  - Kauf: Menge und Einstand (bezahlter Betrag) steigen.
  - Einzahlung: mit Kurs zum Einzahlungszeitpunkt wie ein Kauf; ältere Einzahlungen ohne Kurs
    zählen zur Menge, aber nicht zur Bewertung (knownQty < qty).
  - Verkauf/Übertragung: Menge und Einstand sinken anteilig; beim Verkauf wird die Differenz
    aus Erlös und anteiligem Einstand als realisierter Gewinn/Verlust verbucht.
  Offener Gewinn/Verlust = knownQty × aktueller Kurs − Einstand (live mit jedem Kurs).
*/
import type { Tx } from './AccountContext';

export interface Position {
  qty: number;       // Bestand laut Verlauf
  knownQty: number;  // Teil davon mit bekanntem Einstand
  cost: number;      // Einstand in USD für knownQty
  realized: number;  // realisierter Gewinn/Verlust aus Verkäufen
}

export function positionsFrom(txs: Tx[]): Record<string, Position> {
  const out: Record<string, Position> = {};
  for (const t of [...txs].sort((a, b) => a.time - b.time)) {
    if (t.asset === 'USDT') continue;
    const p = (out[t.asset] ??= { qty: 0, knownQty: 0, cost: 0, realized: 0 });
    if (t.amount > 0) {
      p.qty += t.amount;
      const paid = t.type === 'buy' ? Math.abs(t.total ?? 0) : t.price ? t.amount * t.price : null;
      if (paid !== null && paid > 0) { p.knownQty += t.amount; p.cost += paid; }
    } else if (p.qty > 0) {
      const qtyOut = Math.min(-t.amount, p.qty);
      const f = qtyOut / p.qty;
      const knownOut = p.knownQty * f, costOut = p.cost * f;
      if (t.type === 'sell' && t.total) p.realized += Math.abs(t.total) * (knownOut / qtyOut) - costOut;
      p.qty -= qtyOut; p.knownQty -= knownOut; p.cost -= costOut;
    }
  }
  return out;
}

/** Offener Gewinn/Verlust einer Position zum aktuellen Kurs (null ohne Einstand oder Kurs) */
export function openPnl(p: Position | undefined, price: number, held: number) {
  if (!p || p.knownQty <= 1e-12 || p.cost <= 0 || !price) return null;
  // Bestand laut Datenbank ist maßgeblich; bewertet wird höchstens der Teil mit bekanntem Einstand
  const qty = Math.min(p.knownQty, held);
  const cost = p.cost * (qty / p.knownQty);
  if (cost <= 0) return null;
  const value = qty * price - cost;
  return { value, pct: (value / cost) * 100, cost, avg: cost / qty, partial: qty < held - 1e-9 };
}
