'use client';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowDownLeft, ArrowUpRight, CaretRight, ClockCounterClockwise, PaperPlaneTilt, Plus, Wallet as WalletIcon } from '@phosphor-icons/react';
import { ASSETS, FUNDABLE, categoryLabel, fmtPrice, fmtQty, fmtUsd, nameOf, nf, parseAmount, sourceLabel, type Asset } from '@/lib/data';
import { useHistory, useQuotes } from '@/lib/quotes';
import { useAccount, type Tx } from '@/lib/AccountContext';
import Modal, { ModalCancel, ModalSubmit } from '@/components/Modal';
import { Change, CoinIcon, EmptyState, LiveBadge, Note, Pnl } from '@/components/ui/primitives';
import { openPnl } from '@/lib/pnl';
import RangeChart from '@/components/RangeChart';
import { LiquidButton } from '@/components/ui/liquid-glass-button';

/** USDT wie Geld mit 2 Nachkommastellen, alles andere mit bis zu 8 */
const fmtBal = (a: Asset, q: number) => (a === 'USDT' ? nf(q, 2) : fmtQty(q));

/** Gerundete Schnellbeträge mit etwa 100 / 1.000 / 10.000 USD Gegenwert. */
const quickAmounts = (a: Asset, priceOf: (a: Asset) => number) => [100, 1000, 10000].map(usd => {
  const raw = usd / priceOf(a);
  const mag = 10 ** (Math.floor(Math.log10(raw)) - 1);
  return Math.round(raw / mag) * mag;
});

function AssetPicker({ value, onChange, options, label = 'Währung', children }: {
  value: Asset; onChange: (a: Asset) => void; options: readonly Asset[]; label?: string; children?: ReactNode;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="label mb-2">{label}</legend>
      <div role="radiogroup" className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
        {options.map(a => {
          const on = a === value;
          return (
            <button key={a} type="button" role="radio" aria-checked={on} onClick={() => onChange(a)}
              className={`h-9 rounded-ctl border font-mono text-[13px] font-medium transition-colors ${on ? 'border-accent bg-accent-soft text-accent' : 'border-line text-muted hover:border-line-strong hover:text-ink'}`}>{a}</button>
          );
        })}
      </div>
      {children}
    </fieldset>
  );
}

function AmountField({ id, value, onChange, unit, err, placeholder, autoFocus }: {
  id: string; value: string; onChange: (v: string) => void; unit: string; err: string; placeholder: string; autoFocus?: boolean;
}) {
  return (
    <div className="relative">
      <input id={id} autoFocus={autoFocus} className="field num h-12 pr-16 text-base" inputMode="decimal" autoComplete="off" placeholder={placeholder}
        value={value} aria-invalid={!!err} onChange={e => onChange(e.target.value)} />
      <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 font-mono text-[13px] font-medium text-faint">{unit}</span>
    </div>
  );
}

function AddFundsModal({ initial, onClose }: { initial?: { asset: Asset; amount: string }; onClose: () => void }) {
  const { addFunds } = useAccount();
  const { priceOf } = useQuotes();
  const [asset, setAsset] = useState<Asset>(initial?.asset ?? 'USDT');
  const [amount, setAmount] = useState(initial?.amount ?? '');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const v = parseAmount(amount);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!(v > 0)) return setErr('Bitte einen Betrag größer als 0 eingeben.');
    if (v * priceOf(asset) > 10_000_000) return setErr('Maximal 10 Mio. USD Gegenwert pro Aufladung.');
    setBusy(true);
    const e2 = await addFunds(asset, v);
    setBusy(false);
    if (e2) return setErr(e2);
    onClose();
  };
  return (
    <Modal title="Guthaben hinzufügen" onClose={onClose}
      footer={<><ModalCancel onClick={onClose} /><ModalSubmit form="add-form" disabled={busy}>{busy ? 'Wird gebucht …' : 'Hinzufügen'}</ModalSubmit></>}>
      <form id="add-form" onSubmit={submit} noValidate className="flex flex-col gap-4">
        <AssetPicker value={asset} options={FUNDABLE} onChange={a => { setAsset(a); setErr(''); }} />
        <div className="flex flex-col gap-2">
          <label htmlFor="add-amount" className="label">Betrag</label>
          <AmountField id="add-amount" autoFocus value={amount} onChange={x => { setAmount(x); setErr(''); }} unit={asset} err={err} placeholder="z. B. 1000" />
          <div className="flex flex-wrap items-center gap-1.5">
            {quickAmounts(asset, priceOf).map(q => (
              <LiquidButton key={q} type="button" variant="glass" size="sm" className="h-7 px-3 font-mono" onClick={() => { setAmount(fmtQty(q)); setErr(''); }}>{fmtQty(q)}</LiquidButton>
            ))}
            {v > 0 && !err && <span className="num ml-auto text-[13px] text-faint">≈ {fmtUsd(v * priceOf(asset))}</span>}
          </div>
          {err && <span role="alert" className="text-[13px] font-medium text-down">{err}</span>}
        </div>
        <Note>Ohne realen Gegenwert. Es wird kein Geld eingezahlt.</Note>
      </form>
    </Modal>
  );
}

function TransferModal({ initial, onClose }: { initial?: Asset; onClose: () => void }) {
  const { balances, transfer } = useAccount();
  const owned = ASSETS.filter(a => balances[a] > 0);
  const options: Asset[] = owned.length ? owned : ['USDT'];
  const held = initial && options.includes(initial) ? initial : options[0];
  const [asset, setAsset] = useState<Asset>(held);
  const [amount, setAmount] = useState('');
  const [to, setTo] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const v = parseAmount(amount);
    if (to.trim().length < 2) return setErr('Bitte einen Empfänger mit mindestens 2 Zeichen eingeben.');
    if (!(v > 0)) return setErr('Bitte einen Betrag größer als 0 eingeben.');
    if (v > balances[asset] + 1e-12) return setErr('Nicht genügend Guthaben.');
    setBusy(true);
    const e2 = await transfer(asset, v, to.trim());
    setBusy(false);
    if (e2) return setErr(e2);
    onClose();
  };
  return (
    <Modal title="Übertragen" onClose={onClose}
      footer={<><ModalCancel onClick={onClose} /><ModalSubmit form="tr-form" disabled={busy}>{busy ? 'Wird gebucht …' : 'Übertragen'}</ModalSubmit></>}>
      <form id="tr-form" onSubmit={submit} noValidate className="flex flex-col gap-4">
        <AssetPicker value={asset} options={options} label="Was übertragen?" onChange={a => { setAsset(a); setErr(''); }}>
          <span className="hint">Verfügbar: <span className="num text-muted">{fmtQty(balances[asset])} {asset}</span></span>
        </AssetPicker>
        <div className="flex flex-col gap-2">
          <label htmlFor="tr-to" className="label">Empfänger</label>
          <input id="tr-to" className="field" maxLength={24} autoComplete="off" placeholder="Name des Empfängers" value={to} onChange={e => { setTo(e.target.value); setErr(''); }} />
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <label htmlFor="tr-amount" className="label">Betrag</label>
            <button type="button" onClick={() => { setAmount(fmtQty(balances[asset])); setErr(''); }} className="text-[13px] font-medium text-accent hover:underline disabled:opacity-40" disabled={!balances[asset]}>Maximal</button>
          </div>
          <AmountField id="tr-amount" value={amount} onChange={x => { setAmount(x); setErr(''); }} unit={asset} err={err} placeholder="0,00" />
          {err && <span role="alert" className="text-[13px] font-medium text-down">{err}</span>}
        </div>
      </form>
    </Modal>
  );
}

function AssetModal({ asset, onClose, onAdd, onTransfer }: { asset: Asset; onClose: () => void; onAdd: () => void; onTransfer: () => void }) {
  const { balances, txs, total, positions } = useAccount();
  const { coinOf, priceOf, statusOf } = useQuotes();
  const coin = asset === 'USDT' ? undefined : coinOf(asset);
  useHistory(coin?.sym);
  const qty = balances[asset];
  const value = qty * priceOf(asset);
  const pos = positions[asset];
  const open = openPnl(pos, priceOf(asset), qty);
  const share = total ? (value / total) * 100 : 0;
  const history = txs.filter(t => t.asset === asset || (asset === 'USDT' && (t.type === 'buy' || t.type === 'sell'))).slice(0, 6);
  const btn = 'flex-1 sm:flex-none';
  return (
    <Modal title={`${asset} · ${nameOf(asset)}`} onClose={onClose}
      footer={coin ? (
        <>
          <LiquidButton asChild variant="sell" size="lg" className={btn}><Link href={`/trade?pair=${asset}&side=sell`}><ArrowUpRight />Verkaufen</Link></LiquidButton>
          <LiquidButton asChild variant="buy" size="lg" className={btn}><Link href={`/trade?pair=${asset}&side=buy`}><ArrowDownLeft />Kaufen</Link></LiquidButton>
        </>
      ) : (
        <>
          <LiquidButton variant="glass" size="lg" className={btn} onClick={onTransfer}><PaperPlaneTilt />Übertragen</LiquidButton>
          <LiquidButton variant="primary" size="lg" className={btn} onClick={onAdd}><Plus weight="bold" />Guthaben hinzufügen</LiquidButton>
        </>
      )}>
      <div className="flex items-center gap-3">
        <CoinIcon sym={asset} size="lg" />
        <div className="flex min-w-0 flex-col">
          <span className="num text-2xl font-semibold leading-tight tracking-[-0.02em]">{fmtUsd(value)}</span>
          <span className="num truncate text-[13px] text-muted">{fmtBal(asset, qty)} {asset}</span>
        </div>
      </div>

      {coin && (open || pos?.realized) ? (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-ctl border border-line bg-subtle/60 p-3">
          <div className="col-span-2 flex flex-col gap-0.5">
            <dt className="text-xs text-faint">Gewinn/Verlust offen (live)</dt>
            <dd className="text-lg font-semibold">{open ? <Pnl value={open.value} pct={open.pct} /> : '–'}</dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs text-faint">Ø Einstandskurs</dt>
            <dd className="num text-sm font-medium">{open ? `${fmtPrice(open.avg)} ${coin.quote}` : '–'}</dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs text-faint">Einstand</dt>
            <dd className="num text-sm font-medium">{open ? fmtUsd(open.cost) : '–'}</dd>
          </div>
          {!!pos?.realized && (
            <div className="col-span-2 flex flex-col gap-0.5">
              <dt className="text-xs text-faint">Realisiert durch Verkäufe</dt>
              <dd className="text-sm font-medium"><Pnl value={pos.realized} /></dd>
            </div>
          )}
          {open?.partial && <p className="col-span-2 text-xs text-faint">Ein Teil des Bestands wurde ohne Kurs eingezahlt und ist nicht bewertet.</p>}
        </dl>
      ) : null}

      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 border-y border-line py-3">
        <div className="flex flex-col gap-0.5">
          <dt className="text-xs text-faint">Kurs</dt>
          <dd className="num text-sm font-medium">{coin ? `${fmtPrice(coin.price)} ${coin.quote}` : '1,00 USD'}</dd>
          {coin?.local && <dd className="num text-xs text-faint">{fmtPrice(coin.local.price)} {coin.local.ccy}</dd>}
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-xs text-faint">{coin ? 'Änderung 24h' : 'Art'}</dt>
          <dd className="text-sm font-medium">{coin ? (coin.price ? <Change value={coin.chg} /> : '–') : 'Stablecoin'}</dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-xs text-faint">Anteil am Guthaben</dt>
          <dd className="num text-sm font-medium">{nf(share, 1)} %</dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-xs text-faint">Kategorie</dt>
          <dd className="text-sm font-medium">{coin ? categoryLabel(coin.cat) : 'Krypto'}</dd>
        </div>
      </dl>

      {coin && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[13px] font-medium text-muted">Kursverlauf</span>
            <LiveBadge status={statusOf(coin.cat)} delayed={coin.cat !== 'crypto'} />
          </div>
          <RangeChart coin={coin} />
          <p className="hint">Kursquelle: {sourceLabel(coin)}</p>
        </div>
      )}

      <div className="flex flex-col gap-1">
        <span className="text-[13px] font-medium text-muted">Letzte Bewegungen</span>
        {history.length === 0 ? (
          <p className="py-2 text-sm text-faint">Noch keine Transaktionen mit {asset}.</p>
        ) : (
          <ul className="divide-y divide-line">
            {history.map(t => {
              // Für USDT zählt bei Käufen/Verkäufen der bezahlte bzw. erhaltene Betrag
              const amt = asset === 'USDT' && t.asset !== 'USDT' ? (t.total ?? 0) : t.amount;
              const label = asset === 'USDT' && t.asset !== 'USDT' ? `${TX_ICON[t.type].label} ${t.asset}` : TX_ICON[t.type].label;
              return (
                <li key={t.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 py-2">
                  <div className="flex min-w-0 flex-col">
                    <span className="text-sm font-medium">{label}</span>
                    <time className="num text-xs text-faint" dateTime={new Date(t.time).toISOString()}>
                      {new Date(t.time).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </time>
                  </div>
                  <span className={`num text-sm font-medium ${amt >= 0 ? 'text-up' : 'text-ink'}`}>{amt >= 0 ? '+' : '−'}{fmtBal(asset, Math.abs(amt))}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Modal>
  );
}

const TX_ICON: Record<Tx['type'], { icon: typeof Plus; label: string }> = {
  deposit: { icon: Plus, label: 'Einzahlung' },
  buy: { icon: ArrowDownLeft, label: 'Kauf' },
  sell: { icon: ArrowUpRight, label: 'Verkauf' },
  transfer: { icon: PaperPlaneTilt, label: 'Übertragung' }
};

const txDetail = (t: Tx) =>
  t.type === 'deposit' ? 'Manuell aufgeladen'
  : t.type === 'transfer' ? `An ${t.counterparty ?? '–'}`
  : `@ ${fmtPrice(t.price ?? 0)} · ${t.type === 'buy' ? '−' : '+'}${nf(Math.abs(t.total ?? 0), 2)} USDT`;

function WalletSkeleton() {
  return (
    <div className="wrap flex flex-col gap-5 pt-8" aria-busy="true" aria-label="Wallet wird geladen">
      <div className="panel flex flex-col gap-4 p-6"><span className="skeleton h-4 w-40" /><span className="skeleton h-12 w-72 max-w-full" /><span className="skeleton h-4 w-56" /></div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        <div className="panel flex flex-col gap-3 p-5">{[0, 1, 2].map(i => <span key={i} className="skeleton h-10" />)}</div>
        <div className="panel flex flex-col gap-3 p-5">{[0, 1, 2].map(i => <span key={i} className="skeleton h-10" />)}</div>
      </div>
    </div>
  );
}

export default function WalletPage() {
  const { ready, user, balances, txs, total, positions, pnl } = useAccount();
  const { priceOf } = useQuotes();
  const router = useRouter();
  const [modal, setModal] = useState<{ kind: 'add'; initial?: { asset: Asset; amount: string } } | { kind: 'transfer'; asset?: Asset } | { kind: 'asset'; asset: Asset } | null>(null);
  const [showAll, setShowAll] = useState(false);

  // Nur beim Laden prüfen: Nach dem Abmelden navigiert der Header selbst zur Startseite.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (ready && !user) router.replace('/login?next=/wallet'); }, [ready]);
  if (!ready || !user) return <WalletSkeleton />;

  const rows = ASSETS.filter(a => balances[a] > 0)
    .map(a => ({ a, v: balances[a] * priceOf(a) }))
    .sort((x, y) => y.v - x.v);
  const shownTxs = showAll ? txs : txs.slice(0, 8);
  const openAdd = (initial?: { asset: Asset; amount: string }) => setModal({ kind: 'add', initial });


  return (
    <div className="wrap flex flex-col gap-5 pt-6 md:pt-8">
      <section className="panel grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="flex min-w-0 flex-col gap-2">
          <span className="text-[13px] text-muted">Gesamtguthaben von <span className="font-medium text-ink">{user.name}</span></span>
          <span className="num break-words text-[40px] font-semibold leading-none tracking-[-0.03em] sm:text-5xl">{fmtUsd(total)}</span>
          <span className="text-sm text-faint">≈ <span className="num">{nf(total, 2)}</span> USDT</span>
          {pnl && (
            <div className="mt-1 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
              <span className="flex items-baseline gap-1.5"><span className="text-muted">Gewinn/Verlust offen</span><Pnl value={pnl.value} pct={pnl.pct} className="font-semibold" /></span>
              {!!pnl.realized && <span className="flex items-baseline gap-1.5"><span className="text-muted">Realisiert</span><Pnl value={pnl.realized} className="font-medium" /></span>}
            </div>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap lg:justify-end">
          <LiquidButton variant="primary" size="xl" className="col-span-3 sm:col-auto" onClick={() => openAdd()}><Plus weight="bold" />Guthaben hinzufügen</LiquidButton>
          <LiquidButton asChild variant="glass" size="xl" className="h-16 flex-col gap-1 rounded-2xl px-2 text-[13px] has-[>svg]:px-2 sm:h-12 sm:flex-row sm:gap-2 sm:rounded-full sm:px-6 sm:text-[15px]"><Link href="/trade?side=buy"><ArrowDownLeft className="size-5 sm:size-4" />Kaufen</Link></LiquidButton>
          <LiquidButton asChild variant="glass" size="xl" className="h-16 flex-col gap-1 rounded-2xl px-2 text-[13px] has-[>svg]:px-2 sm:h-12 sm:flex-row sm:gap-2 sm:rounded-full sm:px-6 sm:text-[15px]"><Link href="/trade?side=sell"><ArrowUpRight className="size-5 sm:size-4" />Verkaufen</Link></LiquidButton>
          <LiquidButton variant="glass" size="xl" className="h-16 flex-col gap-1 rounded-2xl px-2 text-[13px] has-[>svg]:px-2 sm:h-12 sm:flex-row sm:gap-2 sm:rounded-full sm:px-6 sm:text-[15px]" onClick={() => setModal({ kind: 'transfer' })}><PaperPlaneTilt className="size-5 sm:size-4" />Übertragen</LiquidButton>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] lg:items-start">
        <section className="panel overflow-hidden" aria-labelledby="assets-h">
          <div className="flex items-center justify-between border-b border-line px-4 py-3 sm:px-5">
            <h2 id="assets-h" className="text-[15px] font-semibold">Assets</h2>
            <span className="text-[13px] text-faint">{rows.length} {rows.length === 1 ? 'Position' : 'Positionen'}</span>
          </div>
          {rows.length === 0 ? (
            <EmptyState icon={<WalletIcon className="h-5 w-5" />} title="Noch kein Guthaben"
              action={
                <div className="flex flex-wrap gap-2">
                  <LiquidButton variant="primary" size="sm" onClick={() => openAdd()}><Plus weight="bold" className="size-3.5" />Guthaben hinzufügen</LiquidButton>
                  <LiquidButton variant="glass" size="sm" className="font-mono" onClick={() => openAdd({ asset: 'USDT', amount: '1.000' })}>1.000 USDT</LiquidButton>
                  <LiquidButton variant="glass" size="sm" className="font-mono" onClick={() => openAdd({ asset: 'BTC', amount: '0,05' })}>0,05 BTC</LiquidButton>
                </div>
              }>
              Lade eine Währung auf, um zu kaufen, zu verkaufen und zu übertragen.
            </EmptyState>
          ) : (
            <div>
              <div aria-hidden className="hidden grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_88px] gap-x-4 border-b border-line bg-subtle/70 px-5 py-2 text-xs font-medium text-faint sm:grid">
                <span>Asset</span><span className="text-right">Bestand</span><span className="text-right">Kurs</span><span className="text-right">Wert</span><span className="text-right">Gewinn/Verlust</span>
              </div>
              <ul className="divide-y divide-line" aria-label="Assets">
                {rows.map(({ a, v }) => {
                  const o = a === 'USDT' ? null : openPnl(positions[a], priceOf(a), balances[a]);
                  return (
                    <li key={a}>
                    <button type="button" onClick={() => setModal({ kind: 'asset', asset: a })} aria-label={`${a} ${nameOf(a)}: Details anzeigen`}
                      className="grid w-full grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-3 px-4 py-3 text-left transition-colors hover:bg-subtle active:bg-subtle sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.1fr)_16px] sm:gap-x-4 sm:px-5">
                      <div className="flex min-w-0 items-center gap-3">
                        <CoinIcon sym={a} />
                        <div className="flex min-w-0 flex-col"><span className="font-semibold leading-tight">{a}</span><span className="hidden truncate text-[13px] text-muted sm:block">{nameOf(a)}</span><span className="num truncate text-[13px] text-muted sm:hidden">{fmtBal(a, balances[a])}</span></div>
                      </div>
                      <span className="num hidden truncate text-right text-sm sm:block">{fmtBal(a, balances[a])}</span>
                      <span className="num hidden text-right text-sm text-muted sm:block">{a === 'USDT' ? '1,00' : fmtPrice(priceOf(a))}</span>
                      <div className="flex flex-col items-end">
                        <span className="num text-right text-[15px] font-medium">{fmtUsd(v)}</span>
                        <span className="text-[13px] sm:hidden">{o ? <Pnl value={o.value} pct={o.pct} /> : <span className="text-faint">–</span>}</span>
                      </div>
                      <div className="hidden flex-col items-end sm:flex">
                        {o ? <><Pnl value={o.value} className="text-sm font-medium" /><span className={`num text-xs ${o.value >= 0 ? 'text-up' : 'text-down'}`}>{o.pct >= 0 ? '+' : '−'}{nf(Math.abs(o.pct), 2)} %</span></> : <span className="text-sm text-faint">–</span>}
                      </div>
                      <CaretRight className="h-4 w-4 text-faint" aria-hidden />
                    </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </section>

        <section className="panel overflow-hidden" aria-labelledby="tx-h">
          <div className="flex items-center justify-between border-b border-line px-4 py-3 sm:px-5">
            <h2 id="tx-h" className="text-[15px] font-semibold">Transaktionsverlauf</h2>
            <span className="text-[13px] text-faint">{txs.length} {txs.length === 1 ? 'Eintrag' : 'Einträge'}</span>
          </div>
          {txs.length === 0 ? (
            <EmptyState icon={<ClockCounterClockwise className="h-5 w-5" />} title="Noch keine Transaktionen">
              Einzahlungen, Käufe, Verkäufe und Übertragungen erscheinen hier mit Zeitstempel.
            </EmptyState>
          ) : (
            <>
              <ul className="divide-y divide-line">
                {shownTxs.map(t => {
                  const { icon: Icon, label } = TX_ICON[t.type];
                  return (
                    <li key={t.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 px-4 py-3 sm:px-5">
                      <span className="flex h-8 w-8 items-center justify-center rounded-ctl bg-subtle text-muted"><Icon className="h-4 w-4" aria-hidden /></span>
                      <div className="flex min-w-0 flex-col">
                        <span className="text-sm font-medium">{label} <span className="font-normal text-faint">{t.asset}</span></span>
                        <span className="num truncate text-xs text-faint">{txDetail(t)}</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className={`num text-sm font-medium ${t.amount >= 0 ? 'text-up' : 'text-ink'}`}>{t.amount >= 0 ? '+' : '−'}{fmtQty(Math.abs(t.amount))}</span>
                        <time className="num text-xs text-faint" dateTime={new Date(t.time).toISOString()}>
                          {new Date(t.time).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </time>
                      </div>
                    </li>
                  );
                })}
              </ul>
              {txs.length > 8 && (
                <button onClick={() => setShowAll(s => !s)} className="w-full border-t border-line px-5 py-2.5 text-[13px] font-medium text-accent hover:bg-subtle">
                  {showAll ? 'Weniger anzeigen' : `Alle ${txs.length} anzeigen`}
                </button>
              )}
            </>
          )}
        </section>
      </div>


      {modal?.kind === 'add' && <AddFundsModal initial={modal.initial} onClose={() => setModal(null)} />}
      {modal?.kind === 'transfer' && <TransferModal initial={modal.asset} onClose={() => setModal(null)} />}
      {modal?.kind === 'asset' && (
        <AssetModal asset={modal.asset} onClose={() => setModal(null)}
          onAdd={() => setModal({ kind: 'add', initial: { asset: modal.asset, amount: '' } })}
          onTransfer={() => setModal({ kind: 'transfer', asset: modal.asset })} />
      )}
    </div>
  );
}
