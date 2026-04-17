import { getApiBase } from "@/lib/config";
import type { ModuleKey } from "@/lib/content-modules";

const JSON_HEADERS = {
  "Content-Type": "application/json",
} as const;

export const TOKEN_STORAGE_KEY = "nyra-access-token";

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

export async function login(email: string, password: string): Promise<string> {
  const res = await fetch(`${getApiBase()}/api/auth/login`, {
    method: "POST",
    cache: "no-store",
    headers: JSON_HEADERS,
    body: JSON.stringify({ email, password }),
  });
  const body: unknown = await res.json().catch(() => null);
  const token = extractAccessToken(body);
  if (!res.ok || !token) {
    throw new Error(extractMessage(body, res.statusText || "Login failed"));
  }
  return token;
}

async function authFetch(
  path: string,
  token: string,
  init?: RequestInit,
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
  let body: unknown = null;
  const ct = res.headers.get("content-type");
  if (ct?.includes("application/json")) {
    body = await res.json().catch(() => null);
  }
  return { res, body };
}

async function authFetchMultipart(
  path: string,
  token: string,
  formData: FormData,
): Promise<{ res: Response; body: unknown }> {
  const res = await fetch(`${getApiBase()}${path}`, {
    method: "POST",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });
  let body: unknown = null;
  const ct = res.headers.get("content-type");
  if (ct?.includes("application/json")) {
    body = await res.json().catch(() => null);
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

/** POST /api/content/team/ — add member (team module uses module root, not …/items/members). */
export async function createTeamMemberAtModule(
  token: string,
  expectedVersion: number,
  item: unknown,
): Promise<ContentModulePayload | null> {
  const { res, body } = await authFetch(
    `/api/content/${encodeURIComponent("team")}`,
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

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}
