"use client";

import type { BlogPost } from "@/lib/content-types";
import { resolveCmsMediaUrl } from "@/lib/cms-media-url";
import { useEffect, useMemo, useState } from "react";

function formatBlogCardDate(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function IconArrowUpRight({ className }: { className?: string }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden>
      <path
        d="M7 17 17 7M9 7h8v8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BlogPostMarketingPreview({ post }: { post: BlogPost }) {
  const title = (post.title ?? "").trim() || "Untitled post";
  const excerpt = (post.excerpt ?? "").trim();
  const authorName = (post.author?.name ?? "").trim() || "Author";
  const rawHero = typeof post.heroImage === "string" ? post.heroImage : "";
  const rawAvatar =
    typeof post.author?.avatar === "string" ? post.author.avatar : "";

  const heroUrl = useMemo(() => resolveCmsMediaUrl(rawHero), [rawHero]);
  const avatarUrl = useMemo(() => resolveCmsMediaUrl(rawAvatar), [rawAvatar]);

  const [heroFailed, setHeroFailed] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);

  useEffect(() => {
    setHeroFailed(false);
  }, [heroUrl]);
  useEffect(() => {
    setAvatarFailed(false);
  }, [avatarUrl]);

  const showHero = Boolean(heroUrl) && !heroFailed;
  const showAvatar = Boolean(avatarUrl) && !avatarFailed;
  const dateLine = formatBlogCardDate(post.publishedAt);
  const category = (post.category ?? "").trim();

  return (
    <div className="mx-auto w-full max-w-md">
      <article className="overflow-hidden rounded-2xl border border-solid border-black/[0.07] bg-white shadow-[0_20px_45px_-14px_rgba(0,0,0,0.16)] dark:border-white/[0.08] dark:bg-[var(--surface)] dark:shadow-[var(--shadow-elevated)]">
        <div className="relative aspect-[4/3] w-full bg-gradient-to-br from-slate-200 to-slate-300 sm:aspect-[16/10] dark:from-zinc-800 dark:to-zinc-900">
          <div
            className="pointer-events-none absolute left-4 top-4 z-10 h-11 w-11 rounded-full bg-white/25 ring-1 ring-white/50 backdrop-blur-[2px] dark:bg-white/10 dark:ring-white/20"
            aria-hidden
          />
          {showHero ? (
            <img
              src={heroUrl!}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              loading="eager"
              decoding="async"
              onError={() => setHeroFailed(true)}
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-8 text-center">
              <p className="text-[13px] font-medium text-slate-600/90 dark:text-zinc-400">
                {heroUrl && heroFailed
                  ? "Hero image could not be loaded."
                  : "No hero image"}
              </p>
            </div>
          )}
        </div>

        <div className="border-b border-solid border-slate-200/90 bg-[#f8f9fb] px-6 py-6 sm:px-7 dark:border-zinc-800 dark:bg-zinc-900/40">
          {excerpt ? (
            <p className="text-[13px] font-normal italic leading-relaxed text-[#6b7280] dark:text-[var(--foreground-secondary)]">
              {excerpt}
            </p>
          ) : null}
          <div className={`flex items-start justify-between gap-4 ${excerpt ? "mt-4" : ""}`}>
            <h2 className="min-w-0 flex-1 text-[1.35rem] font-bold leading-snug tracking-tight text-[#111827] sm:text-2xl dark:text-[var(--text-heading)]">
              {title}
            </h2>
            <span
              className="mt-0.5 shrink-0 text-[#111827] dark:text-[var(--text-heading)]"
              title="Post preview"
              aria-hidden>
              <IconArrowUpRight />
            </span>
          </div>
          {excerpt ? (
            <p className="mt-4 text-[13px] leading-relaxed text-[#6b7280] dark:text-[var(--foreground-secondary)]">
              {excerpt}
            </p>
          ) : (
            <p className="mt-4 text-[13px] text-[#9ca3af] dark:text-[var(--text-muted)]">
              No excerpt yet.
            </p>
          )}
          {category ? (
            <p className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-[#9ca3af] dark:text-zinc-500">
              {category}
            </p>
          ) : null}
        </div>

        <div className="flex items-center gap-3.5 bg-white px-6 py-4 sm:px-7 dark:bg-[var(--surface)]">
          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-slate-200 ring-1 ring-black/[0.06] dark:bg-zinc-800 dark:ring-white/10">
            {showAvatar ? (
              <img
                src={avatarUrl!}
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
                decoding="async"
                onError={() => setAvatarFailed(true)}
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-[13px] font-semibold text-slate-600 dark:text-zinc-300">
                {authorName.slice(0, 1).toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-[15px] font-bold text-[#111827] dark:text-[var(--text-heading)]">
              {authorName}
            </p>
            <p className="mt-0.5 text-[13px] text-[#6b7280] dark:text-[var(--foreground-secondary)]">
              {dateLine}
            </p>
          </div>
        </div>

        {(post.tags?.length ?? 0) > 0 || post.visible === false ? (
          <div className="border-t border-solid border-slate-200/80 px-6 py-3 text-[11px] text-[#6b7280] dark:border-zinc-800 dark:text-zinc-400">
            {(post.tags?.length ?? 0) > 0 ? (
              <span>Tags: {(post.tags ?? []).join(", ")}</span>
            ) : null}
            {(post.tags?.length ?? 0) > 0 && post.visible === false ? (
              <span> · </span>
            ) : null}
            {post.visible === false ? <span>Hidden on the live site</span> : null}
          </div>
        ) : null}
      </article>
    </div>
  );
}
