'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ASSETS, fmtPrice, fmtQty, nf, priceOf, type Asset, type CoinSym } from './data';
import { clearData, emptyBalances, loadData, saveData, type Balances, type DemoData, type Tx } from './storage';
import { CheckCircle } from '@phosphor-icons/react';
import ConfirmDialog, { type ConfirmRequest } from '@/components/ConfirmDialog';

interface Ctx {
  ready: boolean;
  user: string | null;
  profileNames: string[];
  balances: Balances;
  txs: Tx[];
  total: number;
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

const NAME_RE = /^[\p{L}\p{N} ._-]+$/u;

export function DemoProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<DemoData>({ session: null, profiles: {} });
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState<ConfirmRequest | null>(null);
  const [toastMsg, setToastMsg] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    setData(loadData());
    setReady(true);
  }, []);
  useEffect(() => { if (ready) saveData(data); }, [data, ready]);

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
    ready, user, balances, txs, total,
    profileNames: Object.keys(data.profiles),
    login: raw => {
      const name = raw.trim();
      if (name.length < 2) return 'Bitte mindestens 2 Zeichen eingeben.';
      if (name.length > 24) return 'Maximal 24 Zeichen.';
      if (!NAME_RE.test(name)) return 'Nur Buchstaben, Zahlen, Leerzeichen, Punkt, - und _.';
      const existed = !!data.profiles[name];
      setData(d => ({
        session: name,
        profiles: d.profiles[name] ? d.profiles : { ...d.profiles, [name]: { balances: emptyBalances(), txs: [] } }
      }));
      toast(existed ? `Willkommen zurück, ${name}` : `Profil „${name}“ angelegt`);
      return null;
    },
    logout: () => { setData(d => ({ ...d, session: null })); toast('Abgemeldet'); },
    addFunds: (asset, amount) => {
      commit({ ...balances, [asset]: balances[asset] + amount },
        { type: 'Demo-Einzahlung', asset, amount, detail: 'Manuell aufgeladen' });
      toast(`+${fmtQty(amount)} ${asset} gutgeschrieben`);
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
      toast(`${side === 'buy' ? 'Kauf ausgeführt: +' : 'Verkauf ausgeführt: −'}${fmtQty(qty)} ${sym}`);
    },
    transfer: (asset, amount, to) => {
      commit({ ...balances, [asset]: Math.max(0, balances[asset] - amount) },
        { type: 'Übertragung (Simulation)', asset, amount: -amount, detail: `An ${to}` });
      toast(`Übertragung an ${to} gebucht`);
    },
    resetAll: () => {
      clearData();
      setData({ session: null, profiles: {} });
      toast('Alle Daten wurden gelöscht');
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
        <div role="status" aria-live="polite"
          className="fixed left-4 right-4 top-[calc(12px+env(safe-area-inset-top))] z-toast mx-auto flex max-w-[420px] animate-rise items-center gap-2.5 rounded-panel bg-ink px-4 py-3 text-sm font-medium text-bg shadow-[0_16px_40px_-16px_rgb(8_11_15/0.5)] md:bottom-6 md:left-auto md:right-6 md:top-auto md:mx-0">
          <CheckCircle weight="fill" className="h-[18px] w-[18px] flex-none text-up" aria-hidden />
          <span>{toastMsg}</span>
        </div>
      )}
    </DemoCtx.Provider>
  );
}
