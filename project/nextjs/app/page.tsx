'use client';
import Link from 'next/link';
import { COINS, fmtChg, fmtPrice } from '@/lib/data';
import { useDemo } from '@/lib/DemoContext';
import MarketTable from '@/components/MarketTable';

const STEPS = [
  ['01', 'Demo-Name wählen', 'Kein Passwort, keine E-Mail, keine Telefonnummer.'],
  ['02', 'Demo-Guthaben hinzufügen', 'USDT, BTC, ETH und weitere Demo-Währungen in beliebiger Höhe.'],
  ['03', 'Handel simulieren', 'Kaufen, verkaufen, übertragen – mit fiktiven Beispielkursen.']
];

export default function Home() {
  const { user } = useDemo();
  return (
    <>
      <section className="border-b-2 border-ink">
        <div className="wrap grid lg:grid-cols-2">
          <div className="flex flex-col gap-6 py-10 pr-0 sm:py-16 lg:py-24 lg:pr-8">
            <span className="kicker text-down">KRYPTO-BÖRSE · DESIGN-DEMO</span>
            <h1 className="text-balance text-[clamp(40px,6vw,76px)] font-extrabold leading-[0.98] tracking-[-0.03em]">Handeln üben. Ohne echtes Geld.</h1>
            <p className="max-w-[520px] text-lg leading-relaxed text-muted">
              Melde dich mit einem beliebigen Demo-Namen an, lade Demo-Guthaben auf und simuliere Käufe, Verkäufe und Übertragungen. Alles läuft lokal in deinem Browser.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href={user ? '/wallet' : '/login'} className="btn-primary min-w-[220px] py-4 text-base !text-white">
                <span>{user ? 'Zur Demo-Wallet' : 'Demo-Konto starten'}</span><span>→</span>
              </Link>
              <Link href="/markets" className="btn-outline min-w-[180px] py-3.5 text-base !text-ink hover:!text-bg">
                <span>Märkte ansehen</span><span>→</span>
              </Link>
            </div>
          </div>
          <ol className="grid border-ink lg:border-l-2">
            {STEPS.map(([n, t, d], i) => (
              <li key={n} className={`grid grid-cols-[56px_1fr] gap-4 py-7 lg:px-7 ${i < 2 ? 'border-b-2 border-ink' : ''} ${i === 0 ? 'border-t-2 lg:border-t-0' : ''}`}>
                <span className="text-[32px] font-extrabold leading-none text-accent">{n}</span>
                <div className="flex flex-col gap-1.5"><strong className="text-lg">{t}</strong><span className="text-muted">{d}</span></div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-b-2 border-ink bg-surface">
        <div className="wrap grid grid-cols-2 lg:grid-cols-4">
          {COINS.slice(0, 4).map(c => (
            <Link key={c.sym} href={`/trade?pair=${c.sym}`} className="flex flex-col gap-1.5 border-r-2 border-ink py-5 pl-1 pr-5 !text-ink hover:bg-hover">
              <span className="text-[13px] font-semibold">{c.sym}/USDT</span>
              <span className="text-[22px] font-extrabold tabular-nums">{fmtPrice(c.price)}</span>
              <span className={`text-sm font-semibold ${c.chg >= 0 ? 'text-up' : 'text-down'}`}>{fmtChg(c.chg)}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="wrap flex flex-col gap-5 pb-16 pt-12">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-1.5">
            <h2 className="text-[clamp(28px,3.5vw,40px)] font-extrabold tracking-tight">Marktübersicht</h2>
            <span className="text-sm text-muted">Fiktive Beispielkurse in USDT – keine Live-Daten.</span>
          </div>
          <Link href="/markets" className="border-b-2 border-ink py-1 text-[15px] font-semibold !text-ink hover:border-accent hover:!text-accent">Alle Märkte →</Link>
        </div>
        <MarketTable coins={COINS.slice(0, 6)} />
      </section>
    </>
  );
}
