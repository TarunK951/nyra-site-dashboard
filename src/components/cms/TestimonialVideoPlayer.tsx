"use client";

import { resolveCmsMediaUrl } from "@/lib/cms-media-url";
import { useEffect, useMemo, useState } from "react";

function youtubeEmbedUrl(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  try {
    const u = new URL(s.startsWith("//") ? `https:${s}` : s);
    const host = u.hostname.toLowerCase();
    if (host === "youtu.be") {
      const id = u.pathname.replace(/^\//, "").split("/")[0];
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (host.includes("youtube.com")) {
      if (u.pathname.startsWith("/embed/")) return u.toString();
      const id = u.searchParams.get("v");
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function vimeoEmbedUrl(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  try {
    const u = new URL(s.startsWith("//") ? `https:${s}` : s);
    if (!u.hostname.toLowerCase().includes("vimeo.com")) return null;
    const parts = u.pathname.split("/").filter(Boolean);
    const id = parts[0] === "video" ? parts[1] : parts[0];
    if (id && /^\d+$/.test(id)) {
      return `https://player.vimeo.com/video/${id}`;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export type TestimonialVideoPlayerProps = {
  /** Raw URL from CMS, blob URL for local preview, or empty */
  src: string;
  /** Optional poster image URL for native &lt;video&gt; (ignored for embeds). */
  poster?: string;
  className?: string;
  /** Max height for embedded players */
  maxHeightClass?: string;
};

/**
 * Renders YouTube/Vimeo in an iframe, or a native &lt;video&gt; for direct file URLs (play/pause via controls).
 */
export function TestimonialVideoPlayer({
  src,
  poster,
  className = "",
  maxHeightClass = "max-h-[min(56vw,320px)]",
}: TestimonialVideoPlayerProps) {
  const trimmed = (src ?? "").trim();
  const [videoError, setVideoError] = useState(false);

  const resolved = useMemo(() => {
    if (!trimmed) return null;
    if (/^blob:/i.test(trimmed)) return trimmed;
    return resolveCmsMediaUrl(trimmed);
  }, [trimmed]);

  const resolvedPoster = useMemo(() => {
    const p = (poster ?? "").trim();
    if (!p || /^blob:/i.test(p)) return undefined;
    return resolveCmsMediaUrl(p) ?? undefined;
  }, [poster]);

  const yt = useMemo(
    () => (resolved && !/^blob:/i.test(resolved) ? youtubeEmbedUrl(resolved) : null),
    [resolved],
  );
  const vimeo = useMemo(
    () =>
      resolved && !/^blob:/i.test(resolved) && !yt ? vimeoEmbedUrl(resolved) : null,
    [resolved, yt],
  );

  useEffect(() => {
    setVideoError(false);
  }, [resolved, resolvedPoster, yt, vimeo]);

  if (!resolved) {
    return (
      <div
        className={`flex aspect-video w-full items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-100/80 text-[13px] text-slate-500 dark:border-slate-600 dark:bg-zinc-900/80 dark:text-zinc-400 ${className}`}>
        No video selected
      </div>
    );
  }

  if (yt) {
    return (
      <div className={`aspect-video w-full overflow-hidden rounded-xl bg-black ${maxHeightClass} ${className}`}>
        <iframe
          title="Testimonial video"
          src={yt}
          className="h-full w-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    );
  }

  if (vimeo) {
    return (
      <div className={`aspect-video w-full overflow-hidden rounded-xl bg-black ${maxHeightClass} ${className}`}>
        <iframe
          title="Testimonial video"
          src={vimeo}
          className="h-full w-full border-0"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <div className={`w-full overflow-hidden rounded-xl bg-black ${className}`}>
      {videoError ? (
        <div className="flex aspect-video w-full items-center justify-center px-4 text-center text-[13px] text-white/80">
          This URL could not be played as a file. Try a direct .mp4 / .webm link, or use YouTube / Vimeo.
        </div>
      ) : (
        <video
          key={resolved}
          src={resolved}
          poster={resolvedPoster}
          controls
          playsInline
          preload="metadata"
          className={`aspect-video w-full ${maxHeightClass} object-contain`}
          onError={() => setVideoError(true)}
        />
      )}
    </div>
  );
}
