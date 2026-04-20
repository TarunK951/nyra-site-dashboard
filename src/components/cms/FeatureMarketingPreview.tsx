"use client";

import type { FeatureItem } from "@/lib/content-types";
import { resolveCmsMediaUrl } from "@/lib/cms-media-url";
import { useEffect, useMemo, useState } from "react";

function IconSparkles({ className }: { className?: string }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden>
      <path
        d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 3v4M19 17v4M3 5h4M17 19h4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconChart({ className }: { className?: string }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden>
      <path
        d="M4 19V5M4 19h16M8 15v-4M12 15V9M16 15v-6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconUsers({ className }: { className?: string }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden>
      <path
        d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FeaturePreviewGlyph({ iconKey }: { iconKey: string }) {
  const k = iconKey.toLowerCase().replace(/[\s_-]+/g, "");
  if (
    k.includes("user") ||
    k === "users" ||
    k.includes("team") ||
    k.includes("people")
  ) {
    return <IconUsers className="text-white" />;
  }
  if (
    k.includes("chart") ||
    k.includes("analytics") ||
    k.includes("graph") ||
    k.includes("trend") ||
    k === "activity" ||
    k.includes("line")
  ) {
    return <IconChart className="text-white" />;
  }
  return <IconSparkles className="text-white" />;
}

export function FeatureMarketingPreview({ item }: { item: FeatureItem }) {
  const rawImage = typeof item.image === "string" ? item.image : "";
  const imageUrl = useMemo(() => resolveCmsMediaUrl(rawImage), [rawImage]);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [imageUrl]);

  const title = (item.title ?? "").trim() || "Feature";
  const description = (item.description ?? "").trim() || "";
  const iconKey = (item.icon ?? "sparkles").trim();
  const wide = typeof item.colSpan === "number" && item.colSpan >= 2;

  const showImage = Boolean(imageUrl) && !imageFailed;

  return (
    <div
      className={`mx-auto w-full ${wide ? "max-w-4xl" : "max-w-md"}`}>
      <div
        className="overflow-hidden rounded-[28px] border border-solid border-black/[0.06] bg-white shadow-[0_22px_50px_-12px_rgba(0,0,0,0.18)] dark:border-white/[0.08] dark:bg-[var(--surface)] dark:shadow-[var(--shadow-elevated)]">
        <div
          className={
            wide
              ? "relative aspect-[21/9] min-h-[140px] w-full max-h-[min(40vh,320px)] bg-gradient-to-br from-slate-200 via-slate-100 to-slate-300 dark:from-zinc-800 dark:via-zinc-900 dark:to-zinc-800"
              : "relative aspect-video w-full max-h-[min(38vh,280px)] bg-gradient-to-br from-slate-200 via-slate-100 to-slate-300 dark:from-zinc-800 dark:via-zinc-900 dark:to-zinc-800"
          }>
          {showImage ? (
            <img
              src={imageUrl!}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              loading="eager"
              decoding="async"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
              <p className="text-[13px] font-medium text-slate-500/90 dark:text-zinc-400">
                {imageUrl && imageFailed
                  ? "This image could not be loaded."
                  : "No hero image — add a full image URL in the editor."}
              </p>
              {imageUrl && imageFailed ? (
                <p className="max-w-full break-all font-mono text-[11px] leading-snug text-slate-400 dark:text-zinc-500">
                  Tried: {imageUrl}
                </p>
              ) : null}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-5 px-6 py-6 sm:flex-row sm:items-start sm:gap-6 sm:px-8 sm:py-8">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[10px] bg-[#111827] shadow-sm dark:bg-zinc-950"
            aria-hidden>
            <FeaturePreviewGlyph iconKey={iconKey} />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-xl font-bold leading-snug tracking-tight text-[#111827] dark:text-[var(--text-heading)] sm:text-2xl">
              {title}
            </h4>
            {description ? (
              <p className="mt-3 text-[15px] leading-relaxed text-[#6b7280] dark:text-[var(--foreground-secondary)]">
                {description}
              </p>
            ) : (
              <p className="mt-3 text-[15px] text-[#9ca3af] dark:text-[var(--text-muted)]">
                No description yet.
              </p>
            )}
          </div>
        </div>
        {item.visible === false ? (
          <p className="border-t border-solid border-black/[0.05] px-8 py-3 text-center text-[12px] text-amber-700/90 dark:border-white/[0.06] dark:text-amber-400/90">
            Hidden on the live site until visibility is turned on.
          </p>
        ) : null}
      </div>
    </div>
  );
}
