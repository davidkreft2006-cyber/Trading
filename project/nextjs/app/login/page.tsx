'use client';
import { useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useDemo } from '@/lib/DemoContext';

function LoginForm() {
  const { login, profileNames } = useDemo();
  const router = useRouter();
  const next = useSearchParams().get('next') ?? '/wallet';
  const [name, setName] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const doLogin = (n: string) => {
    const e = login(n);
    if (e) return setErr(e);
    router.push(next.startsWith('/') ? next : '/wallet');
  };
  const onSubmit = (e: FormEvent) => { e.preventDefault(); doLogin(name); };

  return (
    <section className="border-b-2 border-ink">
      <div className="mx-auto grid max-w-[1280px] lg:grid-cols-2">
        <div className="flex min-h-[240px] flex-col justify-between gap-10 bg-accent px-5 py-10 text-white sm:px-12 sm:py-16 lg:min-h-[560px]">
          <span className="kicker">KRYO · DEMO-ZUGANG</span>
          <h1 className="text-[clamp(40px,6vw,80px)] font-extrabold leading-[0.95] tracking-[-0.03em]">Nur ein Name. Sonst nichts.</h1>
          <p className="max-w-[420px] leading-relaxed">Diese Anmeldung ist eine Simulation. Es gibt kein Konto auf einem Server und keine Verbindung zu einer echten Börse.</p>
        </div>
        <div className="flex max-w-[560px] flex-col gap-7 px-5 py-10 sm:px-12 sm:py-16">
          <div className="flex flex-col gap-2">
            <h2 className="text-[32px] font-extrabold tracking-tight">Anmelden</h2>
            <span className="text-[15px] text-muted">Wähle einen frei erfundenen Demo-Namen.</span>
          </div>
          <form onSubmit={onSubmit} className="flex flex-col gap-4" autoComplete="off">
            <label className="flex flex-col gap-2">
              <span className="label">DEMO-NAME</span>
              <input className="input h-[52px]" value={name} maxLength={24} placeholder="z. B. Satoshi Demo"
                onChange={e => { setName(e.target.value); setErr(null); }} />
            </label>
            {err && <p className="text-sm font-semibold text-down">{err}</p>}
            <p className="bg-surface px-4 py-3.5 text-sm leading-relaxed text-muted">
              Kein Passwort, keine E-Mail, keine Telefonnummer, kein Bestätigungscode. Der Name wird nur in diesem Browser gespeichert.
            </p>
            <button type="submit" className="btn-primary h-[52px] text-base"><span>Demo starten</span><span>→</span></button>
          </form>
          {profileNames.length > 0 && (
            <div className="flex flex-col gap-2.5">
              <span className="label text-muted">GESPEICHERTE DEMO-PROFILE</span>
              <div className="flex flex-wrap gap-2">
                {profileNames.map(n => <button key={n} onClick={() => doLogin(n)} className="btn-outline py-1.5 text-sm">{n}</button>)}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}
