'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CloudCheck, DeviceMobile, Eye, EyeSlash, LockKey } from '@phosphor-icons/react';
import { useAccount } from '@/lib/AccountContext';

const FACTS = [
  { icon: CloudCheck, t: 'Alles im Konto gespeichert', d: 'Guthaben, Orders und Verlauf liegen sicher in der Datenbank.' },
  { icon: DeviceMobile, t: 'Auf jedem Gerät', d: 'Am Handy anmelden und am Laptop weitermachen.' },
  { icon: LockKey, t: 'Geschützter Zugang', d: 'Passwort verschlüsselt gespeichert, Zurücksetzen per E-Mail-Code.' }
];

/** Nur interne Pfade als Ziel zulassen (kein Open Redirect über ?next=//…) */
export function useNext() {
  const next = useSearchParams().get('next') ?? '/wallet';
  return next.startsWith('/') && !next.startsWith('//') ? next : '/wallet';
}

/** Angemeldete Nutzer direkt weiterleiten */
export function useRedirectIfSignedIn(active = true) {
  const { ready, user } = useAccount();
  const router = useRouter();
  const next = useNext();
  useEffect(() => { if (active && ready && user) router.replace(next); }, [active, ready, user, next, router]);
}

export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="wrap grid gap-10 py-10 md:py-16 lg:grid-cols-[minmax(0,1fr)_440px] lg:items-start lg:gap-16">
      <div className="flex flex-col gap-8 lg:pt-6">
        <div className="flex flex-col gap-3">
          <h1 className="text-4xl font-semibold leading-[1.05] tracking-[-0.035em] md:text-5xl">Willkommen<br /><span className="text-muted">bei Auvryn.</span></h1>
          <p className="max-w-[46ch] text-muted">Märkte, Handel und Wallet mit einem Konto.</p>
        </div>
        <ul className="hidden flex-col divide-y divide-line border-y border-line sm:flex">
          {FACTS.map(({ icon: Icon, t, d }) => (
            <li key={t} className="flex items-start gap-3.5 py-4">
              <Icon className="mt-0.5 h-5 w-5 flex-none text-accent" aria-hidden />
              <div className="flex flex-col gap-0.5"><strong className="text-[15px] font-semibold">{t}</strong><span className="text-sm text-muted">{d}</span></div>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-4">
        <div className="panel relative flex flex-col gap-5 overflow-hidden p-5 sm:p-6">
          {/* Türkiser Schein hinter der Karte, passend zu den Glas-Knöpfen */}
          <span aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-accent/15 blur-3xl" />
          <div className="relative flex flex-col gap-1">
            <h2 className="text-xl font-semibold tracking-[-0.01em]">{title}</h2>
            <p className="text-sm text-muted">{subtitle}</p>
          </div>
          <div className="relative">{children}</div>
        </div>
        {footer && <p className="text-center text-sm text-muted">{footer}</p>}
      </div>
    </div>
  );
}

export function Field({ id, label, error, hint, trailing, ...input }: React.InputHTMLAttributes<HTMLInputElement> & {
  id: string; label: string; error?: string | null; hint?: ReactNode; trailing?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="label">{label}</label>
        {trailing}
      </div>
      <input id={id} className="field h-12 text-base" aria-invalid={!!error} aria-describedby={error || hint ? `${id}-hint` : undefined} {...input} />
      {error
        ? <span id={`${id}-hint`} role="alert" className="text-[13px] font-medium text-down">{error}</span>
        : hint ? <span id={`${id}-hint`} className="hint">{hint}</span> : null}
    </div>
  );
}

export function PasswordField({ id, label, error, hint, trailing, ...input }: React.InputHTMLAttributes<HTMLInputElement> & {
  id: string; label: string; error?: string | null; hint?: ReactNode; trailing?: ReactNode;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="label">{label}</label>
        {trailing}
      </div>
      <div className="relative">
        <input id={id} type={show ? 'text' : 'password'} className="field h-12 pr-12 text-base" aria-invalid={!!error}
          aria-describedby={error || hint ? `${id}-hint` : undefined} {...input} />
        <button type="button" onClick={() => setShow(s => !s)} aria-label={show ? 'Passwort verbergen' : 'Passwort anzeigen'} aria-pressed={show}
          className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-ctl text-faint transition-colors hover:text-accent">
          {show ? <EyeSlash className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
        </button>
      </div>
      {error
        ? <span id={`${id}-hint`} role="alert" className="text-[13px] font-medium text-down">{error}</span>
        : hint ? <span id={`${id}-hint`} className="hint">{hint}</span> : null}
    </div>
  );
}

export function FormError({ children }: { children: ReactNode }) {
  return <p role="alert" className="rounded-ctl border border-down/30 bg-down/10 px-3.5 py-2.5 text-[13px] font-medium text-down">{children}</p>;
}

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
