'use client';
import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, CaretDown, Info, Receipt } from '@phosphor-icons/react';
import { FEATURED_CRYPTO, FEATURED_STOCKS, categoryLabel, fmtPrice, fmtQty, nf, parseAmount, sourceLabel, volShort, type Coin } from '@/lib/data';
import { useAccount } from '@/lib/AccountContext';
import { Change, CoinIcon, EmptyState, FlashValue, LiveBadge, Segmented } from '@/components/ui/primitives';
import RangeChart from '@/components/RangeChart';
import { LiquidButton } from '@/components/ui/liquid-glass-button';
import PairPicker from '@/components/PairPicker';
import { useHistory, useQuotes } from '@/lib/quotes';

/** Schnellauswahl: beliebte Paare der Kategorie (nach Volumen), das aktive immer dabei */
function PairBar({ active, onPick }: { active: Coin; onPick: () => void }) {
  const { coins, coinOf } = useQuotes();
  const featured = active.cat === 'crypto' ? FEATURED_CRYPTO : active.cat === 'stock' ? FEATURED_STOCKS : [];
  const byVol = coins.filter(c => c.cat === active.cat && c.price > 0).sort((a, b) => b.volNum - a.volNum);
  const top = [...new Set<string>([...featured, ...byVol.map(c => c.sym)])].slice(0, 10);
  const list = (top.includes(active.sym) ? top : [active.sym, ...top.slice(0, 9)]).map(s => coinOf(s)!);
  return (
    <nav aria-label="Beliebte Paare" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0 [scrollbar-width:none]">
      <div className="flex min-w-max gap-1.5">
        {list.map(c => {
          const on = c.sym === active.sym;
          return (
            <Link key={c.sym} href={`/trade?pair=${encodeURIComponent(c.sym)}`} onClick={onPick} aria-current={on ? 'page' : undefined}
              className={`flex h-9 items-center gap-2 rounded-full border px-3.5 text-[13px] font-medium transition-colors ${on ? 'border-ink bg-surface text-ink' : 'border-line text-muted hover:border-line-strong hover:text-ink'}`}>
              {c.sym}
              {c.price > 0 && <Change value={c.chg} icon={false} className="text-xs" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function Trade() {
  const params = useSearchParams();
  const router = useRouter();
  const { ready, user, balances, txs, trade, confirm } = useAccount();
  const { coins, statusOf } = useQuotes();
  const coin = coins.find(c => c.sym === params.get('pair')) ?? coins[0];
  const [side, setSide] = useState<'buy' | 'sell'>(params.get('side') === 'sell' ? 'sell' : 'buy');
  const [qty, setQty] = useState('');
  const [err, setErr] = useState('');
  const [picker, setPicker] = useState(false);
  useHistory(coin.sym);
  const buying = side === 'buy';
  const hasPrice = coin.price > 0;
  const q = parseAmount(qty);
  const total = Number.isFinite(q) ? q * coin.price : 0;
  const orders = txs.filter(t => t.asset === coin.sym && (t.type === 'buy' || t.type === 'sell')).slice(0, 6);

  const setPct = (p: number) => {
    if (!user) return setErr('Bitte zuerst anmelden.');
    if (!hasPrice) return;
    const max = buying ? balances.USDT / coin.price : balances[coin.sym];
    const v = Math.floor(max * p / 100 * 1e6) / 1e6;
    setQty(v > 0 ? String(v).replace('.', ',') : '');
    setErr(v > 0 ? '' : buying ? 'Kein USDT verfügbar. Lade in der Wallet Guthaben auf.' : `Kein ${coin.sym} verfügbar.`);
  };

  const submit = () => {
    if (!user) return router.push(`/login?next=${encodeURIComponent(`/trade?pair=${coin.sym}`)}`);
    if (!hasPrice) return setErr(`Für ${coin.sym} ist gerade kein Kurs verfügbar. Bitte später erneut versuchen.`);
    if (!(q > 0)) return setErr('Bitte eine Menge größer als 0 eingeben.');
    if (buying && total > balances.USDT + 1e-9) return setErr('Nicht genügend USDT. Lade in der Wallet Guthaben auf.');
    if (!buying && q > balances[coin.sym] + 1e-12) return setErr(`Nicht genügend ${coin.sym}.`);
    const price = coin.price; // Kurs zum Zeitpunkt der Bestätigung
    const tot = q * price;
    confirm({
      title: `${buying ? 'Kauf' : 'Verkauf'} bestätigen`,
      label: buying ? 'Kauf ausführen' : 'Verkauf ausführen',
      tone: buying ? 'up' : 'down',
      lines: [
        { k: 'Paar', v: `${coin.sym}/${coin.quote}` }, { k: 'Menge', v: `${fmtQty(q)} ${coin.sym}` },
        { k: 'Preis (Market)', v: `${fmtPrice(price)} ${coin.quote}` }, { k: 'Gesamt', v: `${nf(tot, 2)} USDT`, strong: true }
      ],
      onConfirm: () => { setQty(''); void trade(side, coin.sym, q, price).then(e => { if (e) setErr(e); }); }
    });
  };

  const stats = [
    ['24h Hoch', hasPrice ? fmtPrice(Math.max(...coin.hist, coin.price)) : '–'],
    ['24h Tief', hasPrice ? fmtPrice(Math.min(...coin.hist, coin.price)) : '–'],
    coin.local ? ['Börsenkurs', `${fmtPrice(coin.local.price)} ${coin.local.ccy}`] : ['Volumen 24h', volShort(coin)],
    ['Dein Bestand', user && ready ? `${fmtQty(balances[coin.sym])} ${coin.sym}` : 'Nicht angemeldet']
  ];

  return (
    <div className="wrap flex flex-col gap-5 pt-6 md:pt-8">
      {picker && (
        <PairPicker initialCat={coin.cat} active={coin.sym} onClose={() => setPicker(false)}
          onPick={c => { setPicker(false); setQty(''); setErr(''); router.push(`/trade?pair=${encodeURIComponent(c.sym)}`); }} />
      )}
      <div className="flex flex-col gap-3">
        <LiquidButton variant="glass" size="lg" className="self-start pl-2 pr-4" onClick={() => setPicker(true)} aria-haspopup="dialog">
          <CoinIcon sym={coin.sym} size="sm" />
          <span className="font-semibold">{coin.sym}<span className="font-normal text-faint">/{coin.quote}</span></span>
          <span className="text-faint">Paar wechseln</span>
          <CaretDown weight="bold" />
        </LiquidButton>
        <PairBar active={coin} onPick={() => { setQty(''); setErr(''); }} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:grid-rows-[auto_1fr] lg:items-start">
        <section className="panel flex min-w-0 flex-col gap-5 p-4 sm:p-5 lg:col-start-1 lg:row-start-1">
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
            <div className="flex items-center gap-3">
              <CoinIcon sym={coin.sym} size="lg" />
              <div className="flex flex-col">
                <h1 className="text-xl font-semibold leading-tight tracking-[-0.02em]">{coin.sym}/{coin.quote}</h1>
                <span className="flex flex-wrap items-center gap-x-2 text-[13px] text-muted">{coin.name} · {categoryLabel(coin.cat)}<LiveBadge status={statusOf(coin.cat)} delayed={coin.cat !== 'crypto'} /></span>
              </div>
            </div>
            <div className="flex items-baseline gap-3">
              <span className="num text-[28px] font-semibold leading-none"><FlashValue value={coin.price}>{fmtPrice(coin.price)}</FlashValue></span>
              {hasPrice && <Change value={coin.chg} className="text-sm" />}
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 border-y border-line py-3 sm:grid-cols-4">
            {stats.map(([k, v]) => (
              <div key={k} className="flex flex-col gap-0.5">
                <dt className="text-xs text-faint">{k}</dt>
                <dd className="num truncate text-sm font-medium">{v}</dd>
              </div>
            ))}
          </dl>
          <RangeChart coin={coin} />
          <p className="hint -mt-3">Kursquelle: {sourceLabel(coin)}{coin.local ? `, umgerechnet von ${coin.local.ccy} in USD` : ''}</p>
        </section>

        <aside aria-label="Order-Ticket" className="panel flex flex-col gap-4 p-4 sm:p-5 lg:sticky lg:top-24 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <Segmented label="Seite" value={side} onChange={v => { setSide(v); setErr(''); }} className="w-full"
            options={[
              { value: 'buy', label: 'Kaufen', activeClass: 'bg-up text-white' },
              { value: 'sell', label: 'Verkaufen', activeClass: 'bg-down text-white' }
            ]} />
          <dl className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-muted">Verfügbar</dt>
              <dd className="num font-medium">{!ready ? '…' : user ? (buying ? `${fmtQty(balances.USDT)} USDT` : `${fmtQty(balances[coin.sym])} ${coin.sym}`) : 'Anmeldung nötig'}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted">Preis (Market)</dt><dd className="num font-medium">{fmtPrice(coin.price)} {coin.quote}</dd></div>
          </dl>
          <div className="flex flex-col gap-2">
            <label htmlFor="qty" className="label">Menge</label>
            <div className="relative">
              <input id="qty" className="field num pr-16" inputMode="decimal" autoComplete="off" placeholder="0,00" value={qty} aria-invalid={!!err}
                onChange={e => { setQty(e.target.value); setErr(''); }} />
              <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[13px] font-medium text-faint">{coin.sym}</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {[25, 50, 75, 100].map(p => (
                <LiquidButton key={p} type="button" variant="glass" size="sm" className="px-0 font-mono" onClick={() => setPct(p)}>{p === 100 ? 'Max' : `${p} %`}</LiquidButton>
              ))}
            </div>
          </div>
          <div className="flex items-baseline justify-between border-t border-line pt-3">
            <span className="text-sm text-muted">Gesamt</span>
            <span className="num text-lg font-semibold">{nf(total, 2)} <span className="text-sm font-normal text-muted">USDT</span></span>
          </div>
          {err && <p role="alert" className="-mt-1 text-[13px] font-medium text-down">{err}</p>}
          {user || !ready ? (
            <LiquidButton variant={buying ? 'buy' : 'sell'} size="xl" className="w-full" onClick={submit} disabled={!hasPrice}>
              {coin.sym} {buying ? 'kaufen' : 'verkaufen'}
            </LiquidButton>
          ) : (
            <LiquidButton variant="primary" size="xl" className="w-full" onClick={submit}>Anmelden, um zu handeln<ArrowRight weight="bold" /></LiquidButton>
          )}
          <p className="flex gap-2 text-[13px] leading-snug text-faint">
            <Info className="mt-0.5 h-4 w-4 flex-none" aria-hidden />
            {hasPrice ? 'Market-Order zum angezeigten Kurs' : 'Handel möglich, sobald ein Live-Kurs vorliegt'}{hasPrice ? `${coin.quote === 'USD' ? ', abgerechnet in USDT (1 USDT = 1 USD)' : ''}. Vor der Ausführung siehst du eine Übersicht.` : '.'}
          </p>
        </aside>
        <section className="panel overflow-hidden lg:col-start-1 lg:row-start-2">
          <div className="flex items-center justify-between border-b border-line px-4 py-3 sm:px-5">
            <h2 className="text-[15px] font-semibold">Deine Orders in {coin.sym}</h2>
            {orders.length > 0 && <Link href="/wallet" className="text-[13px] font-medium text-accent hover:underline">Gesamter Verlauf</Link>}
          </div>
          {orders.length === 0 ? (
            <EmptyState icon={<Receipt className="h-5 w-5" />} title="Noch keine Orders für dieses Paar">
              Käufe und Verkäufe erscheinen hier mit Menge, Preis und Uhrzeit.
            </EmptyState>
          ) : (
            <ul className="divide-y divide-line">
              {orders.map(t => (
                <li key={t.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 px-4 py-2.5 sm:px-5">
                  <span className={`rounded-tag px-1.5 py-0.5 text-[11px] font-semibold ${t.amount >= 0 ? 'bg-up/10 text-up' : 'bg-down/10 text-down'}`}>{t.amount >= 0 ? 'Kauf' : 'Verkauf'}</span>
                  <span className="num truncate text-[13px] text-muted">@ {fmtPrice(t.price ?? 0)} · {new Date(t.time).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                  <span className="num text-right text-sm font-medium">{t.amount >= 0 ? '+' : '−'}{fmtQty(Math.abs(t.amount))}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

export default function TradePage() {
  return <Suspense><Trade /></Suspense>;
}
