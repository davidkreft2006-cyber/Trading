'use client';
import { useState } from 'react';
import { COINS, fmtChg } from '@/lib/data';
import MarketTable from '@/components/MarketTable';

export default function MarketsPage() {
  const [q, setQ] = useState('');
  const query = q.trim().toLowerCase();
  const list = COINS.filter(c => !query || c.sym.toLowerCase().includes(query) || c.name.toLowerCase().includes(query));
  const sorted = [...COINS].sort((a, b) => b.chg - a.chg);
  const stats = [
    ['TOP-GEWINNER', `${sorted[0].sym}  ${fmtChg(sorted[0].chg)}`],
    ['TOP-VERLIERER', `${sorted.at(-1)!.sym}  ${fmtChg(sorted.at(-1)!.chg)}`],
    ['GELISTETE PAARE', `${COINS.length} Spot-Paare`]
  ];
  return (
    <section className="wrap flex flex-col gap-6 pb-16 pt-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-[clamp(32px,4.5vw,52px)] font-extrabold tracking-[-0.03em]">Märkte</h1>
          <span className="text-sm text-muted">Spot · fiktive Beispielkurse in USDT</span>
        </div>
        <input className="input h-11 w-full sm:w-[280px]" placeholder="Coin suchen" value={q} onChange={e => setQ(e.target.value)} />
      </div>
      <div className="grid border-y-2 border-ink sm:grid-cols-3">
        {stats.map(([k, v]) => (
          <div key={k} className="flex flex-col gap-1.5 py-4 pr-4">
            <span className="text-xs font-extrabold tracking-wider text-muted">{k}</span>
            <strong className="text-xl">{v}</strong>
          </div>
        ))}
      </div>
      <MarketTable coins={list} />
    </section>
  );
}
