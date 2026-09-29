'use client';
import { Suspense, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight } from '@phosphor-icons/react';
import { useAccount } from '@/lib/AccountContext';
import { LiquidButton } from '@/components/ui/liquid-glass-button';
import { AuthShell, Field, FormError, PasswordField, isEmail, useNext, useRedirectIfSignedIn } from '@/components/AuthShell';

type Errors = Partial<Record<'name' | 'email' | 'password' | 'confirm' | 'form', string>>;

function RegisterForm() {
  const { signUp } = useAccount();
  const router = useRouter();
  const next = useNext();
  const [f, setF] = useState({ name: '', email: '', password: '', confirm: '' });
  const [errs, setErrs] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  useRedirectIfSignedIn(!busy);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setF(s => ({ ...s, [k]: e.target.value }));
    setErrs(s => ({ ...s, [k]: undefined, form: undefined }));
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const v: Errors = {};
    if (f.name.trim().length < 2) v.name = 'Bitte mindestens 2 Zeichen eingeben.';
    if (!isEmail(f.email)) v.email = 'Bitte eine gültige E-Mail-Adresse eingeben.';
    if (f.password.length < 8) v.password = 'Das Passwort muss mindestens 8 Zeichen haben.';
    else if (f.confirm !== f.password) v.confirm = 'Die Passwörter stimmen nicht überein.';
    if (Object.keys(v).length) return setErrs(v);
    setBusy(true);
    const e2 = await signUp(f.name, f.email, f.password);
    setBusy(false);
    if (e2) return setErrs({ form: e2 });
    router.push(next);
  };

  return (
    <AuthShell title="Konto anlegen" subtitle="Dauert keine Minute. Danach bist du direkt angemeldet."
      footer={<>Schon ein Konto? <Link href={next !== '/wallet' ? `/login?next=${encodeURIComponent(next)}` : '/login'} className="font-medium text-accent hover:underline">Anmelden</Link></>}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <Field id="name" label="Name" autoComplete="name" autoCapitalize="words" maxLength={40} placeholder="z. B. Lea Hoffmann"
          value={f.name} onChange={set('name')} error={errs.name} />
        <Field id="email" label="E-Mail" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false}
          placeholder="name@beispiel.de" value={f.email} onChange={set('email')} error={errs.email} />
        <PasswordField id="password" label="Passwort" autoComplete="new-password" value={f.password} onChange={set('password')}
          error={errs.password} hint="Mindestens 8 Zeichen." />
        <PasswordField id="confirm" label="Passwort wiederholen" autoComplete="new-password" value={f.confirm} onChange={set('confirm')}
          error={errs.confirm} />
        {errs.form && <FormError>{errs.form}</FormError>}
        <LiquidButton type="submit" variant="primary" size="xl" className="mt-1 w-full" disabled={busy}>
          {busy ? 'Konto wird angelegt …' : <>Konto anlegen<ArrowRight weight="bold" /></>}
        </LiquidButton>
      </form>
    </AuthShell>
  );
}

export default function RegisterPage() {
  return <Suspense><RegisterForm /></Suspense>;
}
