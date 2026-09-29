'use client';
import Modal, { ModalCancel, ModalSubmit } from './Modal';

export interface ConfirmRequest {
  title: string;
  label: string;
  lines: { k: string; v: string; strong?: boolean }[];
  tone?: 'primary' | 'up' | 'down' | 'danger';
  onConfirm: () => void;
}

export default function ConfirmDialog({ req, onClose, onConfirm }: { req: ConfirmRequest; onClose: () => void; onConfirm: () => void }) {
  return (
    <Modal title={req.title} onClose={onClose} size="sm"
      footer={<><ModalCancel onClick={onClose} /><ModalSubmit tone={req.tone} onClick={onConfirm}>{req.label}</ModalSubmit></>}>
      <dl className="flex flex-col divide-y divide-line rounded-ctl border border-line">
        {req.lines.map(l => (
          <div key={l.k} className="flex items-baseline justify-between gap-4 px-3.5 py-2.5 text-sm">
            <dt className="text-muted">{l.k}</dt>
            <dd className={`num text-right ${l.strong ? 'font-semibold text-ink' : 'text-ink'}`}>{l.v}</dd>
          </div>
        ))}
      </dl>
    </Modal>
  );
}
