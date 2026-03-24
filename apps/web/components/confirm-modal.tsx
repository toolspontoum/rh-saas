"use client";

import type { ReactNode } from "react";

type ConfirmModalProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
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
  onConfirm,
  onCancel,
  children
}: ConfirmModalProps) {
  if (!open) return null;

  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal-card" role="dialog" aria-modal="true" aria-label={title}>
        <h3>{title}</h3>
        <p className="muted">{message}</p>
        {children}
        <div className="row" style={{ justifyContent: "flex-end" }}>
          <button className="secondary" onClick={onCancel}>{cancelLabel}</button>
          <button className={danger ? "danger" : ""} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
