"use client";

import type { TestimonialItem } from "@/lib/content-types";

function pillLabel(tag: string, role: string, fallback: string): string {
  const t = tag.trim().toUpperCase().replace(/\s+/g, "");
  if (t) return t.slice(0, 12);
  const r = role.trim().toUpperCase().replace(/\s+/g, "");
  if (r) return r.slice(0, 12);
  return fallback;
}

function IconPlay({ className }: { className?: string }) {
  return (
    <svg
      width="44"
      height="44"
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      aria-hidden>
      <circle cx="24" cy="24" r="22" stroke="#ffffff" strokeWidth="1.5" />
      <path d="M20 16v16l12-8-12-8Z" fill="#ffffff" />
    </svg>
  );
}

/** Reference: full-bleed black card, quote + play + pill */
function TestimonialVideoCard({ item }: { item: TestimonialItem }) {
  const quote = (item.quote ?? "").trim() || "—";
  const badge = pillLabel(item.tag ?? "", item.role ?? "", "DEV");

  return (
    <div className="mx-auto flex h-[min(72vw,380px)] w-full max-w-[420px] flex-col overflow-hidden rounded-[24px] bg-black sm:h-[400px] sm:max-w-[440px]">
      <div className="flex min-h-0 flex-1 flex-col justify-end p-7 pb-6 sm:p-8 sm:pb-7">
        <p className="text-[15px] font-bold leading-snug tracking-tight text-white sm:text-[16px]">
          {quote}
        </p>
      </div>
      <div className="flex shrink-0 items-center justify-between gap-4 px-7 pb-7 pt-2 sm:px-8 sm:pb-8">
        <span className="text-white">
          <IconPlay />
        </span>
        <span className="rounded-full bg-white px-4 py-1.5 text-[11px] font-bold uppercase tracking-wide text-black">
          {badge}
        </span>
      </div>
      {item.visible === false ? (
        <p className="border-t border-white/15 px-8 py-2 text-center text-[10px] text-amber-400/95">
          Hidden on the live site
        </p>
      ) : null}
    </div>
  );
}

/** Reference: split light (quote + attribution + pill) | dark (NYRA + INTELLIGENCE) */
function TestimonialTextSplitCard({ item }: { item: TestimonialItem }) {
  const quote = (item.quote ?? "").trim() || "—";
  const name = (item.name ?? "").trim() || "—";
  const nameDisplay = name.toLowerCase();
  const roleDisplay = (item.role ?? "").trim().toLowerCase() || "—";
  const badge = pillLabel(item.tag ?? "", item.role ?? "", "DEVELOPER");

  return (
    <div className="mx-auto grid h-[min(72vw,380px)] w-full max-w-[620px] grid-cols-1 overflow-hidden rounded-[24px] bg-black sm:h-[400px] sm:max-w-[680px] md:grid-cols-2">
      <div className="flex min-h-[280px] flex-col bg-[#f4f4f3] p-7 pb-6 sm:min-h-0 sm:p-8 sm:pb-7">
        <div className="flex min-h-0 flex-1 flex-col justify-center">
          <p className="text-[15px] font-bold leading-snug tracking-tight text-black sm:text-[16px]">
            {quote}
          </p>
        </div>
        <div className="mt-6 flex shrink-0 items-end justify-between gap-4">
          <div>
            <p className="text-[15px] font-bold lowercase tracking-tight text-black">
              {nameDisplay}
            </p>
            <p className="mt-1 text-[13px] font-normal lowercase text-black/75">
              {roleDisplay}
            </p>
          </div>
          <span className="rounded-full bg-black px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-white">
            {badge}
          </span>
        </div>
      </div>
      <div className="flex min-h-[200px] flex-col items-center justify-center bg-[#0a0a0a] px-8 py-10 sm:min-h-0">
        <div className="text-center">
          <div className="inline-flex rounded-full border border-white/90 px-5 py-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
              NYRA
            </span>
          </div>
          <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.42em] text-white/90">
            Intelligence
          </p>
        </div>
      </div>
      {item.visible === false ? (
        <div className="col-span-full border-t border-white/10 bg-black px-4 py-2 text-center text-[10px] text-amber-400/95">
          Hidden on the live site
        </div>
      ) : null}
    </div>
  );
}

export function TestimonialMarketingPreview({ item }: { item: TestimonialItem }) {
  if (item.type === "video") {
    return <TestimonialVideoCard item={item} />;
  }
  return <TestimonialTextSplitCard item={item} />;
}
