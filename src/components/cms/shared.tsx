"use client";

import type { ReactNode } from "react";

/** Use `invalid` when the field failed validation (red ring). */
export function inputClass(invalid?: boolean) {
  return `neu-surface-inset w-full rounded-xl px-3 py-2.5 text-[14px] text-[var(--foreground)] outline-none ${
    invalid
      ? "ring-2 ring-[var(--trend-down)]"
      : "ring-[var(--accent)] focus:ring-2"
  }`;
}

export function labelClass() {
  return "mb-1.5 block text-[12px] font-medium text-[var(--foreground-secondary)]";
}

export function Field({
  label,
  children,
  error,
}: {
  label: string;
  children: ReactNode;
  /** Shown under the control; use for validation or field-level API messages. */
  error?: string;
}) {
  return (
    <label className="block">
      <span className={labelClass()}>{label}</span>
      {children}
      {error ? (
        <p className="mt-1 text-[12px] text-[var(--trend-down)]" role="alert">
          {error}
        </p>
      ) : null}
    </label>
  );
}

/** Server-side or form-level message below the modal title area. */
export function FormAlert({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p
      className="rounded-lg border border-[var(--trend-down)] bg-[var(--surface-muted)] px-3 py-2 text-[13px] text-[var(--trend-down)]"
      role="alert">
      {message}
    </p>
  );
}

export function Modal({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cms-modal-title">
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        className="relative z-10 neu-surface max-h-[min(90vh,880px)] w-full max-w-2xl overflow-hidden rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <h3
            id="cms-modal-title"
            className="text-lg font-semibold text-[var(--foreground)]">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-[20px] leading-none text-[var(--foreground-secondary)] transition hover:bg-[var(--accent-fill)]">
            ×
          </button>
        </div>
        <div className="dashboard-scroll max-h-[calc(90vh-5rem)] overflow-y-auto p-5">
          {children}
        </div>
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  busy,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div
        className="neu-surface w-full max-w-md rounded-2xl p-6 shadow-xl"
        role="alertdialog"
        aria-labelledby="confirm-title">
        <h4
          id="confirm-title"
          className="text-base font-semibold text-[var(--foreground)]">
          {title}
        </h4>
        <p className="mt-2 text-[14px] text-[var(--foreground-secondary)]">
          {message}
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-[13px] font-semibold text-[var(--foreground)] transition hover:bg-[var(--accent-fill)] disabled:opacity-50">
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="rounded-lg bg-[var(--trend-down)] px-4 py-2 text-[13px] font-semibold text-white transition hover:opacity-90 disabled:opacity-50">
            {busy ? "…" : confirmLabel ?? "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ToolbarButton({
  children,
  onClick,
  disabled,
  variant = "default",
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: "default" | "primary" | "danger";
}) {
  const cls =
    variant === "primary"
      ? "rounded-lg bg-[var(--accent)] px-3 py-2 text-[12px] font-semibold text-[var(--background)] transition hover:opacity-90 disabled:opacity-40"
      : variant === "danger"
        ? "rounded-lg border border-[var(--border)] px-3 py-2 text-[12px] font-semibold text-[var(--trend-down)] transition hover:bg-[var(--accent-fill)] disabled:opacity-40"
        : "rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-[12px] font-semibold text-[var(--foreground)] transition hover:opacity-90 disabled:opacity-50";
  return (
    <button type="button" className={cls} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}
