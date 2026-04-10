"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import { ThemeToggle } from "@/components/ThemeToggle";
import {
  ConflictError,
  fetchModule,
  fetchModulesList,
  login,
  publishModule,
  TOKEN_STORAGE_KEY,
  unpublishModule,
  type ContentModulePayload,
} from "@/lib/content-api";
import {
  isModuleKey,
  MODULE_KEYS,
  MODULE_LABELS,
  type ModuleKey,
  type NavId,
} from "@/lib/content-modules";
import { getApiBase } from "@/lib/config";

const MODULE_ICONS: Record<ModuleKey, string> = {
  blogs: "◇",
  testimonials: "◆",
  team: "◎",
  faq: "?",
  features: "✦",
  how_it_works: "⚙",
  sales_team: "☎",
  hospitals_bundle: "⊕",
};

const nav = [
  { id: "overview" as const, label: "Overview", icon: "◆" },
  ...MODULE_KEYS.map((id) => ({
    id,
    label: MODULE_LABELS[id],
    icon: MODULE_ICONS[id],
  })),
];

function parseSection(searchParams: URLSearchParams): NavId {
  const raw = searchParams.get("section");
  if (raw === "overview" || raw === null) return "overview";
  if (raw && isModuleKey(raw)) return raw;
  return "overview";
}

function ChevronIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      className={`shrink-0 text-[var(--foreground-secondary)] transition-transform duration-300 ${
        collapsed ? "rotate-180" : ""
      }`}>
      <path
        d="M10 12L6 8l4-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function moduleSummaryLine(mod: ContentModulePayload): string {
  const c = mod.content;
  if (!c || typeof c !== "object") return "—";
  const o = c as Record<string, unknown>;
  const keys = Object.keys(o).filter((k) => k !== "version");
  if (keys.length === 0) return "Empty content";
  return `${keys.length} top-level field(s)`;
}

function listRowMeta(
  row: unknown,
  index: number,
): { key: string; title: string; status: string; version: string } {
  if (!row || typeof row !== "object") {
    return {
      key: `row-${index}`,
      title: JSON.stringify(row),
      status: "—",
      version: "—",
    };
  }
  const o = row as Record<string, unknown>;
  const key =
    typeof o.key === "string"
      ? o.key
      : typeof o.moduleKey === "string"
        ? o.moduleKey
        : `row-${index}`;
  const title =
    typeof o.title === "string"
      ? o.title
      : typeof o.name === "string"
        ? o.name
        : key;
  const status = typeof o.status === "string" ? o.status : "—";
  const version =
    typeof o.version === "number"
      ? String(o.version)
      : typeof o.version === "string"
        ? o.version
        : "—";
  return { key, title, status, version };
}

export function NyraDashboard() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const active = useMemo(() => parseSection(searchParams), [searchParams]);

  const setSection = useCallback(
    (id: NavId) => {
      const params = new URLSearchParams(searchParams.toString());
      if (id === "overview") {
        params.delete("section");
      } else {
        params.set("section", id);
      }
      const q = params.toString();
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [modulesList, setModulesList] = useState<unknown[] | null>(null);
  const [listLoading, setListLoading] = useState(false);

  const [moduleData, setModuleData] = useState<ContentModulePayload | null>(
    null,
  );
  const [moduleLoading, setModuleLoading] = useState(false);

  useEffect(() => {
    try {
      setToken(sessionStorage.getItem(TOKEN_STORAGE_KEY));
    } catch {
      setToken(null);
    }
    setAuthReady(true);
  }, []);

  const persistToken = useCallback((t: string | null) => {
    setToken(t);
    try {
      if (t) sessionStorage.setItem(TOKEN_STORAGE_KEY, t);
      else sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const loadModulesList = useCallback(async () => {
    if (!token) return;
    setListLoading(true);
    setError(null);
    try {
      const list = await fetchModulesList(token);
      setModulesList(list);
    } catch (e) {
      setModulesList(null);
      setError(e instanceof Error ? e.message : "Failed to load modules");
    } finally {
      setListLoading(false);
    }
  }, [token]);

  const loadModule = useCallback(async () => {
    if (!token || active === "overview") {
      setModuleData(null);
      return;
    }
    setModuleLoading(true);
    setError(null);
    try {
      const mod = await fetchModule(token, active);
      setModuleData(mod);
    } catch (e) {
      setModuleData(null);
      setError(e instanceof Error ? e.message : "Failed to load module");
    } finally {
      setModuleLoading(false);
    }
  }, [token, active]);

  useEffect(() => {
    if (!authReady || !token) return;
    void loadModulesList();
  }, [authReady, token, loadModulesList]);

  useEffect(() => {
    if (!authReady || !token) return;
    void loadModule();
  }, [authReady, token, active, loadModule]);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setAuthBusy(true);
    setError(null);
    try {
      const t = await login(email.trim(), password);
      persistToken(t);
      setPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setAuthBusy(false);
    }
  };

  const handleLogout = () => {
    persistToken(null);
    setModulesList(null);
    setModuleData(null);
    setEmail("");
    setPassword("");
    setError(null);
    setSection("overview");
  };

  const handlePublish = async () => {
    if (!token || active === "overview" || !moduleData) return;
    setError(null);
    try {
      const next = await publishModule(token, active, moduleData.version);
      setModuleData(next);
      void loadModulesList();
    } catch (e) {
      if (e instanceof ConflictError) {
        setError(`${e.message} Refetch the module and retry.`);
        void loadModule();
      } else {
        setError(e instanceof Error ? e.message : "Publish failed");
      }
    }
  };

  const handleUnpublish = async () => {
    if (!token || active === "overview" || !moduleData) return;
    setError(null);
    try {
      const next = await unpublishModule(token, active, moduleData.version);
      setModuleData(next);
      void loadModulesList();
    } catch (e) {
      if (e instanceof ConflictError) {
        setError(`${e.message} Refetch the module and retry.`);
        void loadModule();
      } else {
        setError(e instanceof Error ? e.message : "Unpublish failed");
      }
    }
  };

  const headerTitle =
    active === "overview"
      ? "Website content"
      : MODULE_LABELS[active as ModuleKey];
  const headerSubtitle =
    active === "overview"
      ? "Manage site modules via the content API. Publish changes separately from editing."
      : `Module “${active}”. Include expected_version on every mutation.`;

  const jsonPreview = useMemo(() => {
    if (!moduleData) return "";
    try {
      return JSON.stringify(moduleData, null, 2);
    } catch {
      return String(moduleData);
    }
  }, [moduleData]);

  const copyJson = () => {
    if (!jsonPreview || typeof navigator === "undefined") return;
    void navigator.clipboard.writeText(jsonPreview);
  };

  if (!authReady) {
    return (
      <div className="flex h-svh items-center justify-center bg-[var(--background)] text-[var(--foreground-secondary)]">
        Loading…
      </div>
    );
  }

  if (!token) {
    return (
      <div className="nyra-shell-bg flex min-h-svh w-full items-center justify-center bg-[var(--background)] p-4">
        <div className="neu-surface w-full max-w-md rounded-2xl p-6 sm:p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="relative h-10 w-16 shrink-0">
              <Image
                src="/nyraai-logo.png"
                alt=""
                width={120}
                height={48}
                className="h-10 w-16 object-contain object-left"
                priority
              />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--foreground-secondary)]">
                NyraAI
              </p>
              <h1 className="text-lg font-semibold text-[var(--foreground)]">
                Content console
              </h1>
            </div>
          </div>
          <p className="mb-6 text-[14px] leading-relaxed text-[var(--foreground-secondary)]">
            Sign in to access{" "}
            <code className="rounded bg-[var(--surface-muted)] px-1.5 py-0.5 text-[12px]">
              /api/content
            </code>{" "}
            (Bearer token).
          </p>
          <form className="space-y-4" onSubmit={handleLogin}>
            {error && (
              <p
                className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-[13px] text-[var(--foreground)]"
                role="alert">
                {error}
              </p>
            )}
            <label className="block">
              <span className="mb-1.5 block text-[12px] font-medium text-[var(--foreground-secondary)]">
                Email
              </span>
              <input
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="neu-surface-inset w-full rounded-xl px-3 py-2.5 text-[14px] text-[var(--foreground)] outline-none ring-[var(--accent)] focus:ring-2"
                required
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[12px] font-medium text-[var(--foreground-secondary)]">
                Password
              </span>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="neu-surface-inset w-full rounded-xl px-3 py-2.5 text-[14px] text-[var(--foreground)] outline-none ring-[var(--accent)] focus:ring-2"
                required
              />
            </label>
            <button
              type="submit"
              disabled={authBusy}
              className="neu-surface flex w-full items-center justify-center rounded-xl py-3 text-[14px] font-semibold text-[var(--foreground)] transition hover:opacity-95 disabled:opacity-60">
              {authBusy ? "Signing in…" : "Sign in"}
            </button>
          </form>
          <p className="mt-4 text-center text-[11px] text-[var(--foreground-secondary)]">
            API: {getApiBase()}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="nyra-shell-bg flex h-svh max-h-svh min-h-0 w-full overflow-hidden bg-[var(--background)]">
      <aside
        className={`flex h-full min-h-0 shrink-0 flex-col overflow-hidden border-r border-[var(--border)] bg-[var(--background-subtle)] transition-[width] duration-300 ease-out ${
          sidebarCollapsed
            ? "w-[var(--sidebar-collapsed)] min-w-[var(--sidebar-collapsed)]"
            : "w-[var(--sidebar-expanded)] min-w-[var(--sidebar-expanded)]"
        }`}>
        <div className="shrink-0 border-b border-[var(--border)] px-3 pb-3 pt-3">
          <div
            className={
              sidebarCollapsed
                ? "flex flex-col items-center gap-2.5"
                : "flex items-center gap-2.5"
            }>
            <button
              type="button"
              onClick={() => setSidebarCollapsed((c) => !c)}
              className="neu-surface-inset flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--foreground)] transition hover:opacity-90"
              aria-expanded={!sidebarCollapsed}
              aria-controls="dashboard-sidebar-nav"
              aria-label={
                sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
              }>
              <ChevronIcon collapsed={sidebarCollapsed} />
            </button>
            {!sidebarCollapsed && (
              <div className="min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="relative h-9 w-14 shrink-0">
                    <Image
                      src="/nyraai-logo.png"
                      alt=""
                      width={120}
                      height={48}
                      className="h-9 w-14 object-contain object-left"
                      priority
                      aria-hidden
                    />
                  </div>
                  <div className="min-w-0 flex-1 leading-tight">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--foreground-secondary)]">
                      NyraAI
                    </p>
                    <p className="text-sm font-semibold tracking-tight text-[var(--foreground)]">
                      Content
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <nav
          id="dashboard-sidebar-nav"
          className="dashboard-scroll flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto overflow-x-hidden overscroll-y-contain px-3 py-3"
          aria-label="Primary">
          {nav.map((item) => (
            <button
              key={item.id}
              type="button"
              title={sidebarCollapsed ? item.label : undefined}
              aria-current={active === item.id ? "page" : undefined}
              onClick={() => setSection(item.id)}
              className={`flex w-full min-h-[44px] items-center rounded-xl text-left text-[13px] font-medium leading-snug tracking-tight transition ${
                sidebarCollapsed ? "justify-center px-0" : "gap-3 px-3"
              } ${
                active === item.id
                  ? "sidebar-nav-active"
                  : "text-[var(--foreground-secondary)] hover:bg-[var(--accent-fill)] hover:text-[var(--foreground)]"
              }`}>
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center text-[15px] leading-none"
                aria-hidden>
                {item.icon}
              </span>
              {!sidebarCollapsed && (
                <span className="min-w-0 flex-1 truncate py-0.5">
                  {item.label}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="shrink-0 space-y-2 border-t border-[var(--border)] px-3 pb-4 pt-3">
          <button
            type="button"
            onClick={handleLogout}
            className={`neu-surface-inset flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-[12px] font-semibold text-[var(--foreground)] transition hover:opacity-95 ${
              sidebarCollapsed ? "px-0" : "px-3"
            }`}>
            {!sidebarCollapsed && <span>Sign out</span>}
            {sidebarCollapsed && (
              <span className="text-sm" aria-hidden>
                ⎋
              </span>
            )}
          </button>
          <Link
            href="https://nyraai-website.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            title={sidebarCollapsed ? "Visit marketing site" : undefined}
            className={`neu-surface-inset flex items-center justify-center gap-2 rounded-xl py-2.5 text-[12px] font-semibold text-[var(--foreground)] transition hover:opacity-95 ${
              sidebarCollapsed ? "px-0" : "px-3"
            }`}>
            {!sidebarCollapsed && <span>Marketing site</span>}
            {sidebarCollapsed && (
              <span className="text-sm" aria-hidden>
                ↗
              </span>
            )}
            {!sidebarCollapsed && <span aria-hidden>↗</span>}
          </Link>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="shrink-0 border-b border-[var(--border)] bg-[var(--background)] px-3 py-3 sm:px-5">
          <div className="mx-auto flex max-w-[1600px] min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="min-w-0 sm:max-w-xl">
              <p className="truncate text-[12px] text-[var(--foreground-secondary)]">
                API base:{" "}
                <code className="rounded bg-[var(--surface-muted)] px-1.5 py-0.5 text-[11px]">
                  {getApiBase()}
                </code>
              </p>
            </div>
            <div className="flex shrink-0 items-center justify-end">
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="dashboard-scroll min-h-0 flex-1 space-y-6 overflow-x-hidden overflow-y-auto overscroll-y-contain p-3 sm:p-4 md:space-y-8 md:p-6">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl">
                {headerTitle}
              </h1>
              <p className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-[var(--foreground-secondary)]">
                {headerSubtitle}
              </p>
            </div>
          </div>

          {error && (
            <div
              className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-[14px] text-[var(--foreground)]"
              role="alert">
              {error}
            </div>
          )}

          {active === "overview" ? (
            <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--foreground-secondary)]">
                  Modules
                </h2>
                <button
                  type="button"
                  onClick={() => void loadModulesList()}
                  disabled={listLoading}
                  className="rounded-lg px-3 py-1.5 text-[12px] font-semibold text-[var(--accent)] transition hover:bg-[var(--accent-fill)] disabled:opacity-50">
                  {listLoading ? "Refreshing…" : "Refresh"}
                </button>
              </div>
              <div className="neu-surface overflow-hidden p-0">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] text-left text-[13px]">
                    <thead>
                      <tr className="text-[11px] font-semibold uppercase tracking-wide text-[var(--foreground-secondary)]">
                        <th className="neu-surface-inset-deep px-4 py-3 sm:px-5">
                          Module
                        </th>
                        <th className="neu-surface-inset-deep px-2 py-3">
                          Title
                        </th>
                        <th className="neu-surface-inset-deep px-2 py-3">
                          Status
                        </th>
                        <th className="neu-surface-inset-deep px-4 py-3 text-right sm:px-5">
                          Version
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {modulesList && modulesList.length > 0 ? (
                        modulesList.map((row, i) => {
                          const meta = listRowMeta(row, i);
                          return (
                            <tr
                              key={meta.key}
                              className="transition hover:bg-[var(--accent-fill)]">
                              <td className="px-4 py-3 font-mono text-[12px] text-[var(--foreground)] sm:px-5">
                                {meta.key}
                              </td>
                              <td className="max-w-[200px] truncate px-2 py-3 text-[var(--foreground)]">
                                {meta.title}
                              </td>
                              <td className="px-2 py-3 capitalize text-[var(--foreground-secondary)]">
                                {meta.status}
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-[12px] text-[var(--foreground-secondary)] sm:px-5">
                                {meta.version}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-4 py-8 text-center text-[13px] text-[var(--foreground-secondary)] sm:px-5">
                            {listLoading
                              ? "Loading modules…"
                              : "No rows returned. Check GET /api/content/modules response shape."}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              <p className="text-[13px] leading-relaxed text-[var(--foreground-secondary)]">
                Public site should use{" "}
                <code className="rounded bg-[var(--surface-muted)] px-1.5 py-0.5 text-[12px]">
                  /api/public-content
                </code>{" "}
                only. Select a module in the sidebar to view versioned payload
                and publish state.
              </p>
            </section>
          ) : (
            <section className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                {moduleData && (
                  <>
                    <span className="neu-surface-inset rounded-lg px-3 py-1.5 text-[12px] font-medium text-[var(--foreground)]">
                      v{moduleData.version}
                    </span>
                    <span className="neu-surface-inset rounded-lg px-3 py-1.5 text-[12px] capitalize text-[var(--foreground-secondary)]">
                      {moduleData.status ?? "unknown"}
                    </span>
                    <span className="text-[12px] text-[var(--foreground-secondary)]">
                      {moduleSummaryLine(moduleData)}
                    </span>
                  </>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void loadModule()}
                  disabled={moduleLoading}
                  className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-[12px] font-semibold text-[var(--foreground)] transition hover:opacity-90 disabled:opacity-50">
                  {moduleLoading ? "Loading…" : "Refetch module"}
                </button>
                <button
                  type="button"
                  onClick={handlePublish}
                  disabled={
                    moduleLoading || !moduleData || moduleData.status === "published"
                  }
                  className="rounded-lg bg-[var(--accent)] px-3 py-2 text-[12px] font-semibold text-[var(--background)] transition hover:opacity-90 disabled:opacity-40">
                  Publish
                </button>
                <button
                  type="button"
                  onClick={handleUnpublish}
                  disabled={
                    moduleLoading || !moduleData || moduleData.status !== "published"
                  }
                  className="rounded-lg border border-[var(--border)] px-3 py-2 text-[12px] font-semibold text-[var(--foreground)] transition hover:bg-[var(--accent-fill)] disabled:opacity-40">
                  Unpublish
                </button>
                <button
                  type="button"
                  onClick={copyJson}
                  disabled={!jsonPreview}
                  className="rounded-lg px-3 py-2 text-[12px] font-semibold text-[var(--accent)] transition hover:bg-[var(--accent-fill)] disabled:opacity-40">
                  Copy JSON
                </button>
              </div>
              <div className="neu-surface overflow-hidden p-0">
                <pre className="dashboard-scroll max-h-[min(70vh,720px)] overflow-auto p-4 text-[11px] leading-relaxed text-[var(--foreground)] sm:p-5 sm:text-[12px]">
                  {moduleLoading && !moduleData
                    ? "Loading…"
                    : jsonPreview || "No data."}
                </pre>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
