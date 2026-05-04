import { getApiBase } from "@/lib/config";
import type { ModuleKey } from "@/lib/content-modules";

const JSON_HEADERS = {
  "Content-Type": "application/json",
} as const;

export const TOKEN_STORAGE_KEY = "nyra-access-token";
export const REFRESH_TOKEN_STORAGE_KEY = "nyra-refresh-token";

/** Standard login + refresh responses; backend may wrap tokens in `data`. */
export type AuthTokens = {
  accessToken: string;
  refreshToken?: string;
};

export type ContentModulePayload = {
  version: number;
  title?: string;
  status?: string;
  content?: unknown;
  [key: string]: unknown;
};

function extractAccessToken(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const o = body as Record<string, unknown>;
  const inner = o.data;
  if (inner && typeof inner === "object") {
    const d = inner as Record<string, unknown>;
    if (typeof d.accessToken === "string") return d.accessToken;
    if (typeof d.token === "string") return d.token;
  }
  if (typeof o.accessToken === "string") return o.accessToken;
  if (typeof o.token === "string") return o.token;
  return null;
}

function extractRefreshToken(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const o = body as Record<string, unknown>;
  const inner = o.data;
  if (inner && typeof inner === "object") {
    const d = inner as Record<string, unknown>;
    if (typeof d.refreshToken === "string") return d.refreshToken;
  }
  if (typeof o.refreshToken === "string") return o.refreshToken;
  return null;
}

function readRefreshTokenFromSession(): string | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    return sessionStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Persist access (and optionally refresh) in sessionStorage; used after login and token rotation. */
export function persistSessionTokens(accessToken: string, refreshToken?: string | null): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(TOKEN_STORAGE_KEY, accessToken);
    if (refreshToken !== undefined) {
      if (refreshToken) {
        sessionStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken);
      } else {
        sessionStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
      }
    }
  } catch {
    /* ignore */
  }
}

function clearSessionTokens(): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    sessionStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Clear both tokens from session (e.g. sign out). */
export function clearPersistedSessionTokens(): void {
  clearSessionTokens();
}

function dispatchTokensUpdated(accessToken: string, refreshToken?: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("nyra-tokens-updated", {
      detail: { accessToken, refreshToken },
    }),
  );
}

function dispatchAuthCleared(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("nyra-auth-cleared"));
}

/**
 * Exchange refresh token for new access token (and optional rotated refresh).
 * POST /api/auth/refresh — body `{ refreshToken }` (adjust path if your backend differs).
 */
export async function refreshAccessToken(refreshToken: string): Promise<AuthTokens> {
  const res = await fetch(`${getApiBase()}/api/auth/refresh`, {
    method: "POST",
    cache: "no-store",
    headers: JSON_HEADERS,
    body: JSON.stringify({ refreshToken }),
  });
  const body: unknown = await res.json().catch(() => null);
  const accessToken = extractAccessToken(body);
  if (!res.ok || !accessToken) {
    throw new Error(extractMessage(body, "Session expired. Please sign in again."));
  }
  const newRefresh = extractRefreshToken(body);
  return {
    accessToken,
    ...(newRefresh ? { refreshToken: newRefresh } : {}),
  };
}

function formatValidationDetail(detail: unknown): string | null {
  if (!Array.isArray(detail)) return null;
  const parts: string[] = [];
  for (const item of detail) {
    if (typeof item === "object" && item !== null) {
      const row = item as Record<string, unknown>;
      const msg =
        typeof row.msg === "string"
          ? row.msg
          : typeof row.message === "string"
            ? row.message
            : null;
      const loc = Array.isArray(row.loc)
        ? row.loc
            .map((x) => (typeof x === "string" || typeof x === "number" ? String(x) : ""))
            .filter(Boolean)
            .join(".")
        : "";
      if (msg) parts.push(loc ? `${loc}: ${msg}` : msg);
    } else if (typeof item === "string") {
      parts.push(item);
    }
  }
  return parts.length ? parts.join("; ") : null;
}

export function extractMessage(body: unknown, fallback: string): string {
  if (!body || typeof body !== "object") return fallback;
  const o = body as Record<string, unknown>;
  if (typeof o.message === "string" && o.message.trim()) return o.message;
  if (typeof o.error === "string" && o.error.trim()) return o.error;
  if (typeof o.detail === "string" && o.detail.trim()) return o.detail;
  const detailMsg = formatValidationDetail(o.detail);
  if (detailMsg) return detailMsg;
  if (Array.isArray(o.errors) && o.errors.length > 0) {
    const joined = o.errors.map(String).filter(Boolean).join("; ");
    if (joined) return joined;
  }
  return fallback;
}

function throwIfConflict(res: Response, body: unknown): void {
  if (res.status === 409) {
    throw new ConflictError(extractMessage(body, "Version conflict"));
  }
}

export async function login(email: string, password: string): Promise<AuthTokens> {
  const res = await fetch(`${getApiBase()}/api/auth/login`, {
    method: "POST",
    cache: "no-store",
    headers: JSON_HEADERS,
    body: JSON.stringify({ email, password }),
  });
  const body: unknown = await res.json().catch(() => null);
  const accessToken = extractAccessToken(body);
  if (!res.ok || !accessToken) {
    throw new Error(extractMessage(body, res.statusText || "Login failed"));
  }
  const refreshToken = extractRefreshToken(body);
  return {
    accessToken,
    ...(refreshToken ? { refreshToken } : {}),
  };
}

async function parseJsonBody(res: Response): Promise<unknown> {
  const ct = res.headers.get("content-type");
  if (ct?.includes("application/json")) {
    return res.json().catch(() => null);
  }
  return null;
}

async function authFetch(
  path: string,
  token: string,
  init?: RequestInit,
  allowRefreshRetry = true,
): Promise<{ res: Response; body: unknown }> {
  const res = await fetch(`${getApiBase()}${path}`, {
    cache: "no-store",
    ...init,
    headers: {
      ...JSON_HEADERS,
      Authorization: `Bearer ${token}`,
      ...(init?.headers as Record<string, string>),
    },
  });
  let body: unknown = await parseJsonBody(res);

  if (
    res.status === 401 &&
    allowRefreshRetry &&
    typeof sessionStorage !== "undefined"
  ) {
    const rt = readRefreshTokenFromSession();
    if (rt) {
      try {
        const next = await refreshAccessToken(rt);
        if (next.refreshToken !== undefined) {
          persistSessionTokens(next.accessToken, next.refreshToken);
        } else {
          persistSessionTokens(next.accessToken);
        }
        dispatchTokensUpdated(next.accessToken, next.refreshToken);
        return authFetch(path, next.accessToken, init, false);
      } catch {
        clearSessionTokens();
        dispatchAuthCleared();
      }
    }
  }

  return { res, body };
}

function resolveMultipartFetchUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  /** Dashboard App Router handlers only — never send `/api/content/*` to the wrong host. */
  if (path.startsWith("/api/cms/")) {
    if (typeof window !== "undefined" && window.location?.origin) {
      return `${window.location.origin}${path}`;
    }
    return path;
  }
  if (path.startsWith("/")) {
    return `${getApiBase()}${path}`;
  }
  return `${getApiBase()}${path}`;
}

async function authFetchMultipart(
  path: string,
  token: string,
  formData: FormData,
  allowRefreshRetry = true,
  signal?: AbortSignal,
): Promise<{ res: Response; body: unknown }> {
  const res = await fetch(resolveMultipartFetchUrl(path), {
    method: "POST",
    cache: "no-store",
    signal,
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });
  let body: unknown = await parseJsonBody(res);

  if (
    res.status === 401 &&
    allowRefreshRetry &&
    typeof sessionStorage !== "undefined"
  ) {
    const rt = readRefreshTokenFromSession();
    if (rt) {
      try {
        const next = await refreshAccessToken(rt);
        if (next.refreshToken !== undefined) {
          persistSessionTokens(next.accessToken, next.refreshToken);
        } else {
          persistSessionTokens(next.accessToken);
        }
        dispatchTokensUpdated(next.accessToken, next.refreshToken);
        return authFetchMultipart(path, next.accessToken, formData, false, signal);
      } catch {
        clearSessionTokens();
        dispatchAuthCleared();
      }
    }
  }

  return { res, body };
}

export function normalizeModulesList(body: unknown): unknown[] {
  if (!body || typeof body !== "object") return [];
  const o = body as Record<string, unknown>;
  if (o.success && o.data !== undefined) {
    const d = o.data;
    if (Array.isArray(d)) return d;
    if (d && typeof d === "object" && "modules" in d) {
      const m = (d as Record<string, unknown>).modules;
      if (Array.isArray(m)) return m;
    }
  }
  return [];
}

export async function fetchModulesList(token: string): Promise<unknown[]> {
  const { res, body } = await authFetch("/api/content/modules", token);
  if (!res.ok) {
    throw new Error(extractMessage(body, "Failed to load modules"));
  }
  return normalizeModulesList(body);
}

/** Raw `data` from `{ success, data }` or the object itself. */
export function unwrapApiData(body: unknown): unknown {
  if (!body || typeof body !== "object") return null;
  const o = body as Record<string, unknown>;
  if (o.success === true && "data" in o && o.data !== undefined) {
    return o.data;
  }
  return body;
}

export function unwrapModuleData(body: unknown): ContentModulePayload | null {
  const data = unwrapApiData(body);
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  if (typeof d.version !== "number") return null;
  return d as ContentModulePayload;
}

/**
 * After item/doctor/media mutations, backend may return the full module or a wrapper.
 */
export function unwrapModuleDataLoose(body: unknown): ContentModulePayload | null {
  const mod = unwrapModuleData(body);
  if (mod) return mod;
  const data = unwrapApiData(body);
  if (!data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  if (o.module && typeof o.module === "object") {
    const inner = o.module as Record<string, unknown>;
    if (typeof inner.version === "number") {
      return inner as ContentModulePayload;
    }
  }
  return null;
}

export async function fetchModule(
  token: string,
  moduleKey: ModuleKey,
): Promise<ContentModulePayload> {
  const { res, body } = await authFetch(
    `/api/content/${encodeURIComponent(moduleKey)}`,
    token,
  );
  if (!res.ok) {
    throw new Error(extractMessage(body, "Failed to load module"));
  }
  const mod = unwrapModuleData(body);
  if (!mod) {
    throw new Error("Unexpected module response");
  }
  return mod;
}

export async function publishModule(
  token: string,
  moduleKey: ModuleKey,
  expectedVersion: number,
): Promise<ContentModulePayload> {
  const { res, body } = await authFetch(
    `/api/content/${encodeURIComponent(moduleKey)}/publish`,
    token,
    {
      method: "PATCH",
      body: JSON.stringify({ expected_version: expectedVersion }),
    },
  );
  throwIfConflict(res, body);
  if (!res.ok) {
    throw new Error(extractMessage(body, "Publish failed"));
  }
  const mod = unwrapModuleData(body);
  if (!mod) throw new Error("Unexpected response after publish");
  return mod;
}

export async function unpublishModule(
  token: string,
  moduleKey: ModuleKey,
  expectedVersion: number,
): Promise<ContentModulePayload> {
  const { res, body } = await authFetch(
    `/api/content/${encodeURIComponent(moduleKey)}/unpublish`,
    token,
    {
      method: "PATCH",
      body: JSON.stringify({ expected_version: expectedVersion }),
    },
  );
  throwIfConflict(res, body);
  if (!res.ok) {
    throw new Error(extractMessage(body, "Unpublish failed"));
  }
  const mod = unwrapModuleData(body);
  if (!mod) throw new Error("Unexpected response after unpublish");
  return mod;
}

export async function replaceModule(
  token: string,
  moduleKey: ModuleKey,
  payload: {
    expected_version: number;
    title?: string;
    status?: string;
    content?: unknown;
  },
): Promise<ContentModulePayload> {
  const { res, body } = await authFetch(
    `/api/content/${encodeURIComponent(moduleKey)}`,
    token,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
  );
  throwIfConflict(res, body);
  if (!res.ok) {
    throw new Error(extractMessage(body, "Save module failed"));
  }
  const mod = unwrapModuleDataLoose(body) ?? unwrapModuleData(body);
  if (!mod) throw new Error("Unexpected response after module replace");
  return mod;
}

export async function listCollectionItems(
  token: string,
  moduleKey: ModuleKey,
  collection: string,
): Promise<unknown> {
  const { res, body } = await authFetch(
    `/api/content/${encodeURIComponent(moduleKey)}/items/${encodeURIComponent(collection)}`,
    token,
  );
  if (!res.ok) {
    throw new Error(extractMessage(body, "Failed to list items"));
  }
  return unwrapApiData(body);
}

export async function createCollectionItem(
  token: string,
  moduleKey: ModuleKey,
  collection: string,
  expectedVersion: number,
  item: unknown,
): Promise<ContentModulePayload | null> {
  const { res, body } = await authFetch(
    `/api/content/${encodeURIComponent(moduleKey)}/items/${encodeURIComponent(collection)}`,
    token,
    {
      method: "POST",
      body: JSON.stringify({ expected_version: expectedVersion, item }),
    },
  );
  throwIfConflict(res, body);
  if (!res.ok) {
    throw new Error(extractMessage(body, "Create failed"));
  }
  return unwrapModuleDataLoose(body) ?? unwrapModuleData(body);
}

export async function updateCollectionItem(
  token: string,
  moduleKey: ModuleKey,
  collection: string,
  itemId: string,
  expectedVersion: number,
  item: unknown,
): Promise<ContentModulePayload | null> {
  const { res, body } = await authFetch(
    `/api/content/${encodeURIComponent(moduleKey)}/items/${encodeURIComponent(collection)}/${encodeURIComponent(itemId)}`,
    token,
    {
      method: "PUT",
      body: JSON.stringify({ expected_version: expectedVersion, item }),
    },
  );
  throwIfConflict(res, body);
  if (!res.ok) {
    throw new Error(extractMessage(body, "Update failed"));
  }
  return unwrapModuleDataLoose(body) ?? unwrapModuleData(body);
}

export async function deleteCollectionItem(
  token: string,
  moduleKey: ModuleKey,
  collection: string,
  itemId: string,
  expectedVersion: number,
): Promise<ContentModulePayload | null> {
  const { res, body } = await authFetch(
    `/api/content/${encodeURIComponent(moduleKey)}/items/${encodeURIComponent(collection)}/${encodeURIComponent(itemId)}`,
    token,
    {
      method: "DELETE",
      body: JSON.stringify({ expected_version: expectedVersion }),
    },
  );
  throwIfConflict(res, body);
  if (!res.ok) {
    throw new Error(extractMessage(body, "Delete failed"));
  }
  return unwrapModuleDataLoose(body) ?? unwrapModuleData(body);
}

export type UploadMediaResult = {
  module: ContentModulePayload | null;
  /** URL returned by API when present */
  url?: string;
};

export async function uploadItemMedia(
  token: string,
  moduleKey: ModuleKey,
  collection: string,
  itemId: string,
  expectedVersion: number,
  file: File,
  field: string,
): Promise<UploadMediaResult> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("field", field);
  formData.append("expected_version", String(expectedVersion));

  const { res, body } = await authFetchMultipart(
    `/api/content/${encodeURIComponent(moduleKey)}/items/${encodeURIComponent(collection)}/${encodeURIComponent(itemId)}/media`,
    token,
    formData,
    true,
    undefined,
  );
  throwIfConflict(res, body);
  if (!res.ok) {
    throw new Error(extractMessage(body, "Upload failed"));
  }
  const mod = unwrapModuleDataLoose(body) ?? unwrapModuleData(body);
  let url: string | undefined;
  const data = unwrapApiData(body);
  if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    if (typeof o.url === "string") url = o.url;
    else if (typeof o.mediaUrl === "string") url = o.mediaUrl;
    else if (o.item && typeof o.item === "object") {
      const it = o.item as Record<string, unknown>;
      if (typeof it[field] === "string") url = it[field] as string;
    }
  }
  return { module: mod, url };
}

function testimonialUploadRecord(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== "object") return {};
  const inner = unwrapApiData(body);
  if (inner && typeof inner === "object" && !Array.isArray(inner)) {
    return inner as Record<string, unknown>;
  }
  return body as Record<string, unknown>;
}

function parseTestimonialUploadResult(body: unknown): {
  video_url: string;
  poster_url?: string;
} {
  const d = testimonialUploadRecord(body);
  const videoRaw =
    (typeof d.video_url === "string" && d.video_url) ||
    (typeof d.videoUrl === "string" && d.videoUrl) ||
    "";
  const video = videoRaw.trim();
  if (!video) {
    throw new Error(extractMessage(body, "Response did not include a video URL"));
  }
  const posterRaw =
    (typeof d.poster_url === "string" && d.poster_url) ||
    (typeof d.posterUrl === "string" && d.posterUrl) ||
    "";
  const posterTrim = posterRaw.trim();
  return {
    video_url: video,
    ...(posterTrim ? { poster_url: posterTrim } : {}),
  };
}

/** Multipart: `video` + optional `poster` → `POST /api/content/:moduleKey/upload` */
export async function uploadTestimonialVideoFile(
  token: string,
  moduleKey: ModuleKey,
  video: File,
  poster?: File | null,
  signal?: AbortSignal,
): Promise<{ video_url: string; poster_url?: string }> {
  const formData = new FormData();
  formData.append("video", video);
  if (poster) formData.append("poster", poster);
  const path = `/api/content/${encodeURIComponent(moduleKey)}/upload`;
  const { res, body } = await authFetchMultipart(path, token, formData, true, signal);
  if (res.status === 413) {
    const err = new Error("HTTP_413_PAYLOAD_TOO_LARGE");
    (err as Error & { code?: string }).code = "HTTP_413";
    throw err;
  }
  if (!res.ok) {
    throw new Error(extractMessage(body, "Video upload failed"));
  }
  return parseTestimonialUploadResult(body);
}

/**
 * Same-origin dashboard route: POST /api/cms/upload-image (multipart `file`, optional `folder`).
 * Uses Vercel Blob when BLOB_READ_WRITE_TOKEN is set, or CMS_IMAGE_UPLOAD_* to another backend.
 */
export async function uploadImageViaDashboardBlobRoute(
  token: string,
  file: File,
  folder?: string,
  signal?: AbortSignal,
): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append("file", file);
  if (folder && folder.trim()) formData.append("folder", folder.trim());
  const url = resolveMultipartFetchUrl("/api/cms/upload-image");
  const res = await fetch(url, {
    method: "POST",
    cache: "no-store",
    signal,
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(extractMessage(body, "Image upload failed"));
  }
  if (!body || typeof body !== "object") {
    throw new Error("Unexpected response from image upload");
  }
  const u = (body as Record<string, unknown>).url;
  if (typeof u !== "string" || !u.trim()) {
    throw new Error("Image upload did not return a URL");
  }
  return { url: u.trim() };
}

/**
 * Same-origin dashboard route: POST /api/cms/upload-video (multipart `file`).
 * Uses Vercel Blob when BLOB_READ_WRITE_TOKEN is set, or CMS_VIDEO_UPLOAD_* to another backend.
 */
export async function uploadVideoViaDashboardBlobRoute(
  token: string,
  file: File,
  signal?: AbortSignal,
): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append("file", file);
  const url = resolveMultipartFetchUrl("/api/cms/upload-video");
  const res = await fetch(url, {
    method: "POST",
    cache: "no-store",
    signal,
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(extractMessage(body, "Dashboard video upload failed"));
  }
  if (!body || typeof body !== "object") {
    throw new Error("Unexpected response from dashboard upload");
  }
  const u = (body as Record<string, unknown>).url;
  if (typeof u !== "string" || !u.trim()) {
    throw new Error("Dashboard upload did not return a URL");
  }
  return { url: u.trim() };
}

/**
 * Tries the content API upload first; on HTTP 413 (nginx / body limit), retries via
 * `/api/cms/upload-video` so large files can use Blob or another configured host.
 */
export async function uploadTestimonialVideoFileWithFallback(
  token: string,
  moduleKey: ModuleKey,
  video: File,
  poster?: File | null,
  signal?: AbortSignal,
): Promise<{ video_url: string; poster_url?: string }> {
  try {
    return await uploadTestimonialVideoFile(
      token,
      moduleKey,
      video,
      poster,
      signal,
    );
  } catch (e) {
    const code = typeof e === "object" && e !== null ? (e as { code?: string }).code : undefined;
    const is413 =
      code === "HTTP_413" ||
      (e instanceof Error && e.message === "HTTP_413_PAYLOAD_TOO_LARGE");
    if (!is413) throw e;
    if (poster) {
      try {
        return await uploadTestimonialVideoFile(
          token,
          moduleKey,
          video,
          null,
          signal,
        );
      } catch (e2) {
        const c2 =
          typeof e2 === "object" && e2 !== null ? (e2 as { code?: string }).code : undefined;
        const again =
          c2 === "HTTP_413" ||
          (e2 instanceof Error && e2.message === "HTTP_413_PAYLOAD_TOO_LARGE");
        if (!again) throw e2;
      }
    }
    try {
      const { url } = await uploadVideoViaDashboardBlobRoute(token, video, signal);
      return { video_url: url };
    } catch (inner) {
      const hint =
        "The API rejected the file as too large (HTTP 413). Fix: raise nginx client_max_body_size (and app limits) on the API server, or set BLOB_READ_WRITE_TOKEN (Vercel Blob) / CMS_VIDEO_UPLOAD_URL so this dashboard can upload the file without hitting that limit.";
      const innerMsg = inner instanceof Error ? inner.message : String(inner);
      throw new Error(`${hint} (${innerMsg})`);
    }
  }
}

/** JSON `{ url, posterUrl? }` → same upload route (external / hosted URL registration). */
export async function registerTestimonialVideoUrl(
  token: string,
  moduleKey: ModuleKey,
  url: string,
  posterUrl?: string | null,
  signal?: AbortSignal,
): Promise<{ video_url: string; poster_url?: string }> {
  const path = `/api/content/${encodeURIComponent(moduleKey)}/upload`;
  const payload: Record<string, string> = { url: url.trim() };
  const p = (posterUrl ?? "").trim();
  if (p) payload.posterUrl = p;
  const { res, body } = await authFetch(path, token, {
    method: "POST",
    body: JSON.stringify(payload),
    signal,
  });
  if (!res.ok) {
    throw new Error(extractMessage(body, "Video URL registration failed"));
  }
  return parseTestimonialUploadResult(body);
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}
