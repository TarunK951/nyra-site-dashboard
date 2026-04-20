"use client";

import type { ReactNode } from "react";

/** Use `invalid` when the field failed validation (red ring). */
export function inputClass(invalid?: boolean) {
  const base =
    "neu-surface-inset w-full rounded-[var(--radius-input)] px-4 py-3 text-[14px] text-[var(--text-heading)] outline-none";
  if (invalid) {
    return `${base} ring-2 ring-[var(--trend-down)] focus-visible:ring-2 focus-visible:ring-[var(--trend-down)]`;
  }
  return `${base} neu-input-focus`;
}

export function labelClass() {
  return "mb-2 block text-[12px] font-medium text-[var(--foreground-secondary)]";
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
        <p className="mt-1.5 text-[12px] text-[var(--trend-down)]" role="alert">
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
      className="rounded-[var(--radius-panel)] bg-[color-mix(in_srgb,var(--trend-down)_8%,var(--surface))] px-4 py-3 text-[13px] leading-relaxed text-[var(--trend-down)]"
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
  size = "default",
  layout = "default",
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  /** Wider dialog for read-only previews (e.g. CMS item preview). */
  size?: "default" | "wide" | "xl" | "2xl";
  /** `plain`: no title bar — content only (e.g. marketing card preview). Still has backdrop + close. */
  layout?: "default" | "plain";
}) {
  if (!open) return null;
  const maxWClass =
    size === "2xl"
      ? "max-w-6xl"
      : size === "xl"
        ? "max-w-4xl"
        : size === "wide"
          ? "max-w-3xl"
          : "max-w-2xl";

  if (layout === "plain") {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-label={title}>
        <button
          type="button"
          className="absolute inset-0 bg-[color-mix(in_srgb,var(--foreground)_12%,transparent)]"
          aria-label="Close dialog"
          onClick={onClose}
        />
        <div
          className={`relative z-10 max-h-[min(92vh,900px)] w-full ${maxWClass}`}>
          <button
            type="button"
            onClick={onClose}
            className="absolute -right-1 -top-1 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-solid border-black/[0.08] bg-white text-[22px] leading-none text-[var(--text-muted)] shadow-md transition hover:bg-slate-50 dark:border-white/[0.1] dark:bg-zinc-900 dark:hover:bg-zinc-800 sm:right-0 sm:top-0">
            ×
          </button>
          <div className="dashboard-scroll max-h-[min(88vh,860px)] overflow-y-auto px-1 pb-2 pt-10 sm:px-2 sm:pb-4 sm:pt-12">
            {children}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cms-modal-title">
      <button
        type="button"
        className="absolute inset-0 bg-[color-mix(in_srgb,var(--foreground)_10%,transparent)]"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        className={`relative z-10 max-h-[min(90vh,880px)] w-full ${maxWClass} overflow-hidden rounded-[var(--radius-panel)] bg-[var(--surface)] shadow-none`}>
        <div className="flex items-center justify-between border-b border-solid [border-color:var(--divider-soft)] px-6 py-5 sm:px-8">
          <h3
            id="cms-modal-title"
            className="text-lg font-semibold leading-snug tracking-tight text-[var(--text-heading)]">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-button)] bg-[var(--background)] text-[22px] leading-none text-[var(--text-muted)] shadow-none">
            ×
          </button>
        </div>
        <div className="dashboard-scroll max-h-[calc(90vh-5rem)] overflow-y-auto p-6 sm:p-8">
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[color-mix(in_srgb,var(--foreground)_12%,transparent)] p-4 sm:p-6">
      <div
        className="w-full max-w-md rounded-[var(--radius-panel)] bg-[var(--surface)] p-7 shadow-none sm:p-8"
        role="alertdialog"
        aria-labelledby="confirm-title">
        <h4
          id="confirm-title"
          className="text-base font-semibold text-[var(--text-heading)]">
          {title}
        </h4>
        <p className="mt-4 text-[14px] leading-[1.65] text-[var(--foreground-secondary)]">
          {message}
        </p>
        <div className="mt-8 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-[var(--radius-button)] bg-[var(--background)] px-6 py-2.5 text-[13px] font-semibold text-[var(--text-heading)] shadow-none transition hover:opacity-90 disabled:opacity-50">
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="rounded-[var(--radius-button)] bg-[color-mix(in_srgb,var(--trend-down)_12%,var(--surface))] px-6 py-2.5 text-[13px] font-semibold text-[var(--trend-down)] shadow-none transition hover:opacity-90 active:opacity-80 disabled:opacity-50">
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
  "aria-label": ariaLabel,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: "default" | "primary" | "danger";
  "aria-label"?: string;
}) {
  const cls =
    variant === "primary"
      ? "neu-btn-primary px-5 py-2.5 text-[13px] disabled:opacity-40"
      : variant === "danger"
        ? "rounded-[var(--radius-button)] bg-[color-mix(in_srgb,var(--trend-down)_10%,var(--surface))] px-4 py-2.5 text-[12px] font-semibold text-[var(--trend-down)] shadow-[var(--shadow-button)] transition hover:opacity-90 active:shadow-[var(--shadow-inset-press)] disabled:opacity-40"
        : "neu-btn-default px-4 py-2.5 text-[13px] disabled:opacity-50";
  return (
    <button
      type="button"
      className={cls}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}>
      {children}
    </button>
  );
}
