'use client';
import { Suspense, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, EnvelopeSimple } from '@phosphor-icons/react';
import { useAccount } from '@/lib/AccountContext';
import { LiquidButton } from '@/components/ui/liquid-glass-button';
import { AuthShell, Field, FormError, PasswordField, isEmail, useNext } from '@/components/AuthShell';

/*
  Passwort zurücksetzen in zwei Schritten:
  1. E-Mail eingeben → Neon Auth schickt einen 6-stelligen Code
  2. Code + neues Passwort → Passwort wird gesetzt, danach direkt angemeldet
*/
function ForgotForm() {
  const { requestPasswordCode, resetPassword, toast } = useAccount();
  const router = useRouter();
  const next = useNext();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const sendCode = async (e?: FormEvent) => {
    e?.preventDefault();
    if (busy) return;
    if (!isEmail(email)) return setErr('Bitte eine gültige E-Mail-Adresse eingeben.');
    setBusy(true);
    const e2 = await requestPasswordCode(email);
    setBusy(false);
    if (e2) return setErr(e2);
    setErr(null);
    setStep('code');
    toast('Code gesendet. Schau in dein Postfach.');
  };

  const onReset = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!/^\d{6}$/.test(code.trim())) return setErr('Bitte den 6-stelligen Code aus der E-Mail eingeben.');
    if (password.length < 8) return setErr('Das Passwort muss mindestens 8 Zeichen haben.');
    if (confirm !== password) return setErr('Die Passwörter stimmen nicht überein.');
    setBusy(true);
    const e2 = await resetPassword(email, code, password);
    setBusy(false);
    if (e2) return setErr(e2);
    toast('Passwort geändert');
    router.push(next);
  };

  const loginHref = next !== '/wallet' ? `/login?next=${encodeURIComponent(next)}` : '/login';

  return (
    <AuthShell
      title={step === 'email' ? 'Passwort vergessen?' : 'Neues Passwort festlegen'}
      subtitle={step === 'email' ? 'Wir schicken dir einen Code per E-Mail, mit dem du ein neues Passwort setzt.' : `Gib den Code ein, den wir an ${email.trim()} geschickt haben.`}
      footer={<>Doch wieder eingefallen? <Link href={loginHref} className="font-medium text-accent hover:underline">Zur Anmeldung</Link></>}>
      {step === 'email' ? (
        <form onSubmit={sendCode} noValidate className="flex flex-col gap-4">
          <Field id="email" label="E-Mail" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false}
            placeholder="name@beispiel.de" value={email} onChange={e => { setEmail(e.target.value); setErr(null); }} />
          {err && <FormError>{err}</FormError>}
          <LiquidButton type="submit" variant="primary" size="xl" className="mt-1 w-full" disabled={busy}>
            {busy ? 'Code wird gesendet …' : <><EnvelopeSimple weight="bold" />Code senden</>}
          </LiquidButton>
        </form>
      ) : (
        <form onSubmit={onReset} noValidate className="flex flex-col gap-4">
          <Field id="code" label="Code aus der E-Mail" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="123456"
            className="field num h-12 text-center text-lg tracking-[0.4em]" value={code}
            onChange={e => { setCode(e.target.value.replace(/\D/g, '')); setErr(null); }}
            trailing={<button type="button" onClick={() => sendCode()} disabled={busy} className="text-[13px] font-medium text-accent hover:underline disabled:opacity-50">Neuen Code senden</button>} />
          <PasswordField id="password" label="Neues Passwort" autoComplete="new-password" value={password} hint="Mindestens 8 Zeichen."
            onChange={e => { setPassword(e.target.value); setErr(null); }} />
          <PasswordField id="confirm" label="Neues Passwort wiederholen" autoComplete="new-password" value={confirm}
            onChange={e => { setConfirm(e.target.value); setErr(null); }} />
          {err && <FormError>{err}</FormError>}
          <LiquidButton type="submit" variant="primary" size="xl" className="mt-1 w-full" disabled={busy}>
            {busy ? 'Wird gespeichert …' : <>Passwort speichern<ArrowRight weight="bold" /></>}
          </LiquidButton>
          <button type="button" onClick={() => { setStep('email'); setCode(''); setErr(null); }} className="text-[13px] font-medium text-muted hover:text-ink">
            Andere E-Mail verwenden
          </button>
        </form>
      )}
    </AuthShell>
  );
}

export default function ForgotPasswordPage() {
  return <Suspense><ForgotForm /></Suspense>;
}
