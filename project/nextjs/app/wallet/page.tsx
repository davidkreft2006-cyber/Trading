'use client';
import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ASSETS, fmtQty, fmtUsd, nameOf, nf, parseAmount, priceOf, type Asset } from '@/lib/data';
import { STORAGE_KEY } from '@/lib/storage';
import { useDemo } from '@/lib/DemoContext';
import Modal, { DemoWarning, ModalCancel, ModalSubmit } from '@/components/Modal';
import { CoinBadge } from '@/components/MarketTable';

function AssetPicker({ value, onChange }: { value: Asset; onChange: (a: Asset) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="label">DEMO-WÄHRUNG</span>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(72px,1fr))] gap-1.5">
        {ASSETS.map(a => (
          <button key={a} type="button" onClick={() => onChange(a)}
            className={`border-2 border-ink py-2 text-sm font-semibold ${a === value ? 'bg-ink text-bg' : 'hover:bg-surface'}`}>{a}</button>
        ))}
      </div>
    </div>
  );
}

function AddFundsModal({ onClose }: { onClose: () => void }) {
  const { addFunds } = useDemo();
  const [asset, setAsset] = useState<Asset>('USDT');
  const [amount, setAmount] = useState('');
  const [err, setErr] = useState('');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const v = parseAmount(amount);
    if (!(v > 0)) return setErr('Bitte einen Betrag größer als 0 eingeben.');
    if (v * priceOf(asset) > 10_000_000) return setErr('Maximal 10 Mio. USD Gegenwert pro Aufladung.');
    addFunds(asset, v);
    onClose();
  };
  return (
    <Modal title="Demo-Guthaben hinzufügen" onClose={onClose}
      footer={<><ModalCancel onClick={onClose} /><ModalSubmit form="add-form">Hinzufügen</ModalSubmit></>}>
      <form id="add-form" onSubmit={submit} className="flex flex-col gap-4">
        <DemoWarning>Nur Demo: Es wird kein echtes Geld eingezahlt und keine echte Kryptowährung gutgeschrieben.</DemoWarning>
        <AssetPicker value={asset} onChange={setAsset} />
        <label className="flex flex-col gap-2">
          <span className="label">BETRAG ({asset})</span>
          <input autoFocus className="input" inputMode="decimal" placeholder="z. B. 1000" value={amount} onChange={e => { setAmount(e.target.value); setErr(''); }} />
        </label>
        {err && <p className="text-sm font-semibold text-down">{err}</p>}
      </form>
    </Modal>
  );
}

function TransferModal({ onClose }: { onClose: () => void }) {
  const { balances, transfer } = useDemo();
  const [asset, setAsset] = useState<Asset>('USDT');
  const [amount, setAmount] = useState('');
  const [to, setTo] = useState('');
  const [err, setErr] = useState('');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const v = parseAmount(amount);
    if (to.trim().length < 2) return setErr('Bitte einen Demo-Empfängernamen eingeben.');
    if (!(v > 0)) return setErr('Bitte einen Betrag größer als 0 eingeben.');
    if (v > balances[asset] + 1e-12) return setErr('Nicht genügend Demo-Guthaben.');
    transfer(asset, v, to.trim());
    onClose();
  };
  return (
    <Modal title="Demo-Übertragung" onClose={onClose}
      footer={<><ModalCancel onClick={onClose} /><ModalSubmit form="tr-form">Simuliert übertragen</ModalSubmit></>}>
      <form id="tr-form" onSubmit={submit} className="flex flex-col gap-4">
        <DemoWarning>Simulation: Es wird nichts an eine echte Adresse gesendet. Der Betrag wird nur aus deinem Demo-Guthaben entfernt.</DemoWarning>
        <AssetPicker value={asset} onChange={setAsset} />
        <span className="-mt-2 text-[13px] text-muted">Verfügbar: {fmtQty(balances[asset])} {asset}</span>
        <label className="flex flex-col gap-2">
          <span className="label">EMPFÄNGER (DEMO-NAME)</span>
          <input className="input" maxLength={24} placeholder="z. B. Demo-Freund" value={to} onChange={e => { setTo(e.target.value); setErr(''); }} />
        </label>
        <label className="flex flex-col gap-2">
          <span className="label">BETRAG ({asset})</span>
          <input className="input" inputMode="decimal" placeholder="0,00" value={amount} onChange={e => { setAmount(e.target.value); setErr(''); }} />
        </label>
        {err && <p className="text-sm font-semibold text-down">{err}</p>}
      </form>
    </Modal>
  );
}

export default function WalletPage() {
  const { ready, user, balances, txs, total, profileNames, resetAll, confirm } = useDemo();
  const router = useRouter();
  const [modal, setModal] = useState<'add' | 'transfer' | null>(null);

  useEffect(() => { if (ready && !user) router.replace('/login?next=/wallet'); }, [ready, user, router]);
  if (!ready || !user) return null;

  const rows = ASSETS.filter(a => balances[a] > 0)
    .map(a => ({ a, v: balances[a] * priceOf(a) }))
    .sort((x, y) => y.v - x.v);

  const askReset = () => confirm({
    title: 'Alle Demo-Daten zurücksetzen?', label: 'Zurücksetzen',
    lines: [{ k: 'Profile', v: String(profileNames.length) }, { k: 'Transaktionen (aktuell)', v: String(txs.length) }, { k: 'Speicherort', v: `localStorage · ${STORAGE_KEY}` }],
    onConfirm: () => { resetAll(); router.push('/'); }
  });

  return (
    <>
      <section className="border-b-2 border-ink">
        <div className="wrap grid items-end gap-8 py-10 lg:grid-cols-2">
          <div className="flex flex-col gap-2.5">
            <span className="text-[13px] font-extrabold tracking-[0.08em] text-muted">GESAMTGUTHABEN (DEMO) · {user}</span>
            <span className="text-[clamp(40px,6vw,68px)] font-extrabold leading-none tracking-[-0.03em] tabular-nums">{fmtUsd(total)}</span>
            <span className="text-[15px] text-muted">≈ {nf(total, 2)} USDT · Spielgeld, nicht auszahlbar</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button onClick={() => setModal('add')} className="btn-primary col-span-3 py-4 text-base"><span>Demo-Guthaben hinzufügen</span><span>+</span></button>
            <Link href="/trade?side=buy" className="btn-outline !text-ink hover:!text-bg">Kaufen</Link>
            <Link href="/trade?side=sell" className="btn-outline !text-ink hover:!text-bg">Verkaufen</Link>
            <button onClick={() => setModal('transfer')} className="btn-outline">Übertragen</button>
          </div>
        </div>
      </section>

      <section className="wrap grid gap-x-12 lg:grid-cols-2">
        <div className="flex flex-col gap-4 py-8">
          <h2 className="text-[26px] font-extrabold tracking-tight">Assets</h2>
          <div className="border-t-2 border-ink">
            {rows.length === 0 && (
              <div className="flex flex-col items-start gap-3 py-8">
                <span className="text-muted">Noch kein Demo-Guthaben vorhanden.</span>
                <button onClick={() => setModal('add')} className="border-b-2 border-accent py-0.5 text-[15px] font-semibold text-down">Demo-Guthaben hinzufügen →</button>
              </div>
            )}
            {rows.map(({ a, v }) => (
              <div key={a} className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)] items-center gap-3 border-b border-line py-3.5">
                <div className="flex min-w-0 items-center gap-3"><CoinBadge sym={a} />
                  <div className="flex min-w-0 flex-col"><strong>{a}</strong><span className="truncate text-[13px] text-muted">{nameOf(a)}</span></div></div>
                <div className="flex flex-col items-end"><span className="font-semibold tabular-nums">{fmtQty(balances[a])}</span><span className="text-[13px] text-muted">Bestand</span></div>
                <div className="flex flex-col items-end gap-1.5">
                  <span className="font-semibold tabular-nums">{fmtUsd(v)}</span>
                  <div className="h-1 w-full max-w-[120px] bg-hover"><div className="h-1 bg-accent" style={{ width: `${(v / total) * 100}%` }} /></div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-4 py-8">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-[26px] font-extrabold tracking-tight">Transaktionsverlauf</h2>
            <span className="text-[13px] text-muted">{txs.length} {txs.length === 1 ? 'Eintrag' : 'Einträge'}</span>
          </div>
          <div className="border-t-2 border-ink">
            {txs.length === 0 && <p className="py-8 text-muted">Noch keine Demo-Transaktionen.</p>}
            {txs.map(t => (
              <div key={t.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 border-b border-line py-3.5">
                <strong className="text-[15px]">{t.type}</strong>
                <span className={`text-right font-semibold tabular-nums ${t.amount >= 0 ? 'text-up' : ''}`}>{t.amount >= 0 ? '+' : '−'}{fmtQty(Math.abs(t.amount))} {t.asset}</span>
                <span className="text-[13px] text-muted">{t.detail}</span>
                <span className="text-right text-[13px] text-muted">{new Date(t.time).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t-2 border-ink bg-surface">
        <div className="wrap flex flex-wrap items-center justify-between gap-4 py-6">
          <span className="max-w-[640px] text-sm text-muted">Alle Demo-Daten liegen im localStorage dieses Browsers. Zurücksetzen löscht alle Demo-Profile, Guthaben und Transaktionen.</span>
          <button onClick={askReset} className="btn border-2 border-down text-sm text-down hover:bg-down hover:text-white">Alle Demo-Daten zurücksetzen</button>
        </div>
      </section>

      {modal === 'add' && <AddFundsModal onClose={() => setModal(null)} />}
      {modal === 'transfer' && <TransferModal onClose={() => setModal(null)} />}
    </>
  );
}
