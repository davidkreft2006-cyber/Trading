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

export function Header() {
  const path = usePathname();
  const router = useRouter();
  const { ready, user, signOut } = useAccount();
  const onLogout = () => { router.push('/'); void signOut(); };

  return (
    <header className="sticky top-0 z-header border-b border-line bg-bg">
      <div className="wrap flex h-14 items-center gap-6 md:h-16">
        <Logo />
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
                <span className="max-w-[9rem] truncate">{user.name}</span>
              </Link>
              <LiquidButton variant="ghost" size="icon" onClick={onLogout} aria-label="Abmelden" title="Abmelden">
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
    <nav aria-label="Hauptnavigation" className="fixed inset-x-0 bottom-0 z-header border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden">
      <div className="grid grid-cols-4">
        {NAV.map(({ href, label, icon: Icon }) => {
          const on = isActive(path, href);
          return (
            <Link key={href} href={href} aria-current={on ? 'page' : undefined}
              className={`flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${on ? 'text-accent' : 'text-faint'}`}>
              <Icon weight={on ? 'fill' : 'regular'} className="h-[22px] w-[22px]" />
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
    <footer className="mt-16 border-t border-line">
      <div className="wrap flex items-center py-8">
        {/* shrink-0 + feste Höhe: das Logo behält sein Seitenverhältnis (584 × 128) */}
        <img src="/brand/auvryn-logo.png" alt="Auvryn" width={110} height={24} className="h-6 w-auto shrink-0 opacity-80" />
      </div>
    </footer>
  );
}
