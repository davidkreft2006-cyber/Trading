'use client';
/*
  Konto und Wallet-Daten, gespeichert in Neon Postgres.
  - Anmeldung: Neon Auth (E-Mail + Passwort, Passwort-Reset per Code)
  - Lesen: Tabellen balances / transactions (Row-Level Security: nur eigene Zeilen)
  - Schreiben: nur über die Datenbank-Funktionen add_funds, execute_trade,
    transfer_out, reset_account (prüfen Beträge und Guthaben serverseitig)
*/
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { CheckCircle, WarningCircle } from '@phosphor-icons/react';
import { ASSETS, fmtQty, type Asset, type CoinSym } from './data';
import { useQuotes } from './quotes';
import { authError, neon } from './neon';
import ConfirmDialog, { type ConfirmRequest } from '@/components/ConfirmDialog';

export type Balances = Record<Asset, number>;
export const emptyBalances = (): Balances => Object.fromEntries(ASSETS.map(a => [a, 0])) as Balances;

export interface Tx {
  id: string;
  time: number;
  type: 'deposit' | 'buy' | 'sell' | 'transfer';
  asset: Asset;
  amount: number;          // positiv = Zugang, negativ = Abgang
  price?: number;
  total?: number;
  counterparty?: string;
}

export interface Account { id: string; name: string; email: string }

type Result = string | null; // Fehlermeldung oder null bei Erfolg

interface Ctx {
  ready: boolean;
  user: Account | null;
  balances: Balances;
  txs: Tx[];
  total: number;
  signIn: (email: string, password: string) => Promise<Result>;
  signUp: (name: string, email: string, password: string) => Promise<Result>;
  signOut: () => Promise<void>;
  requestPasswordCode: (email: string) => Promise<Result>;
  resetPassword: (email: string, code: string, password: string) => Promise<Result>;
  updateName: (name: string) => Promise<Result>;
  changePassword: (current: string, next: string) => Promise<Result>;
  addFunds: (asset: Asset, amount: number) => Promise<Result>;
  /** price: Kurs, der dem Nutzer in der Bestätigung angezeigt wurde */
  trade: (side: 'buy' | 'sell', sym: CoinSym, qty: number, price: number) => Promise<Result>;
  transfer: (asset: Asset, amount: number, to: string) => Promise<Result>;
  resetAll: () => Promise<Result>;
  confirm: (req: ConfirmRequest) => void;
  toast: (msg: string, tone?: 'ok' | 'error') => void;
}

const AccountCtx = createContext<Ctx | null>(null);
export const useAccount = () => {
  const c = useContext(AccountCtx);
  if (!c) throw new Error('useAccount muss innerhalb von <AccountProvider> verwendet werden');
  return c;
};

const dbError = (e: { message?: string } | null) =>
  e ? (e.message && !/^[A-Z_]+$/.test(e.message) ? e.message : 'Das hat nicht geklappt. Bitte erneut versuchen.') : null;

/** Das SDK meldet Fehler teils als { error }, teils als Exception: beides in eine Meldung übersetzen */
async function authCall(fn: () => Promise<{ error?: unknown }>): Promise<Result> {
  try {
    const { error } = await fn();
    return error ? authError(error) : null;
  } catch (e) {
    return authError(e);
  }
}

export function AccountProvider({ children }: { children: ReactNode }) {
  const { priceOf } = useQuotes();
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<Account | null>(null);
  const [balances, setBalances] = useState<Balances>(emptyBalances);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [pending, setPending] = useState<ConfirmRequest | null>(null);
  const [toastMsg, setToastMsg] = useState<{ text: string; tone: 'ok' | 'error' } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();

  const toast = useCallback((text: string, tone: 'ok' | 'error' = 'ok') => {
    clearTimeout(toastTimer.current);
    setToastMsg({ text, tone });
    toastTimer.current = setTimeout(() => setToastMsg(null), tone === 'error' ? 5000 : 3200);
  }, []);

  /** Guthaben und Verlauf des angemeldeten Nutzers aus der Datenbank laden */
  const load = useCallback(async () => {
    const db = neon();
    const [b, t] = await Promise.all([
      db.from('balances').select('asset, amount'),
      db.from('transactions').select('id, created_at, type, asset, amount, price, total, counterparty').order('created_at', { ascending: false }).limit(200)
    ]);
    if (!b.error && b.data) {
      const next = emptyBalances();
      for (const r of b.data as { asset: string; amount: string | number }[]) if (r.asset in next) next[r.asset as Asset] = Number(r.amount);
      setBalances(next);
    }
    if (!t.error && t.data) {
      setTxs((t.data as Record<string, unknown>[]).map(r => ({
        id: String(r.id),
        time: new Date(String(r.created_at)).getTime(),
        type: r.type as Tx['type'],
        asset: r.asset as Asset,
        amount: Number(r.amount),
        price: r.price != null ? Number(r.price) : undefined,
        total: r.total != null ? Number(r.total) : undefined,
        counterparty: (r.counterparty as string | null) ?? undefined
      })));
    }
  }, []);

  const applySession = useCallback(async () => {
    const { data } = await neon().auth.getSession();
    const u = data?.user;
    if (u) {
      setUser({ id: u.id, name: u.name || u.email.split('@')[0], email: u.email });
      await load();
    } else {
      setUser(null);
      setBalances(emptyBalances());
      setTxs([]);
    }
  }, [load]);

  useEffect(() => {
    applySession().catch(() => {}).finally(() => setReady(true));
  }, [applySession]);

  /** Datenbank-Funktion aufrufen, danach neu laden */
  const call = useCallback(async (fn: string, args: Record<string, unknown>): Promise<Result> => {
    try {
      const { error } = await neon().rpc(fn, args);
      if (error) return dbError(error);
    } catch (e) {
      return dbError(e as { message?: string });
    }
    await load().catch(() => {});
    return null;
  }, [load]);

  const total = ASSETS.reduce((t, a) => t + balances[a] * priceOf(a), 0);

  const value: Ctx = {
    ready, user, balances, txs, total,
    signIn: async (email, password) => {
      const err = await authCall(() => neon().auth.signIn.email({ email: email.trim(), password }));
      if (!err) await applySession().catch(() => {});
      return err;
    },
    signUp: async (name, email, password) => {
      const err = await authCall(() => neon().auth.signUp.email({ name: name.trim(), email: email.trim(), password }));
      if (!err) await applySession().catch(() => {});
      return err;
    },
    signOut: async () => {
      await authCall(() => neon().auth.signOut());
      await applySession().catch(() => {});
      toast('Abgemeldet');
    },
    requestPasswordCode: email =>
      authCall(() => neon().auth.forgetPassword.emailOtp({ email: email.trim() })),
    resetPassword: async (email, code, password) => {
      const err = await authCall(() => neon().auth.emailOtp.resetPassword({ email: email.trim(), otp: code.trim(), password }));
      if (err) return err;
      // Direkt mit dem neuen Passwort anmelden
      if (!(await authCall(() => neon().auth.signIn.email({ email: email.trim(), password })))) await applySession().catch(() => {});
      return null;
    },
    updateName: async name => {
      const err = await authCall(() => neon().auth.updateUser({ name: name.trim() }));
      if (!err) { setUser(u => (u ? { ...u, name: name.trim() } : u)); toast('Name gespeichert'); }
      return err;
    },
    changePassword: async (current, next) => {
      // Andere Geräte werden dabei abgemeldet
      const err = await authCall(() => neon().auth.changePassword({ currentPassword: current, newPassword: next, revokeOtherSessions: true }));
      if (!err) toast('Passwort geändert');
      // Hier kann nur das aktuelle Passwort falsch sein, nicht die E-Mail
      return err === 'E-Mail oder Passwort ist falsch.' ? 'Das aktuelle Passwort ist falsch.' : err;
    },
    addFunds: async (asset, amount) => {
      const err = await call('add_funds', { p_asset: asset, p_amount: amount });
      if (!err) toast(`+${fmtQty(amount)} ${asset} gutgeschrieben`);
      return err;
    },
    trade: async (side, sym, qty, price) => {
      const err = await call('execute_trade', { p_side: side, p_asset: sym, p_qty: qty, p_price: price });
      if (!err) toast(`${side === 'buy' ? 'Kauf ausgeführt: +' : 'Verkauf ausgeführt: −'}${fmtQty(qty)} ${sym}`);
      else toast(err, 'error');
      return err;
    },
    transfer: async (asset, amount, to) => {
      const err = await call('transfer_out', { p_asset: asset, p_amount: amount, p_to: to });
      if (!err) toast(`Übertragung an ${to} gebucht`);
      return err;
    },
    resetAll: async () => {
      const err = await call('reset_account', {});
      toast(err ?? 'Guthaben und Verlauf wurden gelöscht', err ? 'error' : 'ok');
      return err;
    },
    confirm: req => setPending(req),
    toast
  };

  return (
    <AccountCtx.Provider value={value}>
      {children}
      {pending && (
        <ConfirmDialog req={pending} onClose={() => setPending(null)}
          onConfirm={() => { pending.onConfirm(); setPending(null); }} />
      )}
      {toastMsg && (
        <div role={toastMsg.tone === 'error' ? 'alert' : 'status'} aria-live="polite"
          className="fixed left-4 right-4 top-[calc(12px+env(safe-area-inset-top))] z-toast mx-auto flex max-w-[420px] animate-rise items-center gap-2.5 rounded-panel bg-ink px-4 py-3 text-sm font-medium text-bg shadow-[0_16px_40px_-16px_rgb(8_11_15/0.5)] md:bottom-6 md:left-auto md:right-6 md:top-auto md:mx-0">
          {toastMsg.tone === 'error'
            ? <WarningCircle weight="fill" className="h-[18px] w-[18px] flex-none text-down" aria-hidden />
            : <CheckCircle weight="fill" className="h-[18px] w-[18px] flex-none text-up" aria-hidden />}
          <span>{toastMsg.text}</span>
        </div>
      )}
    </AccountCtx.Provider>
  );
}
