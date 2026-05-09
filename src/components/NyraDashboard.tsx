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
  type ReactNode,
} from "react";

import { ModuleWorkspace } from "@/components/cms/ModuleWorkspace";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  clearPersistedSessionTokens,
  ConflictError,
  fetchModule,
  login,
  persistSessionTokens,
  publishModule,
  TOKEN_STORAGE_KEY,
  unpublishModule,
  type ContentModulePayload,
} from "@/lib/content-api";
import {
  isModuleKey,
  MODULE_KEYS,
  MODULE_LABELS,
  MODULE_SUBTITLES,
  OVERVIEW_MODULE_LABELS,
  type ModuleKey,
  type NavId,
} from "@/lib/content-modules";
import { getModuleItemCount } from "@/lib/content-types";
const IconOverview = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="5" height="5" rx="1" />
    <rect x="9" y="2" width="5" height="5" rx="1" />
    <rect x="2" y="9" width="5" height="5" rx="1" />
    <rect x="9" y="9" width="5" height="5" rx="1" />
  </svg>
);
const IconBlogs = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 2H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V6L9 2z" />
    <path d="M9 2v4h4" />
    <line x1="5" y1="9" x2="11" y2="9" />
    <line x1="5" y1="11.5" x2="8.5" y2="11.5" />
  </svg>
);
const IconTestimonials = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 1.5l1.7 3.4 3.8.55-2.75 2.68.65 3.77L8 9.9l-3.4 1.8.65-3.77L2.5 5.45l3.8-.55z" />
  </svg>
);
const IconTeam = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="6" cy="5" r="2.5" />
    <path d="M1 13c0-2.76 2.24-5 5-5s5 2.24 5 5" />
    <path d="M11 7.5a2 2 0 0 0 0 4M13 7.5a2 2 0 0 1 2 2v3" />
  </svg>
);
const IconFaq = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8" cy="8" r="6" />
    <path d="M6.2 6a2 2 0 0 1 3.8.8c0 1.4-2 2-2 2.8" />
    <circle cx="8" cy="12" r="0.5" fill="currentColor" stroke="none" />
  </svg>
);
const IconFeatures = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="8,1 10.2,5.5 15,6.2 11.5,9.6 12.4,14.4 8,12 3.6,14.4 4.5,9.6 1,6.2 5.8,5.5" />
  </svg>
);
const IconHowItWorks = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8" cy="8" r="3" />
    <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.1 3.1l1.4 1.4M11.5 11.5l1.4 1.4M3.1 12.9l1.4-1.4M11.5 4.5l1.4-1.4" />
  </svg>
);
const IconSalesTeam = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 2h2.5l1 2.5-1.5 1a8 8 0 0 0 3.5 3.5l1-1.5L12 8.5V11a1 1 0 0 1-1 1C5.4 12 2 7.2 2 3a1 1 0 0 1 1-1z" />
  </svg>
);
const IconProvenImpact = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="2,12 5,8 8,10 11,5 14,7" />
    <line x1="2" y1="14" x2="14" y2="14" />
  </svg>
);
const IconSignOut = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" />
    <polyline points="10,11 14,8 10,5" />
    <line x1="14" y1="8" x2="6" y2="8" />
  </svg>
);
const IconExternalLink = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 3H3a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1V9" />
    <polyline points="10,2 14,2 14,6" />
    <line x1="14" y1="2" x2="8" y2="8" />
  </svg>
);

const MODULE_ICONS: Record<ModuleKey, ReactNode> = {
  blogs: <IconBlogs />,
  testimonials: <IconTestimonials />,
  team: <IconTeam />,
  faq: <IconFaq />,
  features: <IconFeatures />,
  how_it_works: <IconHowItWorks />,
  sales_team: <IconSalesTeam />,
  proven_impact: <IconProvenImpact />,
};

const HIDDEN_MODULES = new Set<ModuleKey>([
  "features",
  "how_it_works",
  "sales_team",
  "proven_impact",
  "team",
]);

const VISIBLE_MODULE_KEYS = MODULE_KEYS.filter((k) => !HIDDEN_MODULES.has(k));

const nav = [
  { id: "overview" as const, label: "Overview", icon: <IconOverview /> },
  ...VISIBLE_MODULE_KEYS.map((id) => ({
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

  useEffect(() => {
    setSidebarCollapsed(window.innerWidth < 1024);
  }, []);

  const [authReady, setAuthReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [overviewCounts, setOverviewCounts] = useState<
    Partial<Record<ModuleKey, number>>
  >({});
  const [overviewLoading, setOverviewLoading] = useState(false);

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

  useEffect(() => {
    const onTokensUpdated = (e: Event) => {
      const d = (e as CustomEvent<{ accessToken?: string }>).detail;
      if (d?.accessToken) setToken(d.accessToken);
    };
    const onAuthCleared = () => {
      setToken(null);
      setModuleData(null);
      setOverviewCounts({});
    };
    window.addEventListener("nyra-tokens-updated", onTokensUpdated);
    window.addEventListener("nyra-auth-cleared", onAuthCleared);
    return () => {
      window.removeEventListener("nyra-tokens-updated", onTokensUpdated);
      window.removeEventListener("nyra-auth-cleared", onAuthCleared);
    };
  }, []);

  const loadOverviewCounts = useCallback(async () => {
    if (!token) return;
    setOverviewLoading(true);
    setError(null);
    try {
      const settled = await Promise.allSettled(
        VISIBLE_MODULE_KEYS.map(async (key) => {
          const mod = await fetchModule(token, key);
          return { key, count: getModuleItemCount(mod, key) };
        }),
      );
      const next: Partial<Record<ModuleKey, number>> = {};
      let failed = 0;
      for (const s of settled) {
        if (s.status === "fulfilled") {
          next[s.value.key] = s.value.count;
        } else {
          failed += 1;
        }
      }
      setOverviewCounts(next);
      if (failed > 0) {
        setError(
          failed === VISIBLE_MODULE_KEYS.length
            ? "Could not load module counts. Check the API and your token."
            : `Could not load ${failed} module(s). Some counts may be missing.`,
        );
      }
    } catch (e) {
      setOverviewCounts({});
      setError(e instanceof Error ? e.message : "Failed to load counts");
    } finally {
      setOverviewLoading(false);
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
    if (!authReady || !token || active !== "overview") return;
    void loadOverviewCounts();
  }, [authReady, token, active, loadOverviewCounts]);

  useEffect(() => {
    if (!authReady || !token) return;
    void loadModule();
  }, [authReady, token, active, loadModule]);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setAuthBusy(true);
    setError(null);
    try {
      const tokens = await login(email.trim(), password);
      persistSessionTokens(
        tokens.accessToken,
        tokens.refreshToken !== undefined ? tokens.refreshToken : null,
      );
      setToken(tokens.accessToken);
      setPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setAuthBusy(false);
    }
  };

  const handleLogout = () => {
    clearPersistedSessionTokens();
    setToken(null);
    setOverviewCounts({});
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
      : MODULE_SUBTITLES[active as ModuleKey];


  if (!authReady) {
    return (
      <div className="flex h-svh items-center justify-center bg-[var(--background)] text-[var(--foreground-secondary)] leading-relaxed">
        Loading…
      </div>
    );
  }

  if (!token) {
    return (
      <div className="nyra-shell-bg flex min-h-svh w-full items-center justify-center bg-[var(--background)] p-4 sm:p-8">
        <div className="neu-panel w-full max-w-md p-8 sm:p-10">
          <div className="mb-8 flex flex-col items-center text-center sm:mb-10">
            <span className="neu-pill mb-5">
              <span aria-hidden>✦</span> NyraAI
            </span>
            <div className="relative mx-auto mb-4 h-12 w-20">
              <Image
                src="/nyraai-logo.png"
                alt=""
                width={160}
                height={64}
                className="h-12 w-20 object-contain"
                priority
              />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-[1.65rem]">
              Content console
            </h1>
            <p className="mt-2 max-w-sm text-[14px] leading-relaxed text-[var(--foreground-secondary)]">
              Sign in to manage website modules and published content.
            </p>
          </div>
          <form className="space-y-4" onSubmit={handleLogin}>
            {error && (
              <p
                className="rounded-[var(--radius-panel)] bg-[color-mix(in_srgb,var(--foreground)_6%,var(--surface))] px-4 py-3 text-[13px] leading-relaxed text-[var(--text-heading)]"
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
                className="neu-surface-inset neu-input-focus w-full rounded-xl px-3 py-2.5 text-[14px] text-[var(--foreground)]"
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
                className="neu-surface-inset neu-input-focus w-full rounded-xl px-3 py-2.5 text-[14px] text-[var(--foreground)]"
                required
              />
            </label>
            <button
              type="submit"
              disabled={authBusy}
              className="neu-btn-primary mt-2 flex w-full items-center justify-center py-3.5 text-[14px] disabled:opacity-60">
              {authBusy ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="nyra-shell-bg flex h-svh max-h-svh min-h-0 w-full overflow-hidden bg-[var(--background)]">
      <aside
        className={`hidden md:flex h-full min-h-0 shrink-0 flex-col overflow-hidden border-r border-solid [border-color:var(--divider-soft)] bg-[var(--background)] transition-[width] duration-300 ease-out ${
          sidebarCollapsed
            ? "w-[var(--sidebar-collapsed)] min-w-[var(--sidebar-collapsed)]"
            : "w-[var(--sidebar-expanded)] min-w-[var(--sidebar-expanded)]"
        }`}>
        <div className="flex min-h-[var(--shell-header-min-h)] shrink-0 flex-col justify-center border-b border-solid [border-color:var(--divider-soft)] p-3">
          <div
            className={
              sidebarCollapsed
                ? "flex flex-col items-center gap-2.5"
                : "flex items-start gap-2.5"
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
              <div className="neu-surface-sm min-w-0 flex-1 px-2.5 py-2">
                <div className="flex items-center gap-2">
                  <div className="relative h-7 w-11 shrink-0">
                    <Image
                      src="/nyraai-logo.png"
                      alt=""
                      width={96}
                      height={40}
                      className="h-7 w-11 object-contain object-left"
                      priority
                      aria-hidden
                    />
                  </div>
                  <div className="min-w-0 flex-1 leading-tight">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--foreground-secondary)]">
                      NyraAI
                    </p>
                    <p className="text-[13px] font-semibold tracking-tight text-[var(--foreground)]">
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
                  : "text-[var(--foreground-secondary)] hover:bg-[var(--accent-fill)] hover:text-[var(--text-heading)] active:shadow-[var(--shadow-inset-press)]"
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

        <div className="shrink-0 space-y-2 border-t border-solid [border-color:var(--divider-soft)] px-3 pb-4 pt-3">
          <button
            type="button"
            onClick={handleLogout}
            className={`neu-surface-inset flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-[12px] font-semibold text-[var(--foreground)] transition hover:opacity-95 ${
              sidebarCollapsed ? "px-0" : "px-3"
            }`}>
            {!sidebarCollapsed && <span>Sign out</span>}
            <span aria-hidden className={sidebarCollapsed ? "" : "ml-auto opacity-60"}>
              <IconSignOut />
            </span>
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
            <span aria-hidden className={sidebarCollapsed ? "" : "ml-auto opacity-60"}>
              <IconExternalLink />
            </span>
          </Link>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex min-h-[var(--shell-header-min-h)] shrink-0 flex-col justify-center border-b border-solid [border-color:var(--divider-soft)] bg-[var(--background)] py-3 ps-5 pe-5 sm:ps-6 sm:pe-6 md:ps-8 md:pe-8">
          <div className="flex w-full min-w-0 flex-row items-center justify-between gap-3">
            {/* Mobile: logo + current section name */}
            <div className="flex min-w-0 flex-1 items-center gap-3 md:hidden">
              <div className="relative h-7 w-11 shrink-0">
                <Image src="/nyraai-logo.png" alt="" width={96} height={40} className="h-7 w-11 object-contain object-left" priority aria-hidden />
              </div>
              <p className="truncate text-[13px] font-semibold tracking-tight text-[var(--text-heading)]">
                {nav.find((n) => n.id === active)?.label ?? "Dashboard"}
              </p>
            </div>
            {/* Desktop: persistent title */}
            <div className="hidden md:flex min-w-0 flex-1 flex-col">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--foreground-secondary)]">
                NyraAI
              </p>
              <p className="text-[15px] font-semibold tracking-tight text-[var(--text-heading)]">
                Website Management
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="dashboard-scroll min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain p-5 pb-[calc(var(--mobile-nav-h)+1.25rem)] sm:p-6 sm:pb-[calc(var(--mobile-nav-h)+1.5rem)] md:p-8 md:pb-8">

          {error && (
            <div
              className="mb-6 rounded-[var(--radius-panel)] bg-[color-mix(in_srgb,var(--foreground)_6%,var(--surface))] px-5 py-4 text-[14px] leading-relaxed text-[var(--text-heading)] shadow-[var(--shadow-button)]"
              role="alert">
              {error}
            </div>
          )}

          {active === "overview" ? (
            <section className="space-y-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <span className="neu-pill mb-3 inline-flex">
                    <span aria-hidden>◆</span> Overview
                  </span>
                  <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-heading)]">
                    Website content
                  </h1>
                  <p className="mt-1 text-[14px] text-[var(--foreground-secondary)]">
                    Click a module to start editing.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void loadOverviewCounts()}
                  disabled={overviewLoading}
                  className="neu-btn-default shrink-0 px-5 py-2.5 text-[12px] disabled:opacity-50">
                  {overviewLoading ? "Refreshing…" : "Refresh"}
                </button>
              </div>
              <div className="neu-panel overflow-hidden p-0">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[360px] text-left text-[13px] leading-[1.65]">
                    <thead>
                      <tr className="text-[11px] font-semibold uppercase tracking-wide text-[var(--foreground-secondary)]">
                        <th className="neu-surface-inset-deep px-5 py-4 first:rounded-tl-[var(--radius-panel)]">
                          Module
                        </th>
                        <th className="neu-surface-inset-deep px-5 py-4 text-right last:rounded-tr-[var(--radius-panel)]">
                          Items
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {VISIBLE_MODULE_KEYS.map((key) => {
                        const count = overviewCounts[key];
                        const hasCount = typeof count === "number";
                        return (
                          <tr
                            key={key}
                            className="cursor-pointer transition hover:bg-[var(--accent-fill)] active:bg-[var(--accent-fill-active)]"
                            onClick={() => setSection(key)}
                            title={`Open ${OVERVIEW_MODULE_LABELS[key]}`}>
                            <td className="px-5 py-4 font-medium text-[var(--text-heading)]">
                              {OVERVIEW_MODULE_LABELS[key]}
                            </td>
                            <td className="px-5 py-4 text-right tabular-nums text-[var(--foreground-secondary)]">
                              {overviewLoading && !hasCount
                                ? "…"
                                : hasCount
                                  ? count
                                  : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          ) : (
            <section className="space-y-6">
              {/* Page header: title + actions in one row */}
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-heading)]">
                    {headerTitle}
                  </h1>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {moduleData ? (
                      <>
                        <span className="rounded-full border border-[var(--divider-soft)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--foreground-secondary)]">
                          v{moduleData.version}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${
                            moduleData.status === "published"
                              ? "bg-[color-mix(in_srgb,var(--trend-up)_12%,transparent)] text-[var(--trend-up)]"
                              : "border border-[var(--divider-soft)] text-[var(--foreground-secondary)]"
                          }`}>
                          {moduleData.status ?? "unknown"}
                        </span>
                      </>
                    ) : (
                      <span className="text-[13px] text-[var(--foreground-secondary)]">
                        {moduleLoading ? "Loading…" : "No data"}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void loadModule()}
                    disabled={moduleLoading}
                    className="neu-btn-default px-4 py-2 text-[12px] disabled:opacity-50">
                    {moduleLoading ? "Loading…" : "Refresh"}
                  </button>
                  <button
                    type="button"
                    onClick={handlePublish}
                    disabled={
                      moduleLoading || !moduleData || moduleData.status === "published"
                    }
                    className="neu-btn-primary px-5 py-2 text-[12px] disabled:opacity-40">
                    Publish
                  </button>
                </div>
              </div>

              {/* Content area */}
              {moduleLoading && !moduleData ? (
                <p className="text-[14px] leading-relaxed text-[var(--foreground-secondary)]">
                  Loading module…
                </p>
              ) : moduleData && token ? (
                <div className="space-y-6">
                  <ModuleWorkspace
                    moduleKey={active as ModuleKey}
                    token={token}
                    moduleData={moduleData}
                    onModuleUpdated={setModuleData}
                    reloadModule={loadModule}
                    onError={setError}
                  />
                </div>
              ) : (
                <p className="text-[14px] text-[var(--foreground-secondary)]">
                  No data.
                </p>
              )}
            </section>
          )}
        </main>

        {/* Mobile / tablet bottom nav — hidden on md+ where sidebar takes over */}
        <nav
          className="mobile-nav-bar flex md:hidden h-[var(--mobile-nav-h)] items-stretch"
          aria-label="Primary navigation">
          {nav.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-current={active === item.id ? "page" : undefined}
              onClick={() => setSection(item.id)}
              className={`flex flex-1 flex-col items-center justify-center gap-1 px-1 transition-colors ${
                active === item.id
                  ? "bottom-nav-active"
                  : "text-[var(--foreground-secondary)] hover:text-[var(--text-heading)]"
              }`}>
              <span className="flex h-5 w-5 items-center justify-center" aria-hidden>
                {item.icon}
              </span>
              <span className="text-[10px] font-medium leading-none truncate max-w-[3.5rem]">
                {item.label}
              </span>
            </button>
          ))}
          <button
            type="button"
            onClick={handleLogout}
            className="flex flex-1 flex-col items-center justify-center gap-1 px-1 text-[var(--foreground-secondary)] transition-colors hover:text-[var(--text-heading)]"
            aria-label="Sign out">
            <span className="flex h-5 w-5 items-center justify-center" aria-hidden>
              <IconSignOut />
            </span>
            <span className="text-[10px] font-medium leading-none">Sign out</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
