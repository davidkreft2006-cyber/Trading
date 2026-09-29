'use client';
import { useState } from 'react';
import Link from 'next/link';
import { MagnifyingGlass } from '@phosphor-icons/react';
import { COINS } from '@/lib/data';
import MarketTable from '@/components/MarketTable';
import { Change, Segmented } from '@/components/ui/primitives';

type Filter = 'all' | 'gainers' | 'losers';

export default function MarketsPage() {
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const query = q.trim().toLowerCase();
  const list = COINS
    .filter(c => filter === 'all' || (filter === 'gainers' ? c.chg >= 0 : c.chg < 0))
    .filter(c => !query || c.sym.toLowerCase().includes(query) || c.name.toLowerCase().includes(query));
  const sorted = [...COINS].sort((a, b) => b.chg - a.chg);
  const best = sorted[0], worst = sorted[sorted.length - 1];
  const gainers = COINS.filter(c => c.chg >= 0).length;

  return (
    <div className="wrap flex flex-col gap-6 pt-8 md:pt-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-[-0.03em] md:text-4xl">Märkte</h1>
        <p className="text-sm text-muted">Spot-Paare gegen USDT</p>
      </div>

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-panel border border-line bg-line md:grid-cols-4">
        {[
          { k: 'Top-Gewinner', v: <Link href={`/trade?pair=${best.sym}`} className="flex items-baseline gap-2 hover:text-accent"><span>{best.sym}</span><Change value={best.chg} icon={false} className="text-sm" /></Link> },
          { k: 'Top-Verlierer', v: <Link href={`/trade?pair=${worst.sym}`} className="flex items-baseline gap-2 hover:text-accent"><span>{worst.sym}</span><Change value={worst.chg} icon={false} className="text-sm" /></Link> },
          { k: 'Im Plus / Minus', v: <span className="num">{gainers} / {COINS.length - gainers}</span> },
          { k: 'Gelistete Paare', v: <span className="num">{COINS.length}</span> }
        ].map(({ k, v }) => (
          <div key={k} className="flex flex-col gap-1 bg-surface px-4 py-3.5 sm:px-5">
            <dt className="text-[13px] text-muted">{k}</dt>
            <dd className="text-lg font-semibold">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Segmented label="Filter" value={filter} onChange={setFilter} className="self-start"
          options={[{ value: 'all', label: 'Alle' }, { value: 'gainers', label: 'Gewinner' }, { value: 'losers', label: 'Verlierer' }]} />
        <label className="relative w-full sm:w-72">
          <span className="sr-only">Coin suchen</span>
          <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" aria-hidden />
          <input className="field h-10 pl-9 text-sm" type="search" placeholder="Coin suchen" value={q} onChange={e => setQ(e.target.value)} />
        </label>
      </div>

      <MarketTable coins={list} sortable onReset={() => { setQ(''); setFilter('all'); }} />
    </div>
  );
}
