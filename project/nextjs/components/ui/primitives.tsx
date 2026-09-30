'use client';
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { ArrowDownRight, ArrowUpRight, Info } from '@phosphor-icons/react';
import { fmtChg, fmtPrice } from '@/lib/data';
import type { FeedStatus } from '@/lib/quotes';

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

/**
 * Kursverlauf mit Fadenkreuz und Tooltip.
 * Eine Serie, eine Achse; Raster und Achsenbeschriftung bewusst zurückhaltend.
 */
const fmtTime = (t: number) => new Date(t).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

export function PriceChart({ data, up, label, times }: { data: number[]; up: boolean; label: string; times?: number[] }) {
  if (data.length < 2) {
    return (
      <div className="flex h-[clamp(220px,34vw,340px)] flex-col items-center justify-center gap-1 rounded-ctl border border-dashed border-line text-center" role="img" aria-label={`${label}: kein Verlauf verfügbar`}>
        <span className="text-sm font-medium text-muted">Noch kein Kursverlauf</span>
        <span className="text-[13px] text-faint">Der Verlauf erscheint, sobald Live-Kurse geladen sind.</span>
      </div>
    );
  }
  return <Chart data={data} up={up} label={label} times={times} />;
}

function Chart({ data, up, label, times }: { data: number[]; up: boolean; label: string; times?: number[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const gid = useId();
  const W = 600, H = 240, PAD = 8;
  const min = Math.min(...data), max = Math.max(...data), r = max - min || 1;
  const x = (i: number) => (i / (data.length - 1)) * W;
  const y = (v: number) => PAD + (1 - (v - min) / r) * (H - PAD * 2);
  const line = data.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const area = `0,${H} ${line} ${W},${H}`;
  const ticks = [max, min + r / 2, min];

  const onMove = (e: React.PointerEvent) => {
    const box = ref.current!.getBoundingClientRect();
    const i = Math.round(((e.clientX - box.left) / box.width) * (data.length - 1));
    setHover(Math.max(0, Math.min(data.length - 1, i)));
  };
  const hi = hover ?? data.length - 1;
  const leftPct = (hi / (data.length - 1)) * 100;

  return (
    <figure className="flex flex-col gap-2">
      <div className="flex">
        <div ref={ref} className="relative h-[clamp(220px,34vw,340px)] flex-1 touch-none"
          onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={() => setHover(null)}
          role="img" aria-label={`${label}: Verlauf von ${fmtPrice(data[0])} auf ${fmtPrice(data[data.length - 1])} USDT`}>
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
            <defs>
              <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" className={up ? 'text-up' : 'text-down'} stopColor="currentColor" stopOpacity="0.16" />
                <stop offset="1" className={up ? 'text-up' : 'text-down'} stopColor="currentColor" stopOpacity="0" />
              </linearGradient>
            </defs>
            {ticks.map((t, k) => (
              <line key={k} x1="0" x2={W} y1={y(t)} y2={y(t)} className="stroke-line" strokeWidth="1" strokeDasharray={k === 1 ? '3 4' : undefined} vectorEffect="non-scaling-stroke" />
            ))}
            <polygon points={area} fill={`url(#${gid})`} />
            <polyline points={line} fill="none" className={up ? 'stroke-up' : 'stroke-down'} strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            {hover !== null && <line x1={x(hi)} x2={x(hi)} y1="0" y2={H} className="stroke-faint" strokeWidth="1" strokeDasharray="2 3" vectorEffect="non-scaling-stroke" />}
          </svg>
          {/* Punkt als HTML, damit er trotz nicht-proportionaler Skalierung rund bleibt */}
          <span className={`pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface ${up ? 'bg-up' : 'bg-down'}`}
            style={{ left: `${leftPct}%`, top: `${(y(data[hi]) / H) * 100}%` }} />
          {hover !== null && (
            <div className="pointer-events-none absolute top-0 z-10 rounded-ctl border border-line bg-surface px-2.5 py-1.5 shadow-[0_6px_20px_-8px_rgb(15_20_25/0.25)]"
              style={{ left: `${leftPct}%`, transform: `translateX(${leftPct > 70 ? 'calc(-100% - 10px)' : '10px'})` }}>
              <div className="num text-[13px] font-medium text-ink">{fmtPrice(data[hi])} USDT</div>
              <div className="text-[11px] text-faint">{hi === data.length - 1 ? 'Aktuell' : times?.[hi] ? fmtTime(times[hi]) : `vor ${data.length - 1 - hi} Ticks`}</div>
            </div>
          )}
        </div>
        <div className="relative ml-2 w-16 flex-none" aria-hidden>
          {ticks.map((t, k) => (
            <span key={k} className="num absolute right-0 -translate-y-1/2 text-[11px] text-faint" style={{ top: `${(y(t) / H) * 100}%` }}>{fmtPrice(t)}</span>
          ))}
        </div>
      </div>
      <figcaption className="hint">{times?.length ? `Verlauf seit ${fmtTime(times[0])}` : 'Beispielverlauf'}</figcaption>
    </figure>
  );
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
            className={`h-8 rounded-full px-4 text-[13px] font-medium transition-colors duration-150 ${on ? (o.activeClass ?? 'bg-surface text-ink shadow-[0_1px_2px_rgb(15_20_25/0.08)]') : 'text-muted hover:text-ink'}`}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Herkunft der Kurse. Der Punkt zeigt echten Status (live / Ausweichwerte), keine Deko. */
export function LiveBadge({ status, delayed = false, className = '' }: { status: FeedStatus; delayed?: boolean; className?: string }) {
  const text = status === 'loading' ? 'Kurse laden' : status === 'fallback' ? 'Beispielkurse' : delayed ? 'Live, ggf. verzögert' : 'Live';
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
