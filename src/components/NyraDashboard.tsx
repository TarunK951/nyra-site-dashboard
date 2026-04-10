"use client";

import Link from "next/link";
import { useState } from "react";

const nav = [
  { id: "overview", label: "Overview", icon: "◆" },
  { id: "analytics", label: "Real-time analytics", icon: "◇" },
  { id: "workflows", label: "Workflows", icon: "⚙" },
  { id: "insights", label: "Insights", icon: "✦" },
  { id: "security", label: "Security", icon: "◎" },
] as const;

const kpis = [
  {
    label: "Productivity lift",
    value: "34%",
    hint: "vs. baseline quarter",
    trend: "+6%",
  },
  {
    label: "Faster decisions",
    value: "2.1×",
    hint: "time to aligned action",
    trend: "+12%",
  },
  {
    label: "Cost reduction",
    value: "18%",
    hint: "automated handoffs",
    trend: "+3%",
  },
  {
    label: "Uptime SLA",
    value: "99.95%",
    hint: "governed model ops",
    trend: "steady",
  },
];

const industries = [
  { name: "Fintech", value: 82 },
  { name: "Healthcare", value: 74 },
  { name: "Retail", value: 68 },
  { name: "Manufacturing", value: 61 },
  { name: "Logistics", value: 77 },
];

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
];

export function NyraDashboard() {
  const [active, setActive] = useState<(typeof nav)[number]["id"]>("overview");

  return (
    <div className="nyra-grid-bg relative flex min-h-screen">
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-950/40 via-transparent to-cyan-950/30"
        aria-hidden
      />
      <aside className="relative z-10 flex w-64 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur-xl">
        <div className="flex items-center gap-3 border-b border-[var(--border)] px-5 py-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/30 to-cyan-500/20 text-sm font-bold tracking-tight ring-1 ring-white/10">
            N
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
              NyraAI
            </p>
            <p className="text-sm font-semibold text-zinc-100">Console</p>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 p-3">
          {nav.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActive(item.id)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                active === item.id
                  ? "bg-[var(--accent-dim)] text-violet-100 ring-1 ring-violet-500/30"
                  : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
              }`}
            >
              <span className="text-base opacity-80" aria-hidden>
                {item.icon}
              </span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="border-t border-[var(--border)] p-4">
          <Link
            href="https://nyraai-website.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-lg border border-[var(--border)] bg-white/5 px-3 py-2.5 text-xs font-medium text-zinc-300 transition hover:bg-white/10 hover:text-white"
          >
            Visit marketing site
            <span aria-hidden>↗</span>
          </Link>
          <p className="mt-3 text-center text-[10px] leading-relaxed text-zinc-600">
            hello@nyra.ai
          </p>
        </div>
      </aside>

      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] bg-[var(--surface)]/40 px-6 py-4 backdrop-blur-md">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.25em] text-zinc-500">
              Intelligence redefined
            </p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight text-zinc-50">
              Operations overview
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <p className="text-xs text-zinc-500">Environment</p>
              <p className="text-sm font-medium text-emerald-400/90">Production</p>
            </div>
            <div className="relative h-12 w-12 shrink-0">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-500 via-fuchsia-500/80 to-cyan-400 opacity-90 blur-md" />
              <div className="relative flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-cyan-600 text-xs font-bold text-white shadow-lg ring-2 ring-white/20">
                AI
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 space-y-8 overflow-auto p-6">
          <section>
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-zinc-500">
              Key metrics
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {kpis.map((k) => (
                <div
                  key={k.label}
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)]/80 p-4 shadow-sm ring-1 ring-white/5"
                >
                  <p className="text-xs text-zinc-500">{k.label}</p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight text-zinc-50">
                    {k.value}
                  </p>
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="text-zinc-500">{k.hint}</span>
                    <span
                      className={
                        k.trend === "steady"
                          ? "text-zinc-500"
                          : "text-emerald-400/90"
                      }
                    >
                      {k.trend}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="grid gap-8 lg:grid-cols-5">
            <section className="lg:col-span-3">
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-zinc-500">
                AI adoption ROI — by industry
              </h2>
              <div className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)]/60 p-5">
                <p className="text-sm text-zinc-400">
                  Relative maturity score (demo). Mirrors the narrative on your
                  public site—aligned teams, faster reporting, governed models.
                </p>
                <ul className="space-y-3">
                  {industries.map((row) => (
                    <li key={row.name} className="flex items-center gap-3">
                      <span className="w-28 shrink-0 text-sm text-zinc-300">
                        {row.name}
                      </span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-800">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-all"
                          style={{ width: `${row.value}%` }}
                        />
                      </div>
                      <span className="w-10 text-right text-xs tabular-nums text-zinc-500">
                        {row.value}%
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            <section className="lg:col-span-2">
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-zinc-500">
                Live activity
              </h2>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)]/60 p-0">
                <ul className="divide-y divide-white/5">
                  {activity.map((a) => (
                    <li key={a.title} className="px-4 py-3">
                      <p className="text-sm font-medium text-zinc-200">
                        {a.title}
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-500">{a.meta}</p>
                    </li>
                  ))}
                </ul>
                <div className="border-t border-[var(--border)] px-4 py-3">
                  <p className="text-xs text-zinc-500">
                    Sync in real time · enterprise security · automated workflows
                  </p>
                </div>
              </div>
            </section>
          </div>

          <section className="rounded-xl border border-dashed border-violet-500/25 bg-violet-950/20 px-5 py-4">
            <p className="text-sm text-zinc-300">
              <span className="font-medium text-violet-200">Nyra AI</span> turns
              messy customer and ops data into live strategy—this console is a
              starting point for the same story: signal, motion, and governed
              scale.
            </p>
          </section>
        </main>
      </div>
    </div>
  );
}
