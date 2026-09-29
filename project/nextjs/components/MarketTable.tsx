'use client';
import { useState } from 'react';
import Link from 'next/link';
import { CaretDown, CaretUp, MagnifyingGlass } from '@phosphor-icons/react';
import { fmtPrice, volShort, type Coin } from '@/lib/data';
import { Change, CoinIcon, EmptyState, FlashValue, Sparkline } from './ui/primitives';
import { LiquidButton } from '@/components/ui/liquid-glass-button';

type SortKey = 'sym' | 'price' | 'chg' | 'volNum';
// Mobil: Paar | Kurs + 24h. Ab md: plus Verlauf und Volumen. Ab lg: plus Handeln.
const cols = 'grid grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,0.8fr)_112px_minmax(0,1fr)] lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,0.8fr)_128px_minmax(0,1fr)_96px] items-center gap-x-4';

export default function MarketTable({ coins, sortable = false, onReset }: { coins: Coin[]; sortable?: boolean; onReset?: () => void }) {
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 } | null>(null);
  const rows = sort
    ? [...coins].sort((a, b) => (sort.key === 'sym' ? a.sym.localeCompare(b.sym) : a[sort.key] - b[sort.key]) * sort.dir)
    : coins;

  const Head = ({ k, children, align = 'right', className = '' }: { k: SortKey; children: string; align?: 'left' | 'right'; className?: string }) => {
    const on = sort?.key === k;
    const cls = `flex items-center gap-1 ${align === 'right' ? 'justify-end' : ''} ${className}`;
    if (!sortable) return <span className={cls}>{children}</span>;
    const Icon = on && sort!.dir === 1 ? CaretUp : CaretDown;
    return (
      <button type="button" className={`${cls} rounded-tag transition-colors hover:text-ink ${on ? 'text-ink' : ''}`}
        aria-sort={on ? (sort!.dir === 1 ? 'ascending' : 'descending') : 'none'}
        onClick={() => setSort(s => (s?.key === k ? (s.dir === -1 ? { key: k, dir: 1 } : null) : { key: k, dir: k === 'sym' ? 1 : -1 }))}>
        {children}
        <Icon weight="bold" className={`h-3 w-3 ${on ? 'opacity-100' : 'opacity-0'}`} aria-hidden />
      </button>
    );
  };

  return (
    <div role="table" aria-label="Marktliste" className="panel overflow-hidden">
      <div role="row" className={`${cols} border-b border-line bg-subtle/70 px-4 py-2.5 text-xs font-medium text-faint sm:px-5`}>
        <Head k="sym" align="left">Paar</Head>
        <span className="flex justify-end gap-1 md:contents">
          <Head k="price">Kurs</Head>
          <Head k="chg" className="md:hidden">· 24h</Head>
        </span>
        <Head k="chg" className="hidden md:flex">24h</Head>
        <span className="hidden text-right md:block">Verlauf</span>
        <Head k="volNum" className="hidden md:flex">Volumen 24h</Head>
        <span className="hidden lg:block" />
      </div>
      {rows.length === 0 && (
        <EmptyState icon={<MagnifyingGlass className="h-5 w-5" />} title="Kein Paar gefunden"
          action={onReset && <LiquidButton variant="glass" size="sm" onClick={onReset}>Suche zurücksetzen</LiquidButton>}>
          Versuche ein Kürzel wie BTC oder AAPL oder einen Namen wie Gold.
        </EmptyState>
      )}
      <div className="divide-y divide-line">
        {rows.map(c => (
          <Link role="row" key={c.sym} href={`/trade?pair=${c.sym}`} className={`${cols} group px-4 py-3 transition-colors hover:bg-subtle/70 sm:px-5`}>
            <div className="flex min-w-0 items-center gap-3">
              <CoinIcon sym={c.sym} />
              <div className="flex min-w-0 flex-col">
                <span className="text-[15px] font-semibold leading-tight">{c.sym}<span className="font-normal text-faint">/{c.quote}</span></span>
                <span className="truncate text-[13px] text-muted">{c.name}</span>
              </div>
            </div>
            <div className="flex flex-col items-end md:contents">
              <span className="num text-right text-[15px] font-medium"><FlashValue value={c.price}>{fmtPrice(c.price)}</FlashValue></span>
              <Change value={c.chg} className="text-[13px] md:text-sm" />
            </div>
            <div className="hidden justify-end md:flex"><Sparkline data={c.hist} up={c.chg >= 0} className="h-8 w-full max-w-[112px]" /></div>
            <span className="num hidden text-right text-sm text-muted md:block">{volShort(c)}</span>
            <span className="hidden justify-end lg:flex">
              <LiquidButton asChild variant="glass" size="sm" className="group-hover:text-accent"><span>Handeln</span></LiquidButton>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
