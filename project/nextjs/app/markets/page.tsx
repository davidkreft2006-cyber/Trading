'use client';
import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { MagnifyingGlass } from '@phosphor-icons/react';
import { CATEGORIES, REGIONS, searchCoins, type Region } from '@/lib/data';
import { useQuotes, type FeedStatus } from '@/lib/quotes';
import CategoryTabs, { type Cat } from '@/components/CategoryTabs';
import MarketTable from '@/components/MarketTable';
import { Change, LiveBadge, Segmented } from '@/components/ui/primitives';

type Filter = 'all' | 'gainers' | 'losers';
const CAT_KEYS: Cat[] = ['all', ...CATEGORIES.map(c => c.key)];

function Markets() {
  const params = useSearchParams();
  const router = useRouter();
  const initial = params.get('cat');
  const [cat, setCat] = useState<Cat>(CAT_KEYS.includes(initial as Cat) ? (initial as Cat) : 'all');
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [region, setRegion] = useState<Region | 'all'>('all');
  const query = q.trim().toLowerCase();

  const { coins, status, statusOf } = useQuotes();
  const inCat = coins.filter(c => (cat === 'all' || c.cat === cat) && (cat !== 'stock' || region === 'all' || c.region === region));
  const priced = inCat.filter(c => c.price > 0);
  // „Alle“: nur live, wenn beide Quellen live sind
  const feed: FeedStatus = cat !== 'all' ? statusOf(cat) : status.crypto === 'live' && status.tradfi === 'live' ? 'live' : status.crypto === 'loading' || status.tradfi === 'loading' ? 'loading' : 'fallback';
  // Suche über Kürzel, Name und die Kennungen der Kursanbieter (z. B. „SAP.DE“, „avalanche-2“)
  const list = searchCoins(inCat.filter(c => filter === 'all' || (c.price > 0 && (filter === 'gainers' ? c.chg >= 0 : c.chg < 0))), query);
  const sorted = [...priced].sort((a, b) => b.chg - a.chg);
  const best = sorted[0], worst = sorted[sorted.length - 1];
  const gainers = priced.filter(c => c.chg >= 0).length;

  const pickCat = (c: Cat) => {
    setCat(c);
    setRegion('all');
    router.replace(c === 'all' ? '/markets' : `/markets?cat=${c}`, { scroll: false });
  };

  return (
    <div className="wrap flex flex-col gap-6 pt-8 md:pt-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-[-0.03em] md:text-4xl">Märkte</h1>
        <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted">Krypto, Aktien, ETFs und Rohstoffe <LiveBadge status={feed} delayed={cat !== 'crypto'} /></p>
      </div>

      <CategoryTabs value={cat} onChange={pickCat} />

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-panel border border-line bg-line md:grid-cols-4">
        {[
          { k: 'Top-Gewinner', v: best ? <Link href={`/trade?pair=${best.sym}`} className="flex items-baseline gap-2 hover:text-accent"><span className="truncate">{best.sym}</span><Change value={best.chg} icon={false} className="text-sm" /></Link> : '–' },
          { k: 'Top-Verlierer', v: worst ? <Link href={`/trade?pair=${worst.sym}`} className="flex items-baseline gap-2 hover:text-accent"><span className="truncate">{worst.sym}</span><Change value={worst.chg} icon={false} className="text-sm" /></Link> : '–' },
          { k: 'Im Plus / Minus', v: <span className="num">{gainers} / {priced.length - gainers}</span> },
          { k: 'Gelistet', v: <span className="num">{inCat.length}</span> }
        ].map(({ k, v }) => (
          <div key={k} className="flex flex-col gap-1 bg-surface px-4 py-3.5 sm:px-5">
            <dt className="text-[13px] text-muted">{k}</dt>
            <dd className="text-lg font-semibold">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <Segmented label="Filter" value={filter} onChange={setFilter} className="self-start"
            options={[{ value: 'all', label: 'Alle' }, { value: 'gainers', label: 'Gewinner' }, { value: 'losers', label: 'Verlierer' }]} />
          {cat === 'stock' && (
            <Segmented label="Region" value={region} onChange={setRegion} className="self-start"
              options={[{ value: 'all' as const, label: 'Weltweit' }, ...REGIONS.map(r => ({ value: r.key, label: r.label }))]} />
          )}
        </div>
        <label className="relative w-full sm:w-72">
          <span className="sr-only">Suchen</span>
          <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" aria-hidden />
          <input className="field h-10 pl-9 text-sm" type="search" placeholder="Name, Kürzel oder Kennung" value={q} onChange={e => setQ(e.target.value)} />
        </label>
      </div>

      <MarketTable key={`${cat}-${region}`} coins={list} sortable onReset={() => { setQ(''); setFilter('all'); pickCat('all'); }} />
    </div>
  );
}

export default function MarketsPage() {
  return <Suspense><Markets /></Suspense>;
}
