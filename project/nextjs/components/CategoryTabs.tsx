'use client';
import { CATEGORIES, COINS, type Category } from '@/lib/data';

export type Cat = Category | 'all';

/** Kategorie-Reiter (Pill-Chips mit Anzahl). withAll: Reiter „Alle“; only: nur diese Kategorien */
export default function CategoryTabs({ value, onChange, withAll = true, only }: {
  value: Cat; onChange: (c: Cat) => void; withAll?: boolean; only?: Category[];
}) {
  const cats = only ? CATEGORIES.filter(c => only.includes(c.key)) : CATEGORIES;
  const tabs: { key: Cat; label: string }[] = withAll ? [{ key: 'all', label: 'Alle' }, ...cats] : cats;
  return (
    <div role="tablist" aria-label="Kategorie" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0 [scrollbar-width:none]">
      <div className="flex min-w-max gap-1.5">
        {tabs.map(t => {
          const on = t.key === value;
          const n = t.key === 'all' ? COINS.length : COINS.filter(c => c.cat === t.key).length;
          return (
            <button key={t.key} role="tab" aria-selected={on} onClick={() => onChange(t.key)}
              className={`flex h-9 items-center gap-2 rounded-full border px-3.5 text-[13px] font-medium transition-colors ${on ? 'border-accent bg-accent-soft text-accent' : 'border-line text-muted hover:border-line-strong hover:text-ink'}`}>
              {t.label}<span className={`num text-xs ${on ? 'text-accent/80' : 'text-faint'}`}>{n}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
