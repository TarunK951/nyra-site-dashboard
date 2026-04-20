"use client";

import type { ReactNode } from "react";
import { RowDeleteButton, RowEditButton } from "@/components/cms/RowActionIcons";
import { ToolbarButton } from "./shared";

export function CmsPreviewField({
  label,
  value,
  monospace,
}: {
  label: string;
  value: ReactNode;
  monospace?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--foreground-secondary)]">
        {label}
      </p>
      <div
        className={`rounded-xl border border-solid [border-color:var(--divider-soft)] bg-[var(--accent-fill)] px-4 py-3 text-[14px] leading-relaxed text-[var(--text-heading)] break-words whitespace-pre-wrap ${
          monospace ? "font-mono text-[13px]" : ""
        }`}>
        {value}
      </div>
    </div>
  );
}

export function ModuleItemCard({
  title,
  label,
  children,
  onView,
  onEdit,
  onDelete,
  busy,
  viewAriaLabel,
  editAriaLabel,
  deleteAriaLabel,
  /** Clicking the header/body (not action buttons) runs this — e.g. open the same preview as View. */
  onPrimaryClick,
}: {
  title: ReactNode;
  /** Small uppercase line above the title (e.g. category, step number). */
  label?: ReactNode;
  children?: ReactNode;
  onView?: () => void;
  onEdit: () => void;
  onDelete: () => void;
  busy: boolean;
  viewAriaLabel?: string;
  editAriaLabel: string;
  deleteAriaLabel: string;
  onPrimaryClick?: () => void;
}) {
  const primary = onPrimaryClick ? (
    <button
      type="button"
      disabled={busy}
      onClick={() => onPrimaryClick()}
      className="-mx-2 -mt-1 min-w-0 cursor-pointer rounded-xl p-2 text-left transition hover:bg-[var(--accent-fill)] disabled:cursor-not-allowed disabled:opacity-50">
      {label ? (
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--foreground-secondary)]">
          {label}
        </p>
      ) : null}
      <h3 className="text-[15px] font-semibold leading-snug text-[var(--text-heading)] line-clamp-2">
        {title}
      </h3>
      {children ? (
        <div className="mt-2 min-h-0 min-w-0 text-[13px] leading-relaxed text-[var(--foreground-secondary)]">
          {children}
        </div>
      ) : null}
    </button>
  ) : (
    <>
      {label ? (
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--foreground-secondary)]">
          {label}
        </p>
      ) : null}
      <h3 className="text-[15px] font-semibold leading-snug text-[var(--text-heading)] line-clamp-2">
        {title}
      </h3>
      {children ? (
        <div className="min-h-0 min-w-0 text-[13px] leading-relaxed text-[var(--foreground-secondary)]">
          {children}
        </div>
      ) : null}
    </>
  );

  return (
    <article className="neu-panel flex min-w-0 flex-col gap-3 rounded-[var(--radius-panel)] border border-solid [border-color:var(--divider-soft)] p-4 shadow-[var(--shadow-button)] sm:gap-3.5 sm:p-5">
      {primary}
      <div className="mt-auto flex flex-wrap items-center justify-end gap-2 border-t border-solid [border-color:var(--divider-soft)] pt-3">
        {onView ? (
          <ToolbarButton
            onClick={onView}
            disabled={busy}
            aria-label={viewAriaLabel ?? "View"}>
            View
          </ToolbarButton>
        ) : null}
        <RowEditButton
          onClick={onEdit}
          disabled={busy}
          ariaLabel={editAriaLabel}
        />
        <RowDeleteButton
          onClick={onDelete}
          disabled={busy}
          ariaLabel={deleteAriaLabel}
        />
      </div>
    </article>
  );
}
