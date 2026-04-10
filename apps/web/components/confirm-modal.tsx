"use client";

import type { ReactNode } from "react";

type ConfirmModalProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  /** Acima de outros `.modal-backdrop` (padrão: true — evita cliques “mortos” com dois modais). */
  elevated?: boolean;
  /** Erro da última ação (visível no próprio diálogo). */
  error?: string | null;
  busy?: boolean;
  busyLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
};

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  danger = false,
  elevated = true,
  error = null,
  busy = false,
  busyLabel = "Aguarde…",
  onConfirm,
  onCancel,
  children
}: ConfirmModalProps) {
  if (!open) return null;

  const backdropClass = elevated
    ? "modal-backdrop modal-backdrop-layer-confirm"
    : "modal-backdrop";

  return (
    <div className={backdropClass} role="presentation">
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <h3>{title}</h3>
        <p className="muted">{message}</p>
        {children}
        {error ? <p className="error">{error}</p> : null}
        <div className="row" style={{ justifyContent: "flex-end" }}>
          <button type="button" className="secondary" disabled={busy} onClick={onCancel}>
            {cancelLabel}
          </button>
          <button type="button" className={danger ? "danger" : ""} disabled={busy} onClick={onConfirm}>
            {busy ? busyLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
