"use client";

import type { HowItWorksStep } from "@/lib/content-types";

function formatStepNumber(n: number | undefined): string {
  if (typeof n !== "number" || Number.isNaN(n) || n < 0) return "—";
  return String(Math.floor(n)).padStart(2, "0");
}

function IconTarget({ className }: { className?: string }) {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="12" cy="12" r="5.5" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
    </svg>
  );
}

function IconActivity({ className }: { className?: string }) {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden>
      <path
        d="M4 19V5M4 19h16M8 17v-6M12 17V9M16 17v-4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconSparkles({ className }: { className?: string }) {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden>
      <path
        d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StepPreviewGlyph({ iconKey }: { iconKey: string }) {
  const k = iconKey.toLowerCase().replace(/[\s_-]+/g, "");
  if (
    k.includes("sparkle") ||
    k.includes("star") ||
    k.includes("magic") ||
    k === "zap"
  ) {
    return <IconSparkles className="text-[#111827] dark:text-[var(--text-heading)]" />;
  }
  if (
    k.includes("chart") ||
    k.includes("graph") ||
    k.includes("trend") ||
    k.includes("bar") ||
    k.includes("analytics")
  ) {
    return <IconActivity className="text-[#111827] dark:text-[var(--text-heading)]" />;
  }
  /* activity, target, goal, default — reference “how it works” look */
  return <IconTarget className="text-[#111827] dark:text-[var(--text-heading)]" />;
}

export function HowItWorksStepPreview({ step }: { step: HowItWorksStep }) {
  const stepNo = formatStepNumber(step.number);
  const title = (step.title ?? "").trim() || "Step";
  const shortLabel = (step.shortLabel ?? "").trim();
  const description = (step.description ?? "").trim() || "";
  const iconKey = (step.icon ?? "activity").trim();

  return (
    <div
      className="mx-auto w-full max-w-3xl rounded-[32px] p-6 sm:p-8"
      style={{
        backgroundImage:
          "radial-gradient(circle at center, rgba(148, 163, 184, 0.45) 1px, transparent 1px)",
        backgroundSize: "18px 18px",
      }}>
      <div
        className="relative overflow-hidden rounded-[28px] border border-solid border-black/[0.06] bg-white px-7 py-8 shadow-[0_22px_50px_-12px_rgba(0,0,0,0.14)] sm:px-10 sm:py-10 dark:border-white/[0.08] dark:bg-[var(--surface)] dark:shadow-[var(--shadow-elevated)]">
        <div className="relative flex flex-col gap-6 sm:flex-row sm:gap-8">
          <div className="relative flex shrink-0 justify-start sm:block">
            <div
              className="pointer-events-none absolute -left-0.5 -top-2.5 h-3.5 w-3.5 rounded-full border-2 border-solid border-slate-300 bg-transparent dark:border-zinc-500"
              aria-hidden
            />
            <div
              className="relative flex h-[4.25rem] w-[4.25rem] items-center justify-center rounded-2xl border border-solid border-slate-200/90 bg-white shadow-[0_2px_12px_rgba(15,23,42,0.06)] dark:border-zinc-700 dark:bg-zinc-900/80 dark:shadow-none"
              aria-hidden>
              <StepPreviewGlyph iconKey={iconKey} />
            </div>
          </div>
          <div className="min-w-0 flex-1 pt-0 sm:pt-1">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-[13px] font-semibold tabular-nums tracking-wide text-slate-400 dark:text-zinc-500">
                {stepNo}
              </span>
              <h2 className="text-[1.35rem] font-bold leading-tight tracking-tight text-[#111827] sm:text-2xl dark:text-[var(--text-heading)]">
                {title}
              </h2>
            </div>
            {shortLabel ? (
              <p className="mt-2 text-[14px] font-medium text-slate-600 dark:text-[var(--foreground-secondary)]">
                {shortLabel}
              </p>
            ) : null}
            {description ? (
              <p className="mt-5 text-[15px] leading-[1.7] text-[#4b5563] dark:text-[var(--foreground-secondary)]">
                {description}
              </p>
            ) : (
              <p className="mt-5 text-[15px] text-slate-400 dark:text-[var(--text-muted)]">
                No description yet.
              </p>
            )}
            {step.visible === false ? (
              <p className="mt-6 border-t border-solid border-slate-200/80 pt-4 text-[12px] text-amber-800/90 dark:border-zinc-700 dark:text-amber-400/90">
                Hidden on the live site until visibility is turned on.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
