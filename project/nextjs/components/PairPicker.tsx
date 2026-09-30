'use client';
import { useState } from 'react';
import { MagnifyingGlass } from '@phosphor-icons/react';
import { fmtPrice, searchCoins, type Coin } from '@/lib/data';
import { useQuotes } from '@/lib/quotes';
import Modal from '@/components/Modal';
import CategoryTabs, { type Cat } from '@/components/CategoryTabs';
import { Change, CoinIcon } from '@/components/ui/primitives';

const MAX = 60;

/** Handelspaar suchen: Kürzel, Name oder Anbieter-Kennung, nach Kategorie gefiltert */
export default function PairPicker({ initialCat, active, onPick, onClose }: {
  initialCat: Cat; active: string; onPick: (c: Coin) => void; onClose: () => void;
}) {
  const { coins } = useQuotes();
  const [cat, setCat] = useState<Cat>(initialCat);
  const [q, setQ] = useState('');
  // Beim Suchen über alle Kategorien, sonst nach gewähltem Reiter
  const list = searchCoins(coins.filter(c => cat === 'all' || c.cat === cat), q);
  const shown = list.slice(0, MAX);

  return (
    <Modal title="Handelspaar wählen" onClose={onClose}>
      <label className="relative block">
        <span className="sr-only">Suchen</span>
        <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" aria-hidden />
        <input autoFocus className="field h-11 pl-9 text-base" type="search" placeholder="Name, Kürzel oder Kennung" value={q} onChange={e => { setQ(e.target.value); if (e.target.value.trim()) setCat('all'); }} />
      </label>
      <CategoryTabs value={cat} onChange={setCat} />
      {shown.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">Nichts gefunden. Versuche z. B. „Gold“, „SAP“ oder „avalanche“.</p>
      ) : (
        <ul className="-mx-5 divide-y divide-line border-y border-line">
          {shown.map(c => (
            <li key={c.sym}>
              <button type="button" onClick={() => onPick(c)} aria-current={c.sym === active ? 'true' : undefined}
                className={`grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-5 py-2.5 text-left transition-colors hover:bg-subtle ${c.sym === active ? 'bg-accent-soft/60' : ''}`}>
                <span className="flex min-w-0 items-center gap-3">
                  <CoinIcon sym={c.sym} size="sm" />
                  <span className="flex min-w-0 flex-col">
                    <span className="text-sm font-semibold leading-tight">{c.sym}<span className="font-normal text-faint">/{c.quote}</span></span>
                    <span className="truncate text-xs text-muted">{c.name}</span>
                  </span>
                </span>
                <span className="flex flex-col items-end">
                  <span className="num text-sm font-medium">{fmtPrice(c.price)}</span>
                  {c.price ? <Change value={c.chg} icon={false} className="text-xs" /> : <span className="text-xs text-faint">kein Kurs</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {list.length > shown.length && <p className="hint">{shown.length} von {list.length} Treffern. Suche genauer, um weitere zu sehen.</p>}
    </Modal>
  );
}
