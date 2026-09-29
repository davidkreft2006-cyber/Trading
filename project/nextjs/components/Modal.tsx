'use client';
import { useEffect, type ReactNode } from 'react';

export function DemoWarning({ children }: { children: ReactNode }) {
  return <div className="bg-accent px-3.5 py-3 text-sm font-semibold leading-snug text-white">{children}</div>;
}

export default function Modal({ title, onClose, children, footer }: {
  title: string; onClose: () => void; children: ReactNode; footer: ReactNode;
}) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#201e1d]/55 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} onClick={e => e.stopPropagation()}
        className="flex w-full max-w-[480px] flex-col border-2 border-ink bg-bg shadow-[0_24px_48px_rgba(32,30,29,0.25)]">
        <div className="flex items-center justify-between border-b-2 border-ink px-5 py-4">
          <strong className="text-xl">{title}</strong>
          <button onClick={onClose} aria-label="Schließen" className="px-1 text-2xl leading-none">×</button>
        </div>
        <div className="flex flex-col gap-4 p-5">{children}</div>
        <div className="grid grid-cols-2 border-t-2 border-ink">{footer}</div>
      </div>
    </div>
  );
}

export const ModalCancel = ({ onClick }: { onClick: () => void }) => (
  <button type="button" onClick={onClick} className="border-r-2 border-ink px-5 py-4 text-left text-[15px] font-semibold hover:bg-surface">Abbrechen</button>
);
export const ModalSubmit = ({ children, form, onClick }: { children: ReactNode; form?: string; onClick?: () => void }) => (
  <button type={form ? 'submit' : 'button'} form={form} onClick={onClick} className="bg-accent px-5 py-4 text-left text-[15px] font-semibold text-white hover:bg-accent-dark">{children}</button>
);
