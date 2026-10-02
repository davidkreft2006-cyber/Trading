'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowsLeftRight, ChartLineUp, House, SignOut, Wallet } from '@phosphor-icons/react';
import { useAccount } from '@/lib/AccountContext';
import { LiquidButton } from '@/components/ui/liquid-glass-button';

export function Logo() {
  return (
    <Link href="/" className="flex items-center rounded-ctl py-1" aria-label="Auvryn, zur Startseite">
      {/* Mobil nur das Zeichen, ab sm das volle Logo (Schriftzug für dunklen Grund aufgehellt) */}
      <img src="/brand/auvryn-mark.png" alt="" width={32} height={26} className="h-[26px] w-auto shrink-0 sm:hidden" />
      <img src="/brand/auvryn-logo.png" alt="Auvryn" width={128} height={28} className="hidden h-7 w-auto shrink-0 sm:block" />
    </Link>
  );
}

const NAV = [
  { href: '/', label: 'Start', icon: House },
  { href: '/markets', label: 'Märkte', icon: ChartLineUp },
  { href: '/trade', label: 'Handel', icon: ArrowsLeftRight },
  { href: '/wallet', label: 'Wallet', icon: Wallet }
];
const isActive = (path: string, href: string) => (href === '/' ? path === '/' : path.startsWith(href));
const pageTitle = (path: string) =>
  path.startsWith('/markets') ? 'Märkte' : path.startsWith('/trade') ? 'Handel' : path.startsWith('/wallet') ? 'Wallet'
  : path.startsWith('/settings') ? 'Einstellungen' : '';

export function Header() {
  const path = usePathname();
  const router = useRouter();
  const { ready, user, signOut } = useAccount();
  const onLogout = () => { router.push('/'); void signOut(); };

  return (
    // Als Home-Bildschirm-App reicht der Inhalt unter die Statusleiste (black-translucent): Abstand per safe-area
    <header className="sticky top-0 z-header border-b border-line/70 bg-bg/80 pt-[env(safe-area-inset-top)] backdrop-blur-xl backdrop-saturate-150 md:bg-bg">
      <div className="wrap flex h-12 items-center gap-3 md:h-16 md:gap-6">
        <Logo />
        {/* Handy: Seitentitel wie in einer App */}
        {pageTitle(path) && <span className="truncate text-[17px] font-semibold tracking-[-0.01em] md:hidden">{pageTitle(path)}</span>}
        <nav aria-label="Hauptnavigation" className="hidden h-full items-stretch gap-1 md:flex">
          {NAV.map(n => {
            const on = isActive(path, n.href);
            return (
              <Link key={n.href} href={n.href} aria-current={on ? 'page' : undefined}
                className={`relative flex items-center px-3 text-sm font-medium transition-colors ${on ? 'text-ink' : 'text-muted hover:text-ink'}`}>
                {n.label}
                <span aria-hidden className={`absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-accent transition-opacity ${on ? 'opacity-100' : 'opacity-0'}`} />
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-1.5">
          {!ready ? (
            <span className="skeleton h-9 w-28" aria-hidden />
          ) : user ? (
            <>
              <Link href="/settings" aria-label={`${user.name}: Einstellungen`} aria-current={path.startsWith('/settings') ? 'page' : undefined}
                className={`flex h-9 items-center gap-2 rounded-full pl-1 pr-3 text-sm font-medium transition-colors hover:bg-subtle ${path.startsWith('/settings') ? 'bg-subtle' : ''}`}>
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent ring-1 ring-inset ring-accent/40">{user.name.slice(0, 1).toUpperCase()}</span>
                <span className="hidden max-w-[9rem] truncate sm:inline">{user.name}</span>
              </Link>
              <LiquidButton variant="ghost" size="icon" className="hidden md:inline-flex" onClick={onLogout} aria-label="Abmelden" title="Abmelden">
                <SignOut className="size-[18px]" />
              </LiquidButton>
            </>
          ) : (
            <LiquidButton asChild variant="primary" size="default"><Link href="/login">Anmelden</Link></LiquidButton>
          )}
        </div>
      </div>
    </header>
  );
}

/** Auf dem Smartphone liegt die Navigation unten im Daumenbereich. */
export function MobileTabBar() {
  const path = usePathname();
  return (
    <nav aria-label="Hauptnavigation" className="fixed inset-x-0 bottom-0 z-header select-none border-t border-line/70 bg-surface/80 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl backdrop-saturate-150 md:hidden">
      <div className="grid grid-cols-4 px-2">
        {NAV.map(({ href, label, icon: Icon }) => {
          const on = isActive(path, href);
          return (
            <Link key={href} href={href} aria-current={on ? 'page' : undefined}
              className={`flex h-14 flex-col items-center justify-center gap-1 text-[10.5px] font-medium transition-colors active:scale-95 ${on ? 'text-accent' : 'text-faint'}`}>
              <span className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors ${on ? 'bg-accent/15' : ''}`}>
                <Icon weight={on ? 'fill' : 'regular'} className="h-[22px] w-[22px]" />
              </span>
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function Footer() {
  return (
    // Auf dem Handy (App-Ansicht) ohne Fußzeile
    <footer className="mt-16 hidden border-t border-line md:block">
      <div className="wrap flex items-center py-8">
        {/* shrink-0 + feste Höhe: das Logo behält sein Seitenverhältnis (584 × 128) */}
        <img src="/brand/auvryn-logo.png" alt="Auvryn" width={110} height={24} className="h-6 w-auto shrink-0 opacity-80" />
      </div>
    </footer>
  );
}
