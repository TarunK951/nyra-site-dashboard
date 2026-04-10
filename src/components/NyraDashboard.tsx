"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

import { ThemeToggle } from "@/components/ThemeToggle";

const nav = [
  { id: "overview", label: "Overview", icon: "◆" },
  { id: "analytics", label: "Real-time analytics", icon: "◇" },
  { id: "workflows", label: "Workflows", icon: "⚙" },
  { id: "insights", label: "Insights", icon: "✦" },
  { id: "security", label: "Security", icon: "◎" },
] as const;

export type NavId = (typeof nav)[number]["id"];

const SECTION_HEADER: Record<
  NavId,
  { title: string; subtitle: string }
> = {
  overview: {
    title: "Dashboard",
    subtitle:
      "Welcome back. Here is what is happening with your operations today.",
  },
  analytics: {
    title: "Real-time analytics",
    subtitle:
      "Live throughput, latency, and adoption across your NyraAI workspace.",
  },
  workflows: {
    title: "Workflows",
    subtitle: "Automations, handoffs, and deployment status (demo).",
  },
  insights: {
    title: "Insights",
    subtitle: "Model and business signals curated for operators (demo).",
  },
  security: {
    title: "Security",
    subtitle: "Policies, access, and audit posture for this console (demo).",
  },
};

function parseSection(searchParams: URLSearchParams): NavId {
  const raw = searchParams.get("section");
  if (raw && nav.some((n) => n.id === raw)) {
    return raw as NavId;
  }
  return "overview";
}

const kpis = [
  {
    label: "Productivity lift",
    value: "34%",
    hint: "vs. baseline quarter",
    trend: "+6%",
    trendUp: true,
  },
  {
    label: "Faster decisions",
    value: "2.1×",
    hint: "time to aligned action",
    trend: "+12%",
    trendUp: true,
  },
  {
    label: "Cost reduction",
    value: "18%",
    hint: "automated handoffs",
    trend: "+3%",
    trendUp: true,
  },
  {
    label: "Uptime SLA",
    value: "99.95%",
    hint: "governed model ops",
    trend: "steady",
    trendUp: null,
  },
] as const;

const traffic = [
  { name: "Direct", pct: 35 },
  { name: "Organic", pct: 28 },
  { name: "Referral", pct: 22 },
  { name: "Partner", pct: 15 },
] as const;

const goals = [
  { label: "Quarterly adoption", current: "88%", target: "Target: 90%", pct: 88 },
  { label: "Active workflows", current: "847", target: "Target: 1,000", pct: 85 },
  { label: "Conversion rate", current: "3.8%", target: "Target: 5%", pct: 76 },
] as const;

const chartBars = [42, 65, 48, 72, 55, 80, 62, 88, 74, 91, 68, 84] as const;

const recentOrders = [
  {
    customer: "Emma Wilson",
    email: "emma@example.com",
    orderId: "ORD-7891",
    product: "Enterprise Voice Pack",
    status: "completed",
    amount: "$299.00",
  },
  {
    customer: "James Chen",
    email: "james@company.io",
    orderId: "ORD-7890",
    product: "Team Plan Upgrade",
    status: "processing",
    amount: "$599.00",
  },
  {
    customer: "Sofia Garcia",
    email: "sofia@startup.co",
    orderId: "ORD-7889",
    product: "Compliance Suite",
    status: "completed",
    amount: "$1,499.00",
  },
  {
    customer: "Alex Thompson",
    email: "alex@dev.com",
    orderId: "ORD-7888",
    product: "Starter License",
    status: "pending",
    amount: "$79.00",
  },
  {
    customer: "Maria Santos",
    email: "maria@agency.co",
    orderId: "ORD-7887",
    product: "Enterprise Voice Pack",
    status: "completed",
    amount: "$299.00",
  },
] as const;

const activity = [
  {
    title: "Reporting pipeline refreshed",
    meta: "CRM + warehouse sync · 12 min ago",
  },
  {
    title: "New insight: churn risk segment",
    meta: "Model v3 · reviewed by ops",
  },
  {
    title: "Workflow “Lead follow-up” deployed",
    meta: "Staging → production",
  },
  {
    title: "API latency within SLO",
    meta: "Edge region · 2 hours ago",
  },
  {
    title: "Security review signed off",
    meta: "Quarterly audit · 5 hours ago",
  },
] as const;

function statusStyles(status: string) {
  switch (status) {
    case "completed":
      return "text-[var(--trend-up)]";
    case "processing":
      return "text-[var(--accent)]";
    case "pending":
      return "text-[var(--foreground-secondary)]";
    default:
      return "text-[var(--foreground-secondary)]";
  }
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
      }`}
    >
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

function SearchIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}

function SectionPlaceholder({ section }: { section: NavId }) {
  const item = nav.find((n) => n.id === section);
  return (
    <div className="space-y-6">
      <div className="neu-surface rounded-2xl p-6 sm:p-8">
        <p className="text-[15px] leading-relaxed text-[var(--foreground-secondary)]">
          You are viewing{" "}
          <span className="font-semibold text-[var(--foreground)]">
            {item?.label ?? section}
          </span>
          . This area is a placeholder until you connect routes or live data.
        </p>
      </div>
    </div>
  );
}

export function NyraDashboard() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const active = useMemo(
    () => parseSection(searchParams),
    [searchParams],
  );

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

  const header = SECTION_HEADER[active];

  return (
    <div className="nyra-shell-bg flex h-svh max-h-svh min-h-0 w-full overflow-hidden bg-[var(--background)]">
      <aside
        className={`flex h-full min-h-0 shrink-0 flex-col overflow-hidden border-r border-[var(--border)] bg-[var(--background-subtle)] transition-[width] duration-300 ease-out ${
          sidebarCollapsed
            ? "w-[var(--sidebar-collapsed)] min-w-[var(--sidebar-collapsed)]"
            : "w-[var(--sidebar-expanded)] min-w-[var(--sidebar-expanded)]"
        }`}
      >
        <div className="shrink-0 p-3">
          <div
            className={`neu-surface rounded-xl ${
              sidebarCollapsed
                ? "flex items-center justify-center px-2 py-2.5"
                : "flex items-center gap-3 px-3 py-3"
            }`}
          >
            <button
              type="button"
              onClick={() => setSidebarCollapsed((c) => !c)}
              className="neu-surface-inset flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[var(--foreground)] transition hover:opacity-90"
              aria-expanded={!sidebarCollapsed}
              aria-controls="dashboard-sidebar-nav"
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <ChevronIcon collapsed={sidebarCollapsed} />
            </button>
            {!sidebarCollapsed && (
              <div className="flex min-w-0 flex-1 items-center gap-2.5">
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
                    Console
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <nav
          id="dashboard-sidebar-nav"
          className="dashboard-scroll flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden overscroll-y-contain px-3 py-1"
          aria-label="Primary"
        >
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
              }`}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center text-[15px] leading-none ${
                  sidebarCollapsed ? "" : ""
                }`}
                aria-hidden
              >
                {item.icon}
              </span>
              {!sidebarCollapsed && (
                <span className="min-w-0 flex-1 truncate py-0.5">{item.label}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="shrink-0 border-t border-[var(--border)] px-3 pb-4 pt-3">
          <Link
            href="https://nyraai-website.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            title={sidebarCollapsed ? "Visit marketing site" : undefined}
            className={`neu-surface-inset flex items-center justify-center gap-2 rounded-xl py-2.5 text-[12px] font-semibold text-[var(--foreground)] transition hover:opacity-95 ${
              sidebarCollapsed ? "px-0" : "px-3"
            }`}
          >
            {!sidebarCollapsed && <span>Visit marketing site</span>}
            {sidebarCollapsed && (
              <span className="text-sm" aria-hidden>
                ↗
              </span>
            )}
            {!sidebarCollapsed && <span aria-hidden>↗</span>}
          </Link>
          {!sidebarCollapsed && (
            <p className="mt-2.5 text-center text-[10px] leading-relaxed text-[var(--foreground-secondary)]">
              hello@nyra.ai
            </p>
          )}
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="shrink-0 border-b border-[var(--border)] bg-[var(--background)] px-3 py-3 sm:px-5">
          <div className="mx-auto flex max-w-[1600px] min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <button
              type="button"
              className="neu-surface-inset flex h-11 min-h-[44px] w-full min-w-0 flex-1 items-center gap-3 rounded-xl py-2.5 pl-4 pr-3 text-left text-[13px] text-[var(--foreground-secondary)] sm:min-w-0 lg:max-w-3xl"
              aria-label="Search (demo)"
            >
              <span className="pointer-events-none flex h-[18px] w-[18px] shrink-0 items-center justify-center text-[var(--foreground-secondary)]">
                <SearchIcon />
              </span>
              <span className="min-w-0 flex-1 truncate pr-1">
                Search console, workflows…
              </span>
            </button>
            <div className="flex shrink-0 items-center justify-end sm:justify-end">
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="dashboard-scroll min-h-0 flex-1 space-y-6 overflow-x-hidden overflow-y-auto overscroll-y-contain p-3 sm:p-4 md:space-y-8 md:p-6">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl">
                {header.title}
              </h1>
              <p className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-[var(--foreground-secondary)]">
                {header.subtitle}
              </p>
            </div>
            <div className="shrink-0 pt-1 sm:pt-0 sm:text-right">
              <p className="text-[11px] font-medium text-[var(--foreground-secondary)]">
                Environment
              </p>
              <p className="text-sm font-semibold text-[var(--trend-up)]">
                Production
              </p>
            </div>
          </div>

          {active === "overview" ? (
            <>
              <section>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {kpis.map((k) => (
                <div key={k.label} className="neu-surface p-4 sm:p-5">
                  <p className="text-[12px] font-medium text-[var(--foreground-secondary)]">
                    {k.label}
                  </p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight text-[var(--foreground)]">
                    {k.value}
                  </p>
                  <div className="mt-3 flex items-center justify-between text-[12px]">
                    <span className="text-[var(--foreground-secondary)]">
                      {k.hint}
                    </span>
                    <span
                      className={
                        k.trendUp === null
                          ? "font-medium text-[var(--foreground-secondary)]"
                          : k.trendUp
                            ? "font-semibold text-[var(--trend-up)]"
                            : "font-semibold text-[var(--trend-down)]"
                      }
                    >
                      {k.trend}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--foreground-secondary)]">
                Overview
              </h2>
              <p className="text-[12px] text-[var(--foreground-secondary)]">
                Monthly performance (demo)
              </p>
            </div>
            <div className="neu-surface-lg p-5 sm:p-6">
              <div className="mb-4 flex flex-wrap gap-2">
                {(["Revenue", "Orders", "Adoption"] as const).map((tab, i) => (
                  <button
                    key={tab}
                    type="button"
                    className={
                      i === 0
                        ? "neu-nav-active rounded-lg px-3 py-1.5 text-[12px] font-semibold text-[var(--foreground)]"
                        : "rounded-lg px-3 py-1.5 text-[12px] font-medium text-[var(--foreground-secondary)] transition hover:bg-[var(--accent-fill)]"
                    }
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <div className="chart-placeholder-grid relative h-48 overflow-hidden px-2 pt-4 sm:h-56">
                <div className="absolute bottom-4 left-2 right-2 flex h-[min(160px,55%)] items-end justify-between gap-1">
                  {chartBars.map((h, i) => (
                    <div
                      key={i}
                      className="min-w-0 flex-1 rounded-t-md bg-linear-to-t from-[var(--accent)] to-[var(--accent-bright)] opacity-90"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <section>
              <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--foreground-secondary)]">
                Traffic sources
              </h2>
              <div className="neu-surface space-y-4 p-5 sm:p-6">
                <p className="text-[13px] text-[var(--foreground-secondary)]">
                  Where your console visitors originate (demo).
                </p>
                <p className="text-2xl font-semibold tabular-nums text-[var(--foreground)]">
                  284K
                  <span className="ml-2 text-[13px] font-normal text-[var(--foreground-secondary)]">
                    visits
                  </span>
                </p>
                <ul className="space-y-3">
                  {traffic.map((row) => (
                    <li key={row.name} className="flex items-center gap-3">
                      <span className="w-24 shrink-0 text-[13px] font-medium text-[var(--foreground)]">
                        {row.name}
                      </span>
                      <div className="neu-track h-2.5 flex-1 overflow-hidden p-px">
                        <div
                          className="h-full rounded-full bg-linear-to-r from-[var(--accent)] to-[var(--accent-bright)]"
                          style={{ width: `${row.pct}%` }}
                        />
                      </div>
                      <span className="w-10 text-right text-[12px] tabular-nums text-[var(--foreground-secondary)]">
                        {row.pct}%
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            <section>
              <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--foreground-secondary)]">
                Monthly goals
              </h2>
              <div className="neu-surface space-y-5 p-5 sm:p-6">
                <p className="text-[13px] text-[var(--foreground-secondary)]">
                  Track progress toward operational targets.
                </p>
                <ul className="space-y-4">
                  {goals.map((g) => (
                    <li key={g.label}>
                      <div className="flex items-center justify-between text-[12px]">
                        <span className="font-medium text-[var(--foreground)]">
                          {g.label}
                        </span>
                        <span className="text-[var(--foreground-secondary)]">
                          {g.target}
                        </span>
                      </div>
                      <div className="neu-track mt-2 h-2.5 overflow-hidden p-px">
                        <div
                          className="h-full rounded-full bg-linear-to-r from-[var(--accent)] to-[var(--accent-bright)]"
                          style={{ width: `${g.pct}%` }}
                          aria-hidden
                        />
                      </div>
                      <p className="mt-1.5 text-[13px] font-semibold tabular-nums text-[var(--foreground)]">
                        {g.current}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          </div>

          <div className="grid gap-6 lg:grid-cols-5 lg:gap-8">
            <section className="lg:col-span-3">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--foreground-secondary)]">
                  Recent orders
                </h2>
                <span className="text-[12px] font-medium text-[var(--accent)]">
                  View all
                </span>
              </div>
              <div className="neu-surface overflow-hidden p-0">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-left text-[13px]">
                    <thead>
                      <tr className="text-[11px] font-semibold uppercase tracking-wide text-[var(--foreground-secondary)]">
                        <th className="neu-surface-inset-deep px-4 py-3 sm:px-5">
                          Customer
                        </th>
                        <th className="neu-surface-inset-deep px-2 py-3">
                          Order ID
                        </th>
                        <th className="neu-surface-inset-deep px-2 py-3">
                          Product
                        </th>
                        <th className="neu-surface-inset-deep px-2 py-3">
                          Status
                        </th>
                        <th className="neu-surface-inset-deep px-4 py-3 text-right sm:px-5">
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {recentOrders.map((row) => (
                        <tr
                          key={row.orderId}
                          className="transition hover:bg-[var(--accent-fill)]"
                        >
                          <td className="px-4 py-3.5 sm:px-5">
                            <div className="flex items-center gap-3">
                              <span className="neu-surface-inset flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-[var(--accent)]">
                                {row.customer
                                  .split(" ")
                                  .map((w) => w[0])
                                  .join("")
                                  .slice(0, 2)}
                              </span>
                              <div className="min-w-0">
                                <p className="font-semibold text-[var(--foreground)]">
                                  {row.customer}
                                </p>
                                <p className="truncate text-[12px] text-[var(--foreground-secondary)]">
                                  {row.email}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-2 py-3.5 font-mono text-[12px] text-[var(--foreground-secondary)]">
                            {row.orderId}
                          </td>
                          <td className="max-w-[140px] truncate px-2 py-3.5 text-[var(--foreground)]">
                            {row.product}
                          </td>
                          <td
                            className={`px-2 py-3.5 text-[12px] font-medium capitalize ${statusStyles(row.status)}`}
                          >
                            {row.status}
                          </td>
                          <td className="px-4 py-3.5 text-right font-semibold tabular-nums text-[var(--foreground)] sm:px-5">
                            {row.amount}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            <section className="lg:col-span-2">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--foreground-secondary)]">
                  Recent activity
                </h2>
                <span className="text-[12px] font-medium text-[var(--accent)]">
                  View all
                </span>
              </div>
              <div className="neu-surface overflow-hidden p-0">
                <ul className="divide-y divide-[var(--border)]">
                  {activity.map((a) => (
                    <li key={a.title} className="px-4 py-3.5 sm:px-5">
                      <p className="text-[13px] font-semibold text-[var(--foreground)]">
                        {a.title}
                      </p>
                      <p className="mt-1 text-[12px] text-[var(--foreground-secondary)]">
                        {a.meta}
                      </p>
                    </li>
                  ))}
                </ul>
                <div className="border-t border-[var(--border)] px-4 py-3 sm:px-5">
                  <p className="text-[12px] text-[var(--foreground-secondary)]">
                    Sync in real time · enterprise security · automated workflows
                  </p>
                </div>
              </div>
            </section>
          </div>

          <section className="neu-surface rounded-2xl px-5 py-4 sm:px-6 sm:py-5">
            <p className="text-[15px] leading-relaxed text-[var(--foreground-secondary)]">
              <span className="font-semibold text-[var(--foreground)]">
                Nyra AI
              </span>{" "}
              turns messy customer and ops data into live strategy—this console
              is a starting point for the same story: signal, motion, and governed
              scale.
            </p>
          </section>
            </>
          ) : (
            <SectionPlaceholder section={active} />
          )}
        </main>
      </div>
    </div>
  );
}
