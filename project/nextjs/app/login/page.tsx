'use client';
import { Suspense, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, CaretRight, EnvelopeSimple, HardDrives, Password } from '@phosphor-icons/react';
import { useDemo } from '@/lib/DemoContext';
import { ShinyButton } from '@/components/ui/shiny-button';

const FACTS = [
  { icon: Password, t: 'Kein Passwort', d: 'Es gibt nichts, was geschützt werden müsste.' },
  { icon: EnvelopeSimple, t: 'Keine E-Mail, keine Telefonnummer', d: 'Auch keine Bestätigungscodes oder Wallet-Verbindung.' },
  { icon: HardDrives, t: 'Nur in diesem Browser', d: 'Profil und Guthaben liegen im localStorage.' }
];

function LoginForm() {
  const { ready, login, profileNames } = useDemo();
  const router = useRouter();
  const next = useSearchParams().get('next') ?? '/wallet';
  const [name, setName] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const doLogin = (n: string) => {
    const e = login(n);
    if (e) return setErr(e);
    setName('');
    // Nur interne Pfade zulassen (kein Open Redirect über ?next=//…)
    router.push(next.startsWith('/') && !next.startsWith('//') ? next : '/wallet');
  };
  const onSubmit = (e: FormEvent) => { e.preventDefault(); doLogin(name); };

  return (
    <div className="wrap grid gap-10 py-10 md:py-16 lg:grid-cols-[minmax(0,1fr)_440px] lg:items-start lg:gap-16">
      <div className="flex flex-col gap-8 lg:pt-6">
        <div className="flex flex-col gap-3">
          <h1 className="text-4xl font-semibold leading-[1.05] tracking-[-0.035em] md:text-5xl">Willkommen<br /><span className="text-muted">bei Auvryn.</span></h1>
          <p className="max-w-[46ch] text-muted">Melde dich mit einem Namen an. Ein Passwort brauchst du nicht.</p>
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
        <form onSubmit={onSubmit} noValidate className="panel flex flex-col gap-5 p-5 sm:p-6">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-semibold tracking-[-0.01em]">Anmelden</h2>
            <p className="text-sm text-muted">Gib deinen Namen ein, um fortzufahren.</p>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="demo-name" className="label">Name</label>
            <input id="demo-name" className="field h-12 text-base" value={name} maxLength={24} autoComplete="off" autoCapitalize="words" spellCheck={false}
              placeholder="z. B. Lea Hoffmann" aria-invalid={!!err} aria-describedby="demo-name-hint"
              onChange={e => { setName(e.target.value); setErr(null); }} />
            {err
              ? <span id="demo-name-hint" role="alert" className="text-[13px] font-medium text-down">{err}</span>
              : <span id="demo-name-hint" className="hint">2 bis 24 Zeichen: Buchstaben, Zahlen, Leerzeichen, Punkt, Bindestrich, Unterstrich.</span>}
          </div>
          <ShinyButton type="submit" className="w-full">Weiter<ArrowRight weight="bold" className="size-4" /></ShinyButton>
          <p className="hint sm:hidden">Kein Passwort, keine E-Mail, keine Telefonnummer. Alles bleibt in diesem Browser.</p>
        </form>

        {ready && profileNames.length > 0 && (
          <div className="panel overflow-hidden">
            <div className="border-b border-line px-5 py-3 text-[13px] font-medium text-muted">Gespeicherte Profile</div>
            <ul className="divide-y divide-line">
              {profileNames.map(n => (
                <li key={n}>
                  <button onClick={() => doLogin(n)} className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-subtle">
                    <span className="flex h-8 w-8 flex-none items-center justify-center rounded-tag bg-accent-soft text-xs font-semibold text-accent">{n.slice(0, 1).toUpperCase()}</span>
                    <span className="flex-1 truncate font-medium">{n}</span>
                    <CaretRight className="h-4 w-4 text-faint" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}
