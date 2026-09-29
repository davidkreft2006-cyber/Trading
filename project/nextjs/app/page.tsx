'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, HardDrives, Plus, UserCircle, ArrowsLeftRight } from '@phosphor-icons/react';
import { COINS, coinsIn, fmtPrice, type Category } from '@/lib/data';
import { useDemo } from '@/lib/DemoContext';
import MarketTable from '@/components/MarketTable';
import { Change, CoinIcon, PriceChart, Sparkline } from '@/components/ui/primitives';
import CategoryTabs from '@/components/CategoryTabs';
import { LiquidButton } from '@/components/ui/liquid-glass-button';
import { ShinyButton } from '@/components/ui/shiny-button';

const STEPS = [
  { icon: UserCircle, t: 'Namen wählen', d: 'Kein Passwort, keine E-Mail, keine Telefonnummer. Ein Name reicht.' },
  { icon: Plus, t: 'Guthaben aufladen', d: 'Mit USDT oder Krypto, direkt in der Wallet. Damit kaufst du auch Aktien, ETFs und Gold.' },
  { icon: ArrowsLeftRight, t: 'Handeln', d: 'Kaufen, verkaufen und übertragen. Vor jeder Order siehst du eine Übersicht.' },
  { icon: HardDrives, t: 'Lokal gespeichert', d: 'Guthaben und Verlauf bleiben in deinem Browser und lassen sich jederzeit löschen.' }
];

export default function Home() {
  const { user } = useDemo();
  const [tradfi, setTradfi] = useState<Category>('stock');
  const btc = COINS[0];
  const up = btc.chg >= 0;
  return (
    <>
      <section className="wrap grid items-center gap-10 pb-12 pt-10 md:pt-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-14 lg:pb-16 lg:pt-16">
        <div className="flex flex-col gap-6">
          <h1 className="animate-rise text-[40px] font-semibold leading-[1.02] tracking-[-0.035em] sm:text-5xl lg:text-[60px]">
            Krypto handeln.<br /><span className="text-muted">Ohne Umwege.</span>
          </h1>
          <p className="max-w-[40ch] animate-rise text-[17px] leading-relaxed text-muted [animation-delay:60ms]">
            Märkte, Orders und Wallet auf einer Oberfläche. Anmelden mit einem Namen, ohne Passwort.
          </p>
          <div className="flex animate-rise flex-wrap gap-3 [animation-delay:120ms]">
            <ShinyButton href={user ? '/wallet' : '/login'}>
              {user ? 'Zur Wallet' : 'Loslegen'}<ArrowRight weight="bold" className="size-4" />
            </ShinyButton>
            <LiquidButton asChild variant="glass" size="xl">
              <Link href="/markets">Märkte ansehen</Link>
            </LiquidButton>
          </div>
        </div>

        {/* Echte Komponente statt Screenshot: der BTC-Markt mit Direktlinks in die Handelsansicht */}
        <div className="panel animate-rise p-4 [animation-delay:160ms] sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <CoinIcon sym={btc.sym} />
              <div className="flex flex-col">
                <span className="font-semibold leading-tight">{btc.sym}/USDT</span>
                <span className="text-[13px] text-muted">{btc.name}</span>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className="num text-xl font-semibold">{fmtPrice(btc.price)}</span>
              <Change value={btc.chg} className="text-[13px]" />
            </div>
          </div>
          <PriceChart data={btc.hist} up={up} label="BTC/USDT" />
          <div className="mt-4 grid grid-cols-2 gap-2">
            <LiquidButton asChild variant="buy" size="lg" className="w-full"><Link href="/trade?pair=BTC&side=buy">Kaufen</Link></LiquidButton>
            <LiquidButton asChild variant="sell" size="lg" className="w-full"><Link href="/trade?pair=BTC&side=sell">Verkaufen</Link></LiquidButton>
          </div>
        </div>
      </section>

      <section className="wrap flex flex-col gap-4 py-8">
        <div className="flex items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-2xl font-semibold tracking-[-0.02em]">Krypto</h2>
            <p className="text-sm text-muted">Spot-Paare gegen USDT</p>
          </div>
          <Link href="/markets?cat=crypto" className="flex items-center gap-1 text-[13px] font-medium text-accent hover:underline">
            Alle {coinsIn('crypto').length} Paare<ArrowRight weight="bold" className="h-3.5 w-3.5" />
          </Link>
        </div>
        <MarketTable coins={coinsIn('crypto').slice(0, 5)} />
      </section>

      <section className="wrap flex flex-col gap-4 py-8" aria-labelledby="tradfi-h">
        <div className="flex items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 id="tradfi-h" className="text-2xl font-semibold tracking-[-0.02em]">Aktien, ETFs und Rohstoffe</h2>
            <p className="text-sm text-muted">Mit USDT handeln wie Krypto. Beispielkurse in USD.</p>
          </div>
          <Link href={`/markets?cat=${tradfi}`} className="flex shrink-0 items-center gap-1 text-[13px] font-medium text-accent hover:underline">
            Alle ansehen<ArrowRight weight="bold" className="h-3.5 w-3.5" />
          </Link>
        </div>
        <CategoryTabs value={tradfi} onChange={c => c !== 'all' && setTradfi(c)} withAll={false} only={['stock', 'etf', 'commodity']} />
        <ul className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3">
          {coinsIn(tradfi).map(c => (
            <li key={c.sym}>
              <Link href={`/trade?pair=${c.sym}`} className="panel group flex h-full flex-col gap-3 p-3.5 transition-colors hover:border-line-strong hover:bg-subtle/60 sm:p-4">
                <div className="flex items-center gap-2.5">
                  <CoinIcon sym={c.sym} size="sm" />
                  <div className="flex min-w-0 flex-col">
                    <span className="text-sm font-semibold leading-tight">{c.sym}</span>
                    <span className="truncate text-xs text-muted">{c.name}</span>
                  </div>
                </div>
                <Sparkline data={c.hist} up={c.chg >= 0} className="h-10 w-full" />
                <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                  <span className="num text-[15px] font-medium">{fmtPrice(c.price)} <span className="text-xs text-faint">USD</span></span>
                  <Change value={c.chg} className="text-xs" />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="wrap grid gap-8 py-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-14">
        <div className="flex flex-col gap-3 lg:sticky lg:top-28 lg:self-start">
          <h2 className="text-2xl font-semibold tracking-[-0.02em]">So funktioniert Auvryn</h2>
          <p className="max-w-[46ch] text-muted">Ohne Registrierung und ohne Server. Alles läuft direkt in deinem Browser.</p>
        </div>
        <ol className="grid gap-px overflow-hidden rounded-panel border border-line bg-line sm:grid-cols-2">
          {STEPS.map(({ icon: Icon, t, d }) => (
            <li key={t} className="flex flex-col gap-3 bg-surface p-5 sm:p-6">
              <Icon className="h-6 w-6 text-accent" aria-hidden />
              <div className="flex flex-col gap-1">
                <strong className="font-semibold">{t}</strong>
                <p className="text-sm leading-relaxed text-muted">{d}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
