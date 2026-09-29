'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useDemo } from '@/lib/DemoContext';

export function DemoBanner() {
  return (
    <div className="sticky top-0 z-[60] flex min-h-9 items-stretch border-b border-[#3a3735] bg-[#201e1d] text-[13px] font-semibold text-[#f3f2f2]">
      <span className="flex items-center bg-accent px-3.5 font-extrabold tracking-[0.08em] text-white">DEMO</span>
      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 px-3.5 py-2">
        <span>DEMO – kein echtes Konto</span>
        <span className="font-normal text-[#c9c5c3]">Kein echtes Geld, keine echten Kryptowährungen. Alle Daten bleiben lokal im Browser.</span>
      </div>
    </div>
  );
}

const NAV = [
  { href: '/', label: 'Start' },
  { href: '/markets', label: 'Märkte' },
  { href: '/trade', label: 'Handel' },
  { href: '/wallet', label: 'Wallet' }
];

export function Header() {
  const path = usePathname();
  const { user, logout, theme, toggleTheme } = useDemo();
  return (
    <header className="border-b-2 border-ink bg-bg">
      <div className="wrap flex min-h-16 flex-wrap items-center gap-x-6">
        <Link href="/" className="flex items-center gap-2.5 py-3 !text-ink">
          <span className="block h-7 w-7 bg-accent" aria-hidden />
          <span className="text-[22px] font-extrabold tracking-tight">KRYO</span>
          <span className="border-2 border-ink px-1.5 text-[11px] font-extrabold tracking-wider">DEMO</span>
        </Link>
        <nav className="order-3 flex basis-full gap-1 overflow-x-auto md:order-none md:basis-auto md:flex-1">
          {NAV.map(n => {
            const active = n.href === '/' ? path === '/' : path.startsWith(n.href);
            return (
              <Link key={n.href} href={n.href}
                className={`whitespace-nowrap border-b-[3px] px-3 pb-[17px] pt-5 text-[15px] font-semibold !text-ink hover:!text-accent ${active ? 'border-accent' : 'border-transparent'}`}>
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={toggleTheme} className="border-2 border-ink px-2.5 py-2 text-[13px] font-semibold hover:bg-surface">
            {theme === 'dark' ? 'Hell' : 'Dunkel'}
          </button>
          {user ? (
            <>
              <Link href="/wallet" className="flex items-center gap-2 bg-surface px-3 py-2.5 text-sm font-semibold !text-ink hover:bg-hover">
                <span className="flex h-[22px] w-[22px] items-center justify-center bg-ink text-xs font-extrabold text-bg">{user[0].toUpperCase()}</span>
                <span className="hidden sm:inline">{user}</span>
              </Link>
              <button onClick={logout} className="btn-outline py-2 text-sm">Abmelden</button>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-outline hidden py-2 text-sm !text-ink hover:!text-bg sm:inline-flex">Anmelden</Link>
              <Link href="/login" className="btn-primary py-2 text-sm !text-white">Demo starten</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="border-t-2 border-ink bg-[#201e1d] text-[#c9c5c3]">
      <div className="wrap flex flex-wrap justify-between gap-3 py-7 text-[13px] leading-normal">
        <span className="font-extrabold text-[#f3f2f2]">KRYO DEMO</span>
        <span className="max-w-[720px]">Fiktive Design-Demo. Kein Finanzdienstleister, keine echten Konten, keine Wallet-Verbindung, keine Zahlungsabwicklung. Alle Kurse sind Beispieldaten.</span>
      </div>
    </footer>
  );
}
