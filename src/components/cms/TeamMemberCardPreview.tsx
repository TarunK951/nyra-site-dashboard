"use client";

import type { TeamMember } from "@/lib/content-types";
import { resolveCmsMediaUrl } from "@/lib/cms-media-url";
import { useEffect, useMemo, useState } from "react";

/** Reference: small white caps label on photo + back header */
const BRAND_MARKUP = (
  <span className="font-semibold uppercase tracking-[0.28em] text-white">
    NYRA<span className="tracking-normal"> </span>AI
  </span>
);

function roleHashtag(role: string): string {
  const r = role.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "");
  if (!r) return "#TEAM";
  return `#${r.slice(0, 14)}`;
}

function backBadge(role: string): string {
  const r = role.trim().toUpperCase().replace(/\s+/g, "");
  if (r.length > 0 && r.length <= 6) return r;
  return "CORE";
}

function IconLinkedIn({ className }: { className?: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14zM7.119 20.452H3.555V9h3.564v11.452z" />
    </svg>
  );
}

export function TeamMemberCardPreview({ member }: { member: TeamMember }) {
  const name = (member.name ?? "").trim() || "member";
  const nameDisplay = name.toLowerCase();
  const role = (member.role ?? "").trim();
  const tagline = (member.tagline ?? "").trim();
  const rawLinkedin = (member.social?.linkedin ?? "").trim();
  const linkedinHref = useMemo(
    () => resolveCmsMediaUrl(rawLinkedin) ?? "",
    [rawLinkedin],
  );
  const rawImage = typeof member.image === "string" ? member.image : "";
  const imageUrl = useMemo(() => resolveCmsMediaUrl(rawImage), [rawImage]);
  const [frontImageError, setFrontImageError] = useState(false);

  useEffect(() => {
    setFrontImageError(false);
  }, [imageUrl]);

  const showFrontImage = Boolean(imageUrl) && !frontImageError;
  const hashtag = roleHashtag(role);
  const badge = backBadge(role);
  const roleUpper = role.toUpperCase() || "—";

  const gridStyle = {
    backgroundColor: "#161616",
    backgroundImage: `
      linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)
    `,
    backgroundSize: "20px 20px",
  } as const;

  /** Same fixed height so front & back align; no card shadows. */
  const cardShell =
    "flex h-[408px] w-full max-w-[320px] flex-col overflow-hidden rounded-[24px] sm:h-[428px] sm:max-w-[340px]";

  return (
    <div className="mx-auto flex w-full max-w-[700px] flex-col items-center justify-center gap-4 lg:flex-row lg:items-stretch lg:justify-center lg:gap-4">
      {/* Front — photo fills flex-1, footer fixed strip */}
      <div className={`${cardShell} shrink-0 bg-[#121212]`}>
        <div className="relative min-h-0 flex-1 bg-[#1a1a1a]">
          {showFrontImage ? (
            <img
              key={imageUrl}
              src={imageUrl!}
              alt=""
              className="absolute inset-0 h-full w-full object-cover object-top"
              loading="eager"
              decoding="async"
              referrerPolicy="no-referrer"
              onError={() => setFrontImageError(true)}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-[12px] font-medium text-zinc-500">
              {imageUrl && frontImageError
                ? "Image could not be loaded"
                : "Add a portrait image URL"}
            </div>
          )}
          <div className="absolute bottom-3 left-3 z-10 text-[9px] leading-none sm:text-[10px]">
            {BRAND_MARKUP}
          </div>
        </div>
        <div className="flex shrink-0 items-end justify-between gap-4 border-t border-white/[0.06] bg-[#141414] px-6 py-5">
          <p className="min-w-0 text-[1.75rem] font-bold lowercase leading-[1.05] tracking-tight text-white sm:text-[2rem]">
            {nameDisplay}
          </p>
          <p className="shrink-0 text-right text-[9px] font-semibold uppercase tracking-[0.2em] text-neutral-500 sm:text-[10px]">
            {hashtag}
          </p>
        </div>
      </div>

      {/* Back — same height as front; flex spacer + footer */}
      <div
        className={`${cardShell} shrink-0 px-6 pb-6 pt-6 sm:px-7 sm:pb-7 sm:pt-7`}
        style={gridStyle}>
        <header className="flex shrink-0 items-start justify-between gap-3">
          <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-neutral-500 sm:text-[10px]">
            NYRA AI
          </span>
          <span className="rounded-full border border-white/50 bg-black/50 px-3 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-white sm:text-[10px]">
            {badge}
          </span>
        </header>

        <div className="mt-6 shrink-0">
          <h3
            className="text-[1.75rem] font-bold lowercase leading-[1.05] tracking-tight sm:text-[2rem]"
            style={{ color: "#ffffff" }}>
            {nameDisplay}
          </h3>
          <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-500 sm:text-[11px]">
            {roleUpper}
          </p>
          <p className="mt-3 text-[15px] font-normal lowercase leading-relaxed text-white/95">
            {tagline || "—"}
          </p>
        </div>

        <div className="min-h-6 flex-1" aria-hidden />

        <footer className="shrink-0 border-t border-white/10 pt-5">
          <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-neutral-500 sm:text-[10px]">
            Connect
          </p>
          {linkedinHref ? (
            <a
              href={linkedinHref}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/70 bg-transparent text-white transition hover:bg-white/10"
              aria-label="Open LinkedIn profile">
              <IconLinkedIn />
            </a>
          ) : (
            <p className="mt-3 text-[12px] text-neutral-600">No LinkedIn URL</p>
          )}
        </footer>

        {member.visible === false ? (
          <p className="mt-4 shrink-0 text-center text-[11px] text-amber-400/90">
            Hidden on the live site
          </p>
        ) : null}
      </div>
    </div>
  );
}
