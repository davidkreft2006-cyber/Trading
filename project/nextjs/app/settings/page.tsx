'use client';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { SignOut, Trash } from '@phosphor-icons/react';
import { ASSETS } from '@/lib/data';
import { useAccount } from '@/lib/AccountContext';
import { LiquidButton } from '@/components/ui/liquid-glass-button';
import { Field, FormError, PasswordField } from '@/components/AuthShell';

function Section({ title, desc, children, danger }: { title: string; desc: string; children: ReactNode; danger?: boolean }) {
  return (
    <section className={`panel grid gap-5 p-5 sm:p-6 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] md:gap-10 ${danger ? 'border-down/30' : ''}`}>
      <div className="flex flex-col gap-1">
        <h2 className={`text-[15px] font-semibold ${danger ? 'text-down' : ''}`}>{title}</h2>
        <p className="text-sm text-muted">{desc}</p>
      </div>
      <div className="flex min-w-0 flex-col gap-4">{children}</div>
    </section>
  );
}

function ProfileForm() {
  const { user, updateName } = useAccount();
  const [name, setName] = useState(user?.name ?? '');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const changed = name.trim() !== user?.name;
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy || !changed) return;
    if (name.trim().length < 2) return setErr('Bitte mindestens 2 Zeichen eingeben.');
    setBusy(true);
    const e2 = await updateName(name);
    setBusy(false);
    setErr(e2);
  };
  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <Field id="name" label="Name" autoComplete="name" maxLength={40} value={name} error={err}
        onChange={e => { setName(e.target.value); setErr(null); }} />
      <Field id="email" label="E-Mail" value={user?.email ?? ''} readOnly disabled hint="Die E-Mail-Adresse kann nicht geändert werden." />
      <LiquidButton type="submit" variant="primary" size="lg" className="self-start" disabled={busy || !changed}>
        {busy ? 'Wird gespeichert …' : 'Name speichern'}
      </LiquidButton>
    </form>
  );
}

function PasswordForm() {
  const { changePassword } = useAccount();
  const [f, setF] = useState({ current: '', next: '', confirm: '' });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => { setF(s => ({ ...s, [k]: e.target.value })); setErr(null); };
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!f.current) return setErr('Bitte dein aktuelles Passwort eingeben.');
    if (f.next.length < 8) return setErr('Das neue Passwort muss mindestens 8 Zeichen haben.');
    if (f.next !== f.confirm) return setErr('Die neuen Passwörter stimmen nicht überein.');
    setBusy(true);
    const e2 = await changePassword(f.current, f.next);
    setBusy(false);
    if (e2) return setErr(e2);
    setF({ current: '', next: '', confirm: '' });
  };
  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <PasswordField id="current" label="Aktuelles Passwort" autoComplete="current-password" value={f.current} onChange={set('current')} />
      <PasswordField id="new" label="Neues Passwort" autoComplete="new-password" value={f.next} onChange={set('next')} hint="Mindestens 8 Zeichen." />
      <PasswordField id="confirm" label="Neues Passwort wiederholen" autoComplete="new-password" value={f.confirm} onChange={set('confirm')} />
      {err && <FormError>{err}</FormError>}
      <LiquidButton type="submit" variant="primary" size="lg" className="self-start" disabled={busy}>
        {busy ? 'Wird geändert …' : 'Passwort ändern'}
      </LiquidButton>
    </form>
  );
}

export default function SettingsPage() {
  const { ready, user, balances, txs, signOut, resetAll, confirm } = useAccount();
  const router = useRouter();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (ready && !user) router.replace('/login?next=/settings'); }, [ready]);
  if (!ready || !user) {
    return (
      <div className="wrap flex flex-col gap-5 pt-8" aria-busy="true" aria-label="Einstellungen werden geladen">
        {[0, 1, 2].map(i => <div key={i} className="panel flex flex-col gap-3 p-6"><span className="skeleton h-4 w-40" /><span className="skeleton h-10" /></div>)}
      </div>
    );
  }

  const positions = ASSETS.filter(a => balances[a] > 0).length;
  const askReset = () => confirm({
    title: 'Guthaben und Verlauf löschen?', label: 'Endgültig löschen', tone: 'danger',
    lines: [{ k: 'Positionen', v: String(positions) }, { k: 'Transaktionen', v: String(txs.length) }, { k: 'Konto', v: user.email }],
    onConfirm: () => { void resetAll(); }
  });

  return (
    <div className="wrap flex flex-col gap-5 pt-6 md:pt-8">
      <div className="flex items-center gap-4">
        <span className="flex h-14 w-14 flex-none items-center justify-center rounded-full bg-accent/15 text-xl font-semibold text-accent ring-1 ring-inset ring-accent/40">
          {user.name.slice(0, 1).toUpperCase()}
        </span>
        <div className="flex min-w-0 flex-col">
          <h1 className="truncate text-2xl font-semibold tracking-[-0.02em] md:text-3xl">Einstellungen</h1>
          <span className="truncate text-sm text-muted">{user.email}</span>
        </div>
      </div>

      <Section title="Profil" desc="So wirst du in der App angezeigt.">
        <ProfileForm key={user.name} />
      </Section>

      <Section title="Passwort" desc="Nach dem Ändern werden andere Geräte abgemeldet.">
        <PasswordForm />
      </Section>

      <Section title="Sitzung" desc="Auf diesem Gerät abmelden. Deine Daten bleiben im Konto gespeichert.">
        <LiquidButton variant="glass" size="lg" className="self-start" onClick={() => { router.push('/'); void signOut(); }}>
          <SignOut />Abmelden
        </LiquidButton>
      </Section>

      <Section danger title="Guthaben zurücksetzen" desc="Löscht alle Guthaben und Transaktionen in deinem Konto. Das Konto selbst bleibt bestehen.">
        <LiquidButton variant="destructive" size="lg" className="self-start" onClick={askReset}>
          <Trash />Guthaben zurücksetzen
        </LiquidButton>
      </Section>
    </div>
  );
}
