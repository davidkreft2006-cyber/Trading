'use client';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { ArrowsOut, Minus, Plus } from '@phosphor-icons/react';
import { fmtPrice } from '@/lib/data';

/*
  Kursverlauf mit Fadenkreuz, Zoom und Verschieben.
  - Handy: zwei Finger = zoomen, ein Finger = verschieben (wenn hineingezoomt) bzw. Fadenkreuz,
    doppelt tippen = zurücksetzen. Senkrechtes Wischen scrollt weiter die Seite (touch-action: pan-y).
  - Maus: Mausrad = zoomen um den Mauszeiger, ziehen = verschieben, Doppelklick = zurücksetzen.
  - Tastatur (Chart fokussiert): + / − zoomen, ← / → verschieben, 0 oder Esc zurücksetzen.
  - Knöpfe oben links: hinein, heraus, zurücksetzen.
  Die y-Achse passt sich immer dem sichtbaren Ausschnitt an.
*/

const fmtTime = (t: number, dateOnly = false) => new Date(t).toLocaleString('de-DE', dateOnly
  ? { day: '2-digit', month: '2-digit', year: 'numeric' }
  : { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

type View = { s: number; e: number }; // sichtbarer Bereich als (gebrochene) Indizes

export default function ZoomChart({ data, up, label, times, unit }: { data: number[]; up: boolean; label: string; times?: number[]; unit: string }) {
  const n = data.length;
  const last = n - 1;
  const minSpan = Math.min(8, last);
  const full: View = { s: 0, e: last };

  const [view, setViewState] = useState<View>(full);
  const [hover, setHover] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const viewRef = useRef(view);
  const pointers = useRef(new Map<number, number>());
  const gesture = useRef<{ kind: 'pan'; s0: number; e0: number; x0: number; moved: boolean } | { kind: 'pinch'; s0: number; e0: number; d0: number; frac: number } | null>(null);
  const lastTap = useRef(0);
  const gid = useId();

  /** Bereich begrenzen: mindestens minSpan Punkte, nie über die Daten hinaus */
  const clampView = useCallback((s: number, span: number): View => {
    const sp = Math.max(minSpan, Math.min(last, span));
    const st = Math.max(0, Math.min(last - sp, s));
    return { s: st, e: st + sp };
  }, [last, minSpan]);
  const setView = useCallback((v: View) => { viewRef.current = v; setViewState(v); }, []);

  // Neue Datenmenge: wer am rechten Rand war, bleibt dort (Live-Kurs); sonst Bereich begrenzen
  const prevLast = useRef(last);
  useEffect(() => {
    if (prevLast.current === last) return;
    const v = viewRef.current;
    const atEnd = v.e >= prevLast.current - 0.5;
    const span = v.e - v.s;
    setView(atEnd ? clampView(last - span, span) : clampView(v.s, span));
    prevLast.current = last;
  }, [last, clampView, setView]);

  const { s, e } = view;
  const span = e - s;
  const zoomed = span < last - 0.5;
  const i0 = Math.max(0, Math.floor(s)), i1 = Math.min(last, Math.ceil(e));
  const visible = data.slice(i0, i1 + 1);
  const min = Math.min(...visible), max = Math.max(...visible), r = max - min || Math.abs(max) * 0.01 || 1;
  const W = 600, H = 240, PAD = 8;
  const x = (i: number) => ((i - s) / span) * W;
  const y = (v: number) => PAD + (1 - (v - min) / r) * (H - PAD * 2);
  const line = visible.map((v, k) => `${x(i0 + k).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const area = `${x(i0).toFixed(1)},${H} ${line} ${x(i1).toFixed(1)},${H}`;
  const ticks = [max, min + r / 2, min];

  const rect = () => ref.current!.getBoundingClientRect();
  const fracAt = (clientX: number) => { const b = rect(); return Math.max(0, Math.min(1, (clientX - b.left) / b.width)); };

  /** Zoomen um einen Ankerpunkt (0 = linker, 1 = rechter Rand des Ausschnitts) */
  const zoomBy = useCallback((factor: number, frac: number) => {
    const v = viewRef.current;
    const sp = v.e - v.s;
    const next = Math.max(minSpan, Math.min(last, sp * factor));
    if (Math.abs(next - sp) < 1e-6) return false;
    const anchor = v.s + frac * sp;
    setView(clampView(anchor - frac * next, next));
    return true;
  }, [clampView, last, minSpan, setView]);
  const panBy = useCallback((points: number) => {
    const v = viewRef.current;
    setView(clampView(v.s + points, v.e - v.s));
  }, [clampView, setView]);
  const reset = useCallback(() => { setView({ s: 0, e: last }); setHover(null); }, [last, setView]);

  // Mausrad: nicht-passiv, damit die Seite beim Zoomen nicht mitscrollt.
  // Lässt sich nicht weiter zoomen, scrollt die Seite normal weiter.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onWheel = (ev: WheelEvent) => {
      if (Math.abs(ev.deltaX) > Math.abs(ev.deltaY)) {
        const v = viewRef.current;
        if (v.e - v.s >= last - 0.5) return;
        ev.preventDefault();
        panBy((ev.deltaX / el.clientWidth) * (v.e - v.s));
        return;
      }
      const factor = Math.exp(ev.deltaY * (ev.ctrlKey ? 0.01 : 0.002)); // ctrlKey = Trackpad-Pinch
      if (zoomBy(factor, fracAt(ev.clientX))) ev.preventDefault();
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoomBy, panBy, last]);

  const hoverAt = (clientX: number) => {
    const i = Math.round(s + fracAt(clientX) * span);
    setHover(Math.max(i0, Math.min(i1, i)));
  };

  const onPointerDown = (ev: React.PointerEvent) => {
    try { ref.current?.setPointerCapture(ev.pointerId); } catch { /* Zeiger bereits beendet */ }
    pointers.current.set(ev.pointerId, ev.clientX);
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      gesture.current = { kind: 'pinch', s0: s, e0: e, d0: Math.max(10, Math.abs(a - b)), frac: fracAt((a + b) / 2) };
      setHover(null);
      return;
    }
    if (pointers.current.size !== 1) return;
    if (ev.pointerType !== 'mouse') {
      const now = Date.now();
      if (now - lastTap.current < 300) { lastTap.current = 0; reset(); return; }
      lastTap.current = now;
    }
    if (zoomed) gesture.current = { kind: 'pan', s0: s, e0: e, x0: ev.clientX, moved: false };
    if (!zoomed || ev.pointerType === 'mouse') hoverAt(ev.clientX);
  };

  const onPointerMove = (ev: React.PointerEvent) => {
    if (pointers.current.has(ev.pointerId)) pointers.current.set(ev.pointerId, ev.clientX);
    const g = gesture.current;
    if (g?.kind === 'pinch' && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const d = Math.max(10, Math.abs(a - b));
      const sp = Math.max(minSpan, Math.min(last, ((g.e0 - g.s0) * g.d0) / d));
      const anchor = g.s0 + g.frac * (g.e0 - g.s0);
      setView(clampView(anchor - g.frac * sp, sp));
      return;
    }
    if (g?.kind === 'pan' && pointers.current.size === 1) {
      const dx = ev.clientX - g.x0;
      if (Math.abs(dx) > 3) g.moved = true;
      if (g.moved) {
        setView(clampView(g.s0 - (dx / rect().width) * (g.e0 - g.s0), g.e0 - g.s0));
        setHover(null);
        return;
      }
    }
    // Maus ohne gedrückte Taste oder Finger ohne Zoom: Fadenkreuz
    if (ev.pointerType === 'mouse' ? !g : !zoomed) hoverAt(ev.clientX);
  };

  const onPointerEnd = (ev: React.PointerEvent) => {
    pointers.current.delete(ev.pointerId);
    if (pointers.current.size === 0) gesture.current = null;
    else if (pointers.current.size === 1 && gesture.current?.kind === 'pinch') {
      // Nach dem Pinch mit dem verbliebenen Finger weiter verschieben
      const [xLeft] = [...pointers.current.values()];
      const v = viewRef.current;
      gesture.current = { kind: 'pan', s0: v.s, e0: v.e, x0: xLeft, moved: true };
    }
  };

  const onKeyDown = (ev: React.KeyboardEvent) => {
    const step = Math.max(1, span * 0.15);
    const k = ev.key;
    if (k === '+' || k === '=') zoomBy(0.8, hover !== null ? (hover - s) / span : 1);
    else if (k === '-' || k === '_') zoomBy(1.25, hover !== null ? (hover - s) / span : 1);
    else if (k === 'ArrowLeft') panBy(-step);
    else if (k === 'ArrowRight') panBy(step);
    else if (k === '0' || k === 'Escape') reset();
    else return;
    ev.preventDefault();
  };

  // Ohne Fadenkreuz markiert der Punkt den letzten sichtbaren Wert
  const hi = hover ?? i1;
  const pct = (i: number) => ((i - s) / span) * 100;
  const dateOnly = !!times && times.length > 1 && times[last] - times[0] > 60 * 864e5;
  const t = (i: number) => (times?.[i] ? fmtTime(times[i], dateOnly) : '');
  const btn = 'flex h-7 w-7 items-center justify-center rounded-full border border-line bg-surface/85 text-muted backdrop-blur transition-colors hover:border-accent/50 hover:text-accent disabled:pointer-events-none disabled:opacity-40';

  return (
    <figure className="flex flex-col gap-2">
      <div className="flex">
        <div className="relative h-[clamp(220px,34vw,340px)] flex-1">
          <div ref={ref} tabIndex={0} onKeyDown={onKeyDown}
            className="absolute inset-0 cursor-crosshair select-none rounded-ctl outline-none focus-visible:ring-2 focus-visible:ring-accent/50 data-[pan=true]:cursor-grab"
            data-pan={zoomed}
            style={{ touchAction: 'pan-y' }}
            onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerEnd} onPointerCancel={onPointerEnd}
            onPointerLeave={ev => { if (!pointers.current.has(ev.pointerId)) setHover(null); }}
            onDoubleClick={reset}
            role="img" aria-roledescription="Kurschart, zoombar"
            aria-label={`${label}: ${zoomed ? `Ausschnitt ${t(i0)} bis ${t(i1)}, ` : ''}Verlauf von ${fmtPrice(data[i0])} auf ${fmtPrice(data[i1])}. Mit Plus und Minus zoomen, mit Pfeiltasten verschieben.`}>
            <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-hidden">
              <defs>
                <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" className={up ? 'text-up' : 'text-down'} stopColor="currentColor" stopOpacity="0.16" />
                  <stop offset="1" className={up ? 'text-up' : 'text-down'} stopColor="currentColor" stopOpacity="0" />
                </linearGradient>
              </defs>
              {ticks.map((tv, k) => (
                <line key={k} x1="0" x2={W} y1={y(tv)} y2={y(tv)} className="stroke-line" strokeWidth="1" strokeDasharray={k === 1 ? '3 4' : undefined} vectorEffect="non-scaling-stroke" />
              ))}
              <polygon points={area} fill={`url(#${gid})`} />
              <polyline points={line} fill="none" className={up ? 'stroke-up' : 'stroke-down'} strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
              {hover !== null && <line x1={x(hi)} x2={x(hi)} y1="0" y2={H} className="stroke-faint" strokeWidth="1" strokeDasharray="2 3" vectorEffect="non-scaling-stroke" />}
            </svg>
            {/* Punkt als HTML, damit er trotz nicht-proportionaler Skalierung rund bleibt */}
            {pct(hi) >= -0.5 && pct(hi) <= 100.5 && (
              <span className={`pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface ${up ? 'bg-up' : 'bg-down'}`}
                style={{ left: `${pct(hi)}%`, top: `${(y(data[hi]) / H) * 100}%` }} />
            )}
            {hover !== null && (
              <div className="pointer-events-none absolute top-9 z-10 rounded-ctl border border-line bg-surface px-2.5 py-1.5 shadow-[0_6px_20px_-8px_rgb(15_20_25/0.25)]"
                style={{ left: `${pct(hi)}%`, transform: `translateX(${pct(hi) > 60 ? 'calc(-100% - 10px)' : '10px'})` }}>
                <div className="num whitespace-nowrap text-[13px] font-medium text-ink">{fmtPrice(data[hi])} {unit}</div>
                <div className="whitespace-nowrap text-[11px] text-faint">{hi === last ? 'Aktuell' : t(hi) || `vor ${last - hi} Ticks`}</div>
              </div>
            )}
          </div>
          {/* Zoom-Knöpfe */}
          <div className="absolute left-1.5 top-1.5 z-20 flex gap-1">
            <button type="button" className={btn} aria-label="Hineinzoomen" title="Hineinzoomen" disabled={span <= minSpan + 1e-6}
              onClick={() => zoomBy(0.6, zoomed ? 0.5 : 1)}><Plus weight="bold" className="h-3.5 w-3.5" /></button>
            <button type="button" className={btn} aria-label="Herauszoomen" title="Herauszoomen" disabled={!zoomed}
              onClick={() => zoomBy(1 / 0.6, 0.5)}><Minus weight="bold" className="h-3.5 w-3.5" /></button>
            {zoomed && (
              <button type="button" className={btn} aria-label="Zoom zurücksetzen" title="Zoom zurücksetzen" onClick={reset}>
                <ArrowsOut weight="bold" className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
        <div className="relative ml-2 w-16 flex-none" aria-hidden>
          {ticks.map((tv, k) => (
            <span key={k} className="num absolute right-0 -translate-y-1/2 text-[11px] text-faint" style={{ top: `${(y(tv) / H) * 100}%` }}>{fmtPrice(tv)}</span>
          ))}
        </div>
      </div>
      <figcaption className="hint flex flex-wrap justify-between gap-x-3">
        <span>{!times?.length ? 'Beispielverlauf' : zoomed ? `Ausschnitt ${t(i0)} – ${t(i1)}` : `Verlauf seit ${t(0)}`}</span>
        <span className="[@media(pointer:coarse)]:hidden">{zoomed ? 'Ziehen zum Verschieben · Doppelklick setzt zurück' : 'Mausrad zum Zoomen'}</span>
        <span className="hidden [@media(pointer:coarse)]:inline">{zoomed ? 'Wischen zum Verschieben · Doppeltippen setzt zurück' : 'Mit zwei Fingern zoomen'}</span>
      </figcaption>
    </figure>
  );
}
