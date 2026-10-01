'use client';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ArrowDownRight, ArrowUpRight, Info } from '@phosphor-icons/react';
import { fmtChg, fmtPrice, fmtUsd } from '@/lib/data';
import { useQuotes, type FeedStatus } from '@/lib/quotes';
import ZoomChart from './zoom-chart';

/** Neutrale Monogramm-Marke je Asset. Bewusst ohne Markenfarben der echten Coins. */
export function CoinIcon({ sym, size = 'md' }: { sym: string; size?: 'sm' | 'md' | 'lg' }) {
  const s = { sm: 'h-7 w-7 text-[10px]', md: 'h-9 w-9 text-[11px]', lg: 'h-11 w-11 text-xs' }[size];
  return (
    <span aria-hidden className={`${s} flex flex-none items-center justify-center rounded-tag border border-line bg-subtle font-mono font-semibold tracking-tight text-ink`}>
      {sym.slice(0, 4)}
    </span>
  );
}

/** Kursänderung: Farbe plus Pfeil plus Vorzeichen, nie Farbe allein. */
export function Change({ value, className = '', icon = true }: { value: number; className?: string; icon?: boolean }) {
  const up = value >= 0;
  const Arrow = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`num inline-flex items-center justify-end gap-0.5 ${up ? 'text-up' : 'text-down'} ${className}`}>
      {icon && <Arrow weight="bold" className="h-3.5 w-3.5 flex-none" aria-hidden />}
      {fmtChg(value)}
    </span>
  );
}

/** Gewinn/Verlust in USD mit Vorzeichen, optional mit Prozent. Farbe plus Vorzeichen, nie Farbe allein. */
export function Pnl({ value, pct, className = '' }: { value: number; pct?: number; className?: string }) {
  const flat = Math.abs(value) < 0.005;
  const tone = flat ? 'text-muted' : value > 0 ? 'text-up' : 'text-down';
  return (
    <span className={`num whitespace-nowrap ${tone} ${className}`}>
      {flat ? '±' : value > 0 ? '+' : '−'}{fmtUsd(Math.abs(value))}{pct !== undefined && !flat ? ` (${fmtChg(pct)})` : ''}
    </span>
  );
}

/** Kleine Verlaufslinie für Tabellenzeilen. Rein illustrativ, die Zahl steht daneben. */
export function Sparkline({ data, up, className = 'h-8 w-24' }: { data: number[]; up: boolean; className?: string }) {
  const pts = useMemo(() => {
    if (data.length < 2) return '';
    const min = Math.min(...data), max = Math.max(...data), r = max - min || 1;
    return data.map((v, i) => `${((i / (data.length - 1)) * 100).toFixed(2)},${(30 - ((v - min) / r) * 28 - 1).toFixed(2)}`).join(' ');
  }, [data]);
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className={className} aria-hidden>
      <polyline points={pts} fill="none" className={up ? 'stroke-up' : 'stroke-down'} strokeWidth="1.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}


export function PriceChart({ data, up, label, times, unit = 'USD' }: { data: number[]; up: boolean; label: string; times?: number[]; unit?: string }) {
  if (data.length < 2) {
    return (
      <div className="flex h-[clamp(220px,34vw,340px)] flex-col items-center justify-center gap-1 rounded-ctl border border-dashed border-line text-center" role="img" aria-label={`${label}: kein Verlauf verfügbar`}>
        <span className="text-sm font-medium text-muted">Noch kein Kursverlauf</span>
        <span className="text-[13px] text-faint">Der Verlauf erscheint, sobald Live-Kurse geladen sind.</span>
      </div>
    );
  }
  // key: neuer Zoom-Zustand je Instrument und Zeitraum
  return <ZoomChart key={label} data={data} up={up} label={label} times={times} unit={unit} />;
}

/** Dezenter Hinweis in Dialogen. */
export function Note({ children }: { children: ReactNode }) {
  return (
    <p className="flex gap-2 text-[13px] leading-snug text-faint">
      <Info className="mt-px h-4 w-4 flex-none" aria-hidden />
      <span>{children}</span>
    </p>
  );
}

export function EmptyState({ icon, title, children, action }: { icon: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-3 px-5 py-10 sm:px-6">
      <span className="flex h-10 w-10 items-center justify-center rounded-ctl border border-line bg-subtle text-muted">{icon}</span>
      <div className="flex max-w-[44ch] flex-col gap-1">
        <strong className="text-[15px] font-semibold">{title}</strong>
        {children && <p className="text-sm text-muted">{children}</p>}
      </div>
      {action}
    </div>
  );
}

export function Segmented<T extends string>({ value, onChange, options, label, className = '' }: {
  value: T; onChange: (v: T) => void; options: { value: T; label: string; activeClass?: string }[]; label: string; className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={`inline-grid auto-cols-fr grid-flow-col gap-1 rounded-full border border-line bg-subtle p-1 ${className}`}>
      {options.map(o => {
        const on = o.value === value;
        return (
          <button key={o.value} type="button" role="radio" aria-checked={on} onClick={() => onChange(o.value)}
            className={`h-8 whitespace-nowrap rounded-full px-3 text-[13px] font-medium transition-colors duration-150 sm:px-4 ${on ? (o.activeClass ?? 'bg-surface text-ink shadow-[0_1px_2px_rgb(15_20_25/0.08)]') : 'text-muted hover:text-ink'}`}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Herkunft der Kurse. Der Punkt zeigt echten Status (live / Ausweichwerte), keine Deko. */
export function LiveBadge({ status, delayed = false, className = '' }: { status: FeedStatus; delayed?: boolean; className?: string }) {
  const { cachedAt } = useQuotes();
  const stand = cachedAt ? new Date(cachedAt).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
  const text = status === 'loading' ? 'Kurse laden'
    : status === 'cached' ? `Letzter Stand ${stand}`
    : status === 'offline' ? 'Kurse gerade nicht verfügbar'
    : delayed ? 'Live, ggf. verzögert' : 'Live';
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${status === 'live' ? 'text-up' : 'text-faint'} ${className}`} role="status">
      <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${status === 'live' ? 'bg-up motion-safe:animate-pulse' : 'bg-faint'}`} />
      {text}
    </span>
  );
}

/** Kurzes Aufleuchten, wenn sich ein Kurs ändert (grün steigend, rot fallend). */
export function FlashValue({ value, children, className = '' }: { value: number; children: ReactNode; className?: string }) {
  const prev = useRef(value);
  const [dir, setDir] = useState<'up' | 'down' | null>(null);
  useEffect(() => {
    if (value === prev.current) return;
    setDir(value > prev.current ? 'up' : 'down');
    prev.current = value;
    const t = setTimeout(() => setDir(null), 700);
    return () => clearTimeout(t);
  }, [value]);
  const tint = dir === 'up' ? 'bg-up/15 text-up' : dir === 'down' ? 'bg-down/15 text-down' : '';
  return <span className={`-mx-1 rounded-tag px-1 transition-colors duration-500 ${tint} ${className}`}>{children}</span>;
}
