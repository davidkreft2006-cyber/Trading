'use client';
import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { COINS, fmtChg, fmtPrice, fmtQty, nf, parseAmount } from '@/lib/data';
import { useDemo } from '@/lib/DemoContext';

function Chart({ data, up }: { data: number[]; up: boolean }) {
  const min = Math.min(...data), max = Math.max(...data), r = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * 600},${190 - ((v - min) / r) * 180}`).join(' ');
  return (
    <div className="relative h-[clamp(220px,32vw,380px)] border-2 border-ink bg-field">
      <svg viewBox="0 0 600 200" preserveAspectRatio="none" className="absolute inset-3 h-[calc(100%-24px)] w-[calc(100%-24px)] overflow-visible">
        {[50, 100, 150].map(y => <line key={y} x1="0" x2="600" y1={y} y2={y} className="stroke-line" strokeWidth="1" vectorEffect="non-scaling-stroke" />)}
        <polyline points={pts} fill="none" className={up ? 'stroke-up' : 'stroke-down'} strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>
      <span className="absolute left-3 top-2.5 bg-field text-xs font-semibold text-muted">Beispiel-Kursverlauf (statisch)</span>
    </div>
  );
}

function Trade() {
  const params = useSearchParams();
  const router = useRouter();
  const { user, balances, trade, confirm } = useDemo();
  const coin = COINS.find(c => c.sym === params.get('pair')) ?? COINS[0];
  const [side, setSide] = useState<'buy' | 'sell'>(params.get('side') === 'sell' ? 'sell' : 'buy');
  const [qty, setQty] = useState('');
  const [err, setErr] = useState('');
  const buying = side === 'buy';
  const q = parseAmount(qty);
  const total = Number.isFinite(q) ? q * coin.price : 0;
  const up = coin.chg >= 0;

  const setPct = (p: number) => {
    if (!user) return setErr('Bitte zuerst mit einem Demo-Namen anmelden.');
    const max = buying ? balances.USDT / coin.price : balances[coin.sym];
    const v = Math.floor(max * p / 100 * 1e6) / 1e6;
    setQty(v > 0 ? String(v).replace('.', ',') : '');
    setErr(v > 0 ? '' : 'Kein verfügbares Demo-Guthaben.');
  };

  const submit = () => {
    if (!user) return router.push(`/login?next=${encodeURIComponent(`/trade?pair=${coin.sym}`)}`);
    if (!(q > 0)) return setErr('Bitte eine Menge größer als 0 eingeben.');
    if (buying && total > balances.USDT + 1e-9) return setErr('Nicht genügend Demo-USDT. Lade in der Wallet Demo-Guthaben auf.');
    if (!buying && q > balances[coin.sym] + 1e-12) return setErr(`Nicht genügend Demo-${coin.sym}.`);
    confirm({
      title: `${buying ? 'Kauf' : 'Verkauf'} simulieren`,
      label: buying ? 'Demo-Kauf ausführen' : 'Demo-Verkauf ausführen',
      lines: [
        { k: 'Paar', v: `${coin.sym}/USDT` }, { k: 'Menge', v: `${fmtQty(q)} ${coin.sym}` },
        { k: 'Preis', v: `${fmtPrice(coin.price)} USDT` }, { k: 'Gesamt', v: `${nf(total, 2)} USDT` }
      ],
      onConfirm: () => { trade(side, coin.sym, q); setQty(''); }
    });
  };

  return (
    <>
      <div className="border-b-2 border-ink">
        <div className="wrap flex gap-1 overflow-x-auto">
          {COINS.map(c => (
            <Link key={c.sym} href={`/trade?pair=${c.sym}`} onClick={() => { setQty(''); setErr(''); }}
              className={`whitespace-nowrap border-b-[3px] px-3 pb-[11px] pt-3.5 text-sm font-semibold !text-ink hover:!text-accent ${c.sym === coin.sym ? 'border-accent' : 'border-transparent'}`}>
              {c.sym}/USDT
            </Link>
          ))}
        </div>
      </div>
      <div className="wrap grid lg:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
        <div className="flex min-w-0 flex-col gap-5 py-7">
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
            <h1 className="text-[28px] font-extrabold tracking-tight">{coin.sym}/USDT</h1>
            <span className={`text-[28px] font-extrabold tabular-nums ${up ? 'text-up' : 'text-down'}`}>{fmtPrice(coin.price)}</span>
            <span className={`text-[15px] font-semibold ${up ? 'text-up' : 'text-down'}`}>{fmtChg(coin.chg)}</span>
          </div>
          <div className="grid grid-cols-3 border-y-2 border-ink">
            {[['24h Hoch', fmtPrice(Math.max(...coin.hist))], ['24h Tief', fmtPrice(Math.min(...coin.hist))], ['Volumen 24h', coin.vol]].map(([k, v]) => (
              <div key={k} className="flex flex-col gap-1 py-3 pr-3"><span className="text-xs text-muted">{k}</span><strong className="tabular-nums">{v}</strong></div>
            ))}
          </div>
          <Chart data={coin.hist} up={up} />
        </div>

        <div className="flex flex-col gap-4 pb-10 pt-7 lg:border-l-2 lg:border-ink lg:pl-7">
          <div className="grid grid-cols-2 border-2 border-ink">
            <button onClick={() => { setSide('buy'); setErr(''); }} className={`px-3.5 py-3 text-left text-[15px] font-semibold ${buying ? 'bg-up text-white' : ''}`}>Kaufen</button>
            <button onClick={() => { setSide('sell'); setErr(''); }} className={`px-3.5 py-3 text-left text-[15px] font-semibold ${!buying ? 'bg-down text-white' : ''}`}>Verkaufen</button>
          </div>
          <div className="flex justify-between text-sm"><span className="text-muted">Verfügbar</span>
            <strong className="tabular-nums">{user ? (buying ? `${fmtQty(balances.USDT)} USDT` : `${fmtQty(balances[coin.sym])} ${coin.sym}`) : 'Anmeldung nötig'}</strong></div>
          <div className="flex justify-between text-sm"><span className="text-muted">Preis (Market)</span><strong className="tabular-nums">{fmtPrice(coin.price)} USDT</strong></div>
          <label className="flex flex-col gap-2">
            <span className="label">MENGE ({coin.sym})</span>
            <input className="input tabular-nums" inputMode="decimal" placeholder="0,00" value={qty} onChange={e => { setQty(e.target.value); setErr(''); }} />
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {[25, 50, 75, 100].map(p => <button key={p} onClick={() => setPct(p)} className="bg-surface py-2 text-[13px] font-semibold hover:bg-hover">{p} %</button>)}
          </div>
          <div className="flex justify-between border-t-2 border-ink pt-3 text-[15px]"><span>Gesamt</span><strong className="tabular-nums">{nf(total, 2)} USDT</strong></div>
          {err && <p className="text-sm font-semibold text-down">{err}</p>}
          <button onClick={submit} className={`btn h-[52px] text-base text-white ${buying ? 'bg-up' : 'bg-down'}`}>
            <span>{coin.sym} {buying ? 'kaufen' : 'verkaufen'} (Demo)</span><span>→</span>
          </button>
          <p className="text-[13px] leading-snug text-muted">Simulation. Es wird kein echtes Geld und keine echte Kryptowährung bewegt.</p>
        </div>
      </div>
    </>
  );
}

export default function TradePage() {
  return <Suspense><Trade /></Suspense>;
}
