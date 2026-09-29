import Link from 'next/link';
import { LiquidButton } from '@/components/ui/liquid-glass-button';

export default function NotFound() {
  return (
    <div className="wrap flex flex-col items-start gap-4 py-20">
      <span className="num text-sm text-faint">404</span>
      <h1 className="text-3xl font-semibold tracking-[-0.03em]">Diese Seite gibt es nicht.</h1>
      <p className="max-w-[48ch] text-muted">Vielleicht hilft einer dieser Einstiege weiter.</p>
      <div className="flex flex-wrap gap-2">
        <LiquidButton asChild variant="primary" size="lg"><Link href="/">Zur Startseite</Link></LiquidButton>
        <LiquidButton asChild variant="glass" size="lg"><Link href="/markets">Märkte</Link></LiquidButton>
      </div>
    </div>
  );
}
