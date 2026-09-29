'use client';
import Modal, { DemoWarning, ModalCancel, ModalSubmit } from './Modal';

export interface ConfirmRequest {
  title: string;
  label: string;
  lines: { k: string; v: string }[];
  onConfirm: () => void;
}

export default function ConfirmDialog({ req, onClose, onConfirm }: { req: ConfirmRequest; onClose: () => void; onConfirm: () => void }) {
  return (
    <Modal title={req.title} onClose={onClose}
      footer={<><ModalCancel onClick={onClose} /><ModalSubmit onClick={onConfirm}>{req.label}</ModalSubmit></>}>
      <DemoWarning>Es wird kein echtes Geld und keine echte Kryptowährung bewegt. Diese Aktion ändert nur Demo-Daten in deinem Browser.</DemoWarning>
      <dl>
        {req.lines.map(l => (
          <div key={l.k} className="flex justify-between gap-3 border-b border-line py-2.5 text-[15px]">
            <dt className="text-muted">{l.k}</dt><dd className="text-right font-bold tabular-nums">{l.v}</dd>
          </div>
        ))}
      </dl>
    </Modal>
  );
}
