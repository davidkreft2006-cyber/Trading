'use client';
import { useEffect, useRef, type ReactNode } from 'react';
import { X } from '@phosphor-icons/react';
import { LiquidButton } from '@/components/ui/liquid-glass-button';

export default function Modal({ title, description, onClose, children, footer, size = 'md' }: {
  title: string; description?: string; onClose: () => void; children: ReactNode; footer?: ReactNode; size?: 'sm' | 'md';
}) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && closeRef.current();
    window.addEventListener('keydown', k);
    document.body.style.overflow = 'hidden';
    if (!ref.current?.contains(document.activeElement)) ref.current?.focus();
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = ''; prev?.focus?.(); };
  }, []);

  return (
    <div className="fixed inset-0 z-dialog flex items-end justify-center bg-[rgb(8_11_15/0.45)] animate-fade sm:items-center sm:p-4" onClick={onClose}>
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} onClick={e => e.stopPropagation()}
        className={`flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-panel border border-line bg-surface shadow-[0_24px_60px_-20px_rgb(8_11_15/0.45)] outline-none animate-pop sm:rounded-panel ${size === 'sm' ? 'sm:max-w-[420px]' : 'sm:max-w-[460px]'}`}>
        <div className="flex items-start justify-between gap-4 px-5 pb-1 pt-5">
          <div className="flex flex-col gap-1">
            <h2 className="text-[17px] font-semibold tracking-[-0.01em]">{title}</h2>
            {description && <p className="text-[13px] text-muted">{description}</p>}
          </div>
          <LiquidButton type="button" variant="ghost" size="icon" className="-mr-1.5 -mt-1 size-8" onClick={onClose} aria-label="Schließen">
            <X />
          </LiquidButton>
        </div>
        <div className="flex flex-col gap-4 overflow-y-auto px-5 py-4 [&>*]:shrink-0">{children}</div>
        {footer
          ? <div className="flex flex-col-reverse gap-2 border-t border-line bg-subtle/60 px-5 py-3.5 pb-[calc(14px+env(safe-area-inset-bottom))] sm:flex-row sm:justify-end sm:pb-3.5">{footer}</div>
          : <div className="pb-[env(safe-area-inset-bottom)]" />}
      </div>
    </div>
  );
}

export const ModalCancel = ({ onClick }: { onClick: () => void }) => (
  <LiquidButton type="button" variant="glass" size="lg" onClick={onClick}>Abbrechen</LiquidButton>
);
export const ModalSubmit = ({ children, form, onClick, tone = 'primary', disabled }: { children: ReactNode; form?: string; onClick?: () => void; tone?: 'primary' | 'up' | 'down' | 'danger'; disabled?: boolean }) => {
  const variant = ({ primary: 'primary', up: 'buy', down: 'sell', danger: 'destructive' } as const)[tone];
  return <LiquidButton type={form ? 'submit' : 'button'} form={form} onClick={onClick} variant={variant} size="lg" disabled={disabled}>{children}</LiquidButton>;
};
