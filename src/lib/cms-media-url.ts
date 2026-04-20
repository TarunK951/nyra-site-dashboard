/**
 * Normalize image/video URLs stored in CMS (Next optimizer wrappers, missing schemes).
 */

export function unwrapNextImageOptimizerUrl(raw: string): string {
  const s = raw.trim().replace(/\s+/g, "");
  if (!s || !/\/_next\/image\b/i.test(s)) return s;
  const m = s.match(/[?&]url=([^&]+)/);
  if (!m?.[1]) return s;
  try {
    let decoded = decodeURIComponent(m[1]);
    try {
      decoded = decodeURIComponent(decoded);
    } catch {
      /* single decode is enough */
    }
    return decoded.trim() || s;
  } catch {
    return s;
  }
}

export function normalizeCmsMediaUrl(raw: string): string | null {
  let u = raw.trim().replace(/\s+/g, "");
  if (!u) return null;
  if (u.startsWith("/")) return u;
  if (/^(data:|blob:)/i.test(u)) return u;
  if (u.startsWith("//")) return `https:${u}`;
  if (/^https?:\/\//i.test(u)) {
    if (
      typeof window !== "undefined" &&
      window.location.protocol === "https:" &&
      u.toLowerCase().startsWith("http://")
    ) {
      return `https://${u.slice("http://".length)}`;
    }
    return u;
  }
  if (/^www\./i.test(u) || /^[\w.-]+\.[a-z]{2,}([/?#]|$)/i.test(u)) {
    return `https://${u}`;
  }
  return u;
}

export function resolveCmsMediaUrl(raw: string): string | null {
  return normalizeCmsMediaUrl(unwrapNextImageOptimizerUrl(raw));
}
