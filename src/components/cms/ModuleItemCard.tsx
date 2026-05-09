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
  onUnpublish,
  onPublish,
  isPublished,
  publishedLabel = "Published",
  unpublishedLabel = "Draft",
  busy,
  viewAriaLabel,
  editAriaLabel,
  deleteAriaLabel,
  unpublishAriaLabel,
  publishAriaLabel,
  onPrimaryClick,
}: {
  title: ReactNode;
  label?: ReactNode;
  children?: ReactNode;
  onView?: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onUnpublish?: () => void;
  onPublish?: () => void;
  isPublished?: boolean;
  publishedLabel?: string;
  unpublishedLabel?: string;
  busy: boolean;
  viewAriaLabel?: string;
  editAriaLabel: string;
  deleteAriaLabel: string;
  unpublishAriaLabel?: string;
  publishAriaLabel?: string;
  onPrimaryClick?: () => void;
}) {
  const showStatus = onPublish !== undefined || onUnpublish !== undefined;
  const published = isPublished !== false;

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
    <article className="neu-panel relative flex min-w-0 flex-col gap-3 rounded-[var(--radius-panel)] border border-solid [border-color:var(--divider-soft)] p-4 shadow-[var(--shadow-button)] sm:gap-3.5 sm:p-5">
      {/* Status dot — top-right corner */}
      {showStatus && (
        <span
          title={published ? publishedLabel : unpublishedLabel}
          className={`absolute right-4 top-4 h-2.5 w-2.5 rounded-full ring-2 ring-[var(--background)] ${
            published ? "bg-emerald-500" : "bg-red-500"
          }`}
          aria-hidden
        />
      )}
      {primary}
      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-solid [border-color:var(--divider-soft)] pt-3">
        <div>
          {showStatus ? (
            published ? (
              <button
                type="button"
                onClick={() => onUnpublish?.()}
                disabled={busy}
                title="Click to unpublish"
                aria-label={unpublishAriaLabel ?? `Unpublish — currently ${publishedLabel}`}
                className="flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-[11px] font-semibold text-emerald-700 transition disabled:opacity-50 hover:bg-emerald-500/25 active:bg-emerald-500/30 dark:text-emerald-400">
                <span aria-hidden className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                {publishedLabel}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onPublish?.()}
                disabled={busy}
                title="Click to publish"
                aria-label={publishAriaLabel ?? `Publish — currently ${unpublishedLabel}`}
                className="flex items-center gap-1.5 rounded-full bg-red-500/10 px-3 py-1 text-[11px] font-semibold text-red-600 transition disabled:opacity-50 hover:bg-red-500/20 active:bg-red-500/25 dark:text-red-400">
                <span aria-hidden className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                {unpublishedLabel}
              </button>
            )
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
      </div>
    </article>
  );
}
