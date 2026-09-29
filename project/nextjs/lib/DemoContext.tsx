'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ASSETS, fmtPrice, fmtQty, nf, priceOf, type Asset, type CoinSym } from './data';
import { THEME_KEY, clearData, emptyBalances, loadData, saveData, type Balances, type DemoData, type Tx } from './storage';
import ConfirmDialog, { type ConfirmRequest } from '@/components/ConfirmDialog';

interface Ctx {
  ready: boolean;
  user: string | null;
  profileNames: string[];
  balances: Balances;
  txs: Tx[];
  total: number;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  login: (name: string) => string | null;
  logout: () => void;
  addFunds: (asset: Asset, amount: number) => void;
  trade: (side: 'buy' | 'sell', sym: CoinSym, qty: number) => void;
  transfer: (asset: Asset, amount: number, to: string) => void;
  resetAll: () => void;
  confirm: (req: ConfirmRequest) => void;
  toast: (msg: string) => void;
}

const DemoCtx = createContext<Ctx | null>(null);
export const useDemo = () => {
  const c = useContext(DemoCtx);
  if (!c) throw new Error('useDemo muss innerhalb von <DemoProvider> verwendet werden');
  return c;
};

const NAME_RE = /^[\p{L}\p{N} ._-]{2,24}$/u;

export function DemoProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<DemoData>({ session: null, profiles: {} });
  const [ready, setReady] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [pending, setPending] = useState<ConfirmRequest | null>(null);
  const [toastMsg, setToastMsg] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    setData(loadData());
    const t = localStorage.getItem(THEME_KEY) as 'light' | 'dark' | null;
    setTheme(t ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
    setReady(true);
  }, []);
  useEffect(() => { if (ready) saveData(data); }, [data, ready]);
  useEffect(() => { document.documentElement.classList.toggle('dark', theme === 'dark'); }, [theme]);

  const toast = useCallback((msg: string) => {
    clearTimeout(toastTimer.current);
    setToastMsg(msg);
    toastTimer.current = setTimeout(() => setToastMsg(''), 3200);
  }, []);

  const user = data.session;
  const profile = user ? data.profiles[user] : undefined;
  const balances = useMemo(() => ({ ...emptyBalances(), ...profile?.balances }), [profile]);
  const txs = profile?.txs ?? [];
  const total = ASSETS.reduce((t, a) => t + balances[a] * priceOf(a), 0);

  const commit = useCallback((next: Balances, tx: Omit<Tx, 'id' | 'time'>) => {
    setData(d => {
      if (!d.session) return d;
      const p = d.profiles[d.session] ?? { balances: emptyBalances(), txs: [] };
      const entry: Tx = { ...tx, id: crypto.randomUUID(), time: Date.now() };
      return { ...d, profiles: { ...d.profiles, [d.session]: { balances: next, txs: [entry, ...p.txs].slice(0, 200) } } };
    });
  }, []);

  const value: Ctx = {
    ready, user, balances, txs, total, theme,
    profileNames: Object.keys(data.profiles),
    toggleTheme: () => setTheme(t => {
      const n = t === 'dark' ? 'light' : 'dark';
      localStorage.setItem(THEME_KEY, n);
      return n;
    }),
    login: raw => {
      const name = raw.trim();
      if (!NAME_RE.test(name)) return '2–24 Zeichen: Buchstaben, Zahlen, Leerzeichen, Punkt, - und _.';
      const existed = !!data.profiles[name];
      setData(d => ({
        session: name,
        profiles: d.profiles[name] ? d.profiles : { ...d.profiles, [name]: { balances: emptyBalances(), txs: [] } }
      }));
      toast(existed ? `Willkommen zurück, ${name} (Demo)` : `Demo-Profil „${name}“ angelegt`);
      return null;
    },
    logout: () => { setData(d => ({ ...d, session: null })); toast('Abgemeldet. Demo-Daten bleiben gespeichert.'); },
    addFunds: (asset, amount) => {
      commit({ ...balances, [asset]: balances[asset] + amount },
        { type: 'Demo-Einzahlung', asset, amount, detail: 'Spielgeld · keine echte Einzahlung' });
      toast(`+${fmtQty(amount)} ${asset} Demo-Guthaben hinzugefügt`);
    },
    trade: (side, sym, qty) => {
      const price = priceOf(sym);
      const tot = qty * price;
      const b = { ...balances };
      if (side === 'buy') { b.USDT = Math.max(0, b.USDT - tot); b[sym] += qty; }
      else { b[sym] = Math.max(0, b[sym] - qty); b.USDT += tot; }
      commit(b, {
        type: side === 'buy' ? 'Kauf (Simulation)' : 'Verkauf (Simulation)', asset: sym,
        amount: side === 'buy' ? qty : -qty,
        detail: `@ ${fmtPrice(price)} USDT · ${side === 'buy' ? '−' : '+'}${nf(tot, 2)} USDT`
      });
      toast(`${side === 'buy' ? 'Demo-Kauf: +' : 'Demo-Verkauf: −'}${fmtQty(qty)} ${sym}`);
    },
    transfer: (asset, amount, to) => {
      commit({ ...balances, [asset]: Math.max(0, balances[asset] - amount) },
        { type: 'Übertragung (Simulation)', asset, amount: -amount, detail: `An Demo-Empfänger „${to}“` });
      toast(`Simulierte Übertragung an ${to} gebucht`);
    },
    resetAll: () => {
      clearData();
      setData({ session: null, profiles: {} });
      toast('Alle Demo-Daten wurden gelöscht.');
    },
    confirm: req => setPending(req),
    toast
  };

  return (
    <DemoCtx.Provider value={value}>
      {children}
      {pending && (
        <ConfirmDialog req={pending} onClose={() => setPending(null)}
          onConfirm={() => { pending.onConfirm(); setPending(null); }} />
      )}
      {toastMsg && (
        <div role="status" className="fixed bottom-6 left-1/2 z-[90] max-w-[calc(100%-32px)] -translate-x-1/2 border-l-[6px] border-accent bg-[#201e1d] px-4 py-3.5 text-[15px] font-semibold text-[#f3f2f2]">
          {toastMsg}
        </div>
      )}
    </DemoCtx.Provider>
  );
}
