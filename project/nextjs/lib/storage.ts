// ─────────────────────────────────────────────────────────────
// HIER wird das Demo-Guthaben gespeichert:
// window.localStorage unter dem Schlüssel "kryo-demo:v1".
// Nichts davon verlässt den Browser – kein Server, keine API.
// ─────────────────────────────────────────────────────────────
import { ASSETS, type Asset } from './data';

export const STORAGE_KEY = 'kryo-demo:v1';

export type Balances = Record<Asset, number>;

export interface Tx {
  id: string;
  time: number;
  type: 'Demo-Einzahlung' | 'Kauf (Simulation)' | 'Verkauf (Simulation)' | 'Übertragung (Simulation)';
  asset: Asset;
  amount: number; // positiv = Zugang, negativ = Abgang
  detail: string;
}

export interface Profile { balances: Balances; txs: Tx[] }

// Gesamter gespeicherter Zustand: aktive Sitzung + alle Demo-Profile (nach Demo-Name).
export interface DemoData { session: string | null; profiles: Record<string, Profile> }

export const emptyBalances = (): Balances =>
  Object.fromEntries(ASSETS.map(a => [a, 0])) as Balances;

export function loadData(): DemoData {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (parsed && typeof parsed === 'object' && parsed.profiles) return parsed as DemoData;
  } catch { /* beschädigte Daten ignorieren */ }
  return { session: null, profiles: {} };
}

export function saveData(data: DemoData) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { /* Speicher voll oder blockiert */ }
}

export function clearData() {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* blockiert */ }
}
