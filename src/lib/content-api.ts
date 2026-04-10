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

function extractMessage(body: unknown, fallback: string): string {
  if (!body || typeof body !== "object") return fallback;
  const o = body as Record<string, unknown>;
  if (typeof o.message === "string") return o.message;
  if (typeof o.error === "string") return o.error;
  return fallback;
}

export async function login(email: string, password: string): Promise<string> {
  const res = await fetch(`${getApiBase()}/api/auth/login`, {
    method: "POST",
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

export function unwrapModuleData(body: unknown): ContentModulePayload | null {
  if (!body || typeof body !== "object") return null;
  const o = body as Record<string, unknown>;
  const data = o.success && o.data !== undefined ? o.data : o;
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  if (typeof d.version !== "number") return null;
  return d as ContentModulePayload;
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
  if (res.status === 409) {
    throw new ConflictError(extractMessage(body, "Version conflict"));
  }
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
  if (res.status === 409) {
    throw new ConflictError(extractMessage(body, "Version conflict"));
  }
  if (!res.ok) {
    throw new Error(extractMessage(body, "Unpublish failed"));
  }
  const mod = unwrapModuleData(body);
  if (!mod) throw new Error("Unexpected response after unpublish");
  return mod;
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}
