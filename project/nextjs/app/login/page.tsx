'use client';
import { Suspense, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight } from '@phosphor-icons/react';
import { useAccount } from '@/lib/AccountContext';
import { LiquidButton } from '@/components/ui/liquid-glass-button';
import { AuthShell, Field, FormError, PasswordField, isEmail, useNext, useRedirectIfSignedIn } from '@/components/AuthShell';

function LoginForm() {
  const { signIn } = useAccount();
  const router = useRouter();
  const next = useNext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useRedirectIfSignedIn(!busy);
  const withNext = (path: string) => (next !== '/wallet' ? `${path}?next=${encodeURIComponent(next)}` : path);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!isEmail(email)) return setErr('Bitte eine gültige E-Mail-Adresse eingeben.');
    if (!password) return setErr('Bitte dein Passwort eingeben.');
    setBusy(true);
    const e2 = await signIn(email, password);
    setBusy(false);
    if (e2) return setErr(e2);
    router.push(next);
  };

  return (
    <AuthShell title="Anmelden" subtitle="Melde dich mit deiner E-Mail und deinem Passwort an."
      footer={<>Noch kein Konto? <Link href={withNext('/register')} className="font-medium text-accent hover:underline">Konto anlegen</Link></>}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <Field id="email" label="E-Mail" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false}
          placeholder="name@beispiel.de" value={email} onChange={e => { setEmail(e.target.value); setErr(null); }} />
        <PasswordField id="password" label="Passwort" autoComplete="current-password" value={password}
          onChange={e => { setPassword(e.target.value); setErr(null); }}
          trailing={<Link href={withNext('/forgot-password')} className="text-[13px] font-medium text-accent hover:underline">Passwort vergessen?</Link>} />
        {err && <FormError>{err}</FormError>}
        <LiquidButton type="submit" variant="primary" size="xl" className="mt-1 w-full" disabled={busy}>
          {busy ? 'Wird angemeldet …' : <>Anmelden<ArrowRight weight="bold" /></>}
        </LiquidButton>
      </form>
    </AuthShell>
  );
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}
