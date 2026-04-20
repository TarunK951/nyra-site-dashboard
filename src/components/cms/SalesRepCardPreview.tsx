"use client";

import type { SalesRep } from "@/lib/content-types";
import {
  normalizeCmsMediaUrl,
  resolveCmsMediaUrl,
} from "@/lib/cms-media-url";
import { useEffect, useMemo, useState } from "react";

const TEAM_TAG = "#nyraaiteam";

function regionsLine(regions: string[] | undefined): string {
  const parts = (regions ?? []).map((x) => x.trim()).filter(Boolean);
  if (parts.length === 0) return "—";
  return parts.join(" · ");
}

function IconPhone({ className }: { className?: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden>
      <path
        d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconMail({ className }: { className?: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden>
      <path
        d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m22 6-10 7L2 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconLinkedIn({ className }: { className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14zM7.119 20.452H3.555V9h3.564v11.452z" />
    </svg>
  );
}

export function SalesRepCardPreview({ rep }: { rep: SalesRep }) {
  const rawImage = typeof rep.image === "string" ? rep.image : "";
  const imageUrl = useMemo(() => resolveCmsMediaUrl(rawImage), [rawImage]);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [imageUrl]);

  const showImage = Boolean(imageUrl) && !imageError;
  const rawLinkedin = (rep.social?.linkedin ?? "").trim();
  const linkedinHref = useMemo(
    () => normalizeCmsMediaUrl(rawLinkedin) ?? "",
    [rawLinkedin],
  );

  const name = (rep.name ?? "").trim() || "—";
  const nameDisplay = name.toLowerCase();
  const designation = (rep.designation ?? "").trim() || "—";
  const phone = (rep.phone ?? "").trim();
  const email = (rep.email ?? "").trim();
  const regionsText = regionsLine(rep.regions);

  return (
    <div className="mx-auto w-full max-w-[640px] overflow-hidden rounded-[20px] border border-solid border-slate-200/95 bg-white shadow-none dark:border-slate-700 dark:bg-zinc-950">
      <div className="flex flex-col sm:flex-row">
        <div className="relative w-full shrink-0 overflow-hidden rounded-t-[20px] bg-slate-100 sm:w-[34%] sm:min-w-[168px] sm:rounded-bl-[20px] sm:rounded-tr-none sm:rounded-tl-[20px]">
          <div className="relative aspect-[4/5] w-full min-h-[200px] sm:aspect-auto sm:min-h-[260px] sm:h-full">
            {showImage ? (
              <img
                key={imageUrl ?? ""}
                src={imageUrl!}
                alt=""
                className="absolute inset-0 h-full w-full object-cover object-top"
                loading="eager"
                decoding="async"
                referrerPolicy="no-referrer"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-200/90 px-4 text-center text-[12px] font-medium text-slate-500">
                {imageUrl && imageError
                  ? "Image could not be loaded"
                  : "No photo"}
              </div>
            )}
          </div>
        </div>

        <div className="relative min-w-0 flex-1 rounded-b-[20px] bg-white sm:rounded-br-[20px] sm:rounded-bl-none sm:rounded-tr-[20px] dark:bg-zinc-950">
          <div
            className="pointer-events-none absolute left-0 top-1/2 z-10 hidden h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-slate-200 bg-white sm:block dark:border-slate-600 dark:bg-zinc-950"
            aria-hidden
          />

          <div className="border-b border-slate-200 px-6 py-6 sm:px-8 sm:py-7 dark:border-slate-800">
            <h2 className="text-[1.5rem] font-bold lowercase leading-tight tracking-tight text-black sm:text-[1.65rem] dark:text-white">
              {nameDisplay}
            </h2>
            <p className="mt-1.5 text-[14px] font-medium text-slate-600 dark:text-zinc-400">
              {designation}
            </p>
            <p className="mt-2 text-[12px] font-normal text-slate-400 dark:text-zinc-500">
              {TEAM_TAG}
            </p>
            {linkedinHref ? (
              <a
                href={linkedinHref}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex rounded-lg border border-slate-300 p-2 text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-900"
                aria-label="LinkedIn profile">
                <IconLinkedIn />
              </a>
            ) : null}
          </div>

          <div className="grid grid-cols-1 divide-y divide-slate-200 sm:grid-cols-2 sm:divide-x sm:divide-y-0 dark:divide-slate-800">
            <div className="space-y-3 px-6 py-5 sm:px-8 sm:py-6">
              {phone ? (
                <div className="flex items-center gap-2.5 text-[13px] text-slate-600 dark:text-zinc-400">
                  <IconPhone className="shrink-0 text-slate-500 dark:text-zinc-500" />
                  <span className="tabular-nums">{phone}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2.5 text-[13px] text-slate-400 dark:text-zinc-500">
                  <IconPhone className="shrink-0" />
                  <span>—</span>
                </div>
              )}
              {email ? (
                <div className="flex items-center gap-2.5 text-[13px] text-slate-600 dark:text-zinc-400">
                  <IconMail className="shrink-0 text-slate-500 dark:text-zinc-500" />
                  <span className="break-all">{email}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2.5 text-[13px] text-slate-400 dark:text-zinc-500">
                  <IconMail className="shrink-0" />
                  <span>—</span>
                </div>
              )}
            </div>
            <div className="px-6 py-5 sm:px-8 sm:py-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-zinc-500">
                Regions
              </p>
              <p className="mt-2 text-[13px] leading-relaxed text-slate-600 dark:text-zinc-400">
                {regionsText}
              </p>
            </div>
          </div>

          {rep.visible === false ? (
            <p className="border-t border-slate-200 px-6 py-2.5 text-center text-[11px] text-amber-700 dark:border-slate-800 dark:text-amber-400/95">
              Hidden on the live site
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
