"use client";

import { useCallback, useMemo, useState } from "react";
import {
  ConflictError,
  replaceModule,
} from "@/lib/content-api";
import { ensureModuleAfterMutation } from "@/lib/cms-refresh";
import {
  type ProvenImpactData,
  type ImpactStat,
  type ImpactChartItem,
  type ImpactQuote,
  getProvenImpactData,
  newId,
} from "@/lib/content-types";
import { ModuleItemCard } from "@/components/cms/ModuleItemCard";
import {
  ConfirmDialog,
  Field,
  FormAlert,
  Modal,
  ToolbarButton,
  inputClass,
} from "../shared";
import type { EditorProps } from "../editor-types";

const MAX_STATS = 5;
const MAX_CHART_ITEMS = 5;

const limitMessage = (n: number) =>
  `Add only ${n} cards for a better site experience.`;

function emptyStat(): ImpactStat {
  return { id: newId("stat"), value: "", label: "" };
}

function emptyChart(): ImpactChartItem {
  return { id: newId("chart"), label: "", percentage: 0 };
}

function emptyQuote(): ImpactQuote {
  return { text: "", author: "", role: "" };
}

function quoteIsEmpty(q: ImpactQuote | undefined | null): boolean {
  if (!q) return true;
  return (
    !(q.text ?? "").trim() &&
    !(q.author ?? "").trim() &&
    !(q.role ?? "").trim()
  );
}

export function ProvenImpactEditor({
  token,
  moduleKey,
  moduleData,
  onModuleUpdated,
  reloadModule,
  onError,
}: EditorProps) {
  const data = useMemo(() => getProvenImpactData(moduleData), [moduleData]);

  const [editingStat, setEditingStat] = useState<ImpactStat | null>(null);
  const [statIsNew, setStatIsNew] = useState(false);
  const [editingChart, setEditingChart] = useState<ImpactChartItem | null>(null);
  const [chartIsNew, setChartIsNew] = useState(false);
  const [editingQuote, setEditingQuote] = useState<ImpactQuote | null>(null);
  const [quoteIsNew, setQuoteIsNew] = useState(false);

  const [deleteStat, setDeleteStat] = useState<ImpactStat | null>(null);
  const [deleteChart, setDeleteChart] = useState<ImpactChartItem | null>(null);
  const [deleteQuoteOpen, setDeleteQuoteOpen] = useState(false);

  const [statErrors, setStatErrors] = useState<{ label?: string }>({});
  const [chartErrors, setChartErrors] = useState<{
    label?: string;
    percentage?: string;
  }>({});
  const [quoteErrors, setQuoteErrors] = useState<{ text?: string }>({});

  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  const persist = useCallback(
    async (next: ProvenImpactData): Promise<boolean> => {
      setBusy(true);
      setFormError(null);
      try {
        const updated = await replaceModule(token, moduleKey, {
          expected_version: moduleData.version,
          title:
            typeof moduleData.title === "string" && moduleData.title.trim()
              ? moduleData.title
              : "Our Proven Impact",
          status:
            typeof moduleData.status === "string" && moduleData.status
              ? moduleData.status
              : "draft",
          content: {
            stats: next.stats,
            chartData: next.chartData,
            quote: next.quote,
          },
        });
        const mod = await ensureModuleAfterMutation(token, moduleKey, updated);
        onModuleUpdated(mod);
        return true;
      } catch (e) {
        if (e instanceof ConflictError) {
          await reloadModule();
          setFormError(
            `${e.message} The latest version was loaded — review and try again.`,
          );
        } else {
          setFormError(e instanceof Error ? e.message : "Save failed.");
        }
        return false;
      } finally {
        setBusy(false);
      }
    },
    [
      moduleData.status,
      moduleData.title,
      moduleData.version,
      moduleKey,
      onModuleUpdated,
      reloadModule,
      token,
    ],
  );

  // ────────── stats ──────────
  const openAddStat = () => {
    if (data.stats.length >= MAX_STATS) {
      setPageError(limitMessage(MAX_STATS));
      return;
    }
    setPageError(null);
    setFormError(null);
    setStatErrors({});
    setEditingStat(emptyStat());
    setStatIsNew(true);
  };

  const openEditStat = (stat: ImpactStat) => {
    setFormError(null);
    setStatErrors({});
    setEditingStat({ ...stat });
    setStatIsNew(false);
  };

  const saveStat = async () => {
    if (!editingStat) return;
    const label = (editingStat.label ?? "").trim();
    const value = (editingStat.value ?? "").trim();
    if (!label) {
      setStatErrors({ label: "Static name is required." });
      return;
    }
    const item: ImpactStat = { ...editingStat, label, value };
    let nextStats: ImpactStat[];
    if (statIsNew) {
      if (data.stats.length >= MAX_STATS) {
        setFormError(limitMessage(MAX_STATS));
        return;
      }
      nextStats = [...data.stats, item];
    } else {
      nextStats = data.stats.map((s) => (s.id === item.id ? item : s));
    }
    const ok = await persist({ ...data, stats: nextStats });
    if (ok) {
      setEditingStat(null);
      setStatErrors({});
    }
  };

  const removeStat = async () => {
    if (!deleteStat) return;
    const nextStats = data.stats.filter((s) => s.id !== deleteStat.id);
    setBusy(true);
    try {
      const updated = await replaceModule(token, moduleKey, {
        expected_version: moduleData.version,
        title:
          typeof moduleData.title === "string" && moduleData.title.trim()
            ? moduleData.title
            : "Our Proven Impact",
        status:
          typeof moduleData.status === "string" && moduleData.status
            ? moduleData.status
            : "draft",
        content: {
          stats: nextStats,
          chartData: data.chartData,
          quote: data.quote,
        },
      });
      const mod = await ensureModuleAfterMutation(token, moduleKey, updated);
      onModuleUpdated(mod);
      setDeleteStat(null);
    } catch (e) {
      if (e instanceof ConflictError) {
        await reloadModule();
        onError(`${e.message} Reloaded latest version.`);
      } else {
        onError(e instanceof Error ? e.message : "Delete failed");
      }
    } finally {
      setBusy(false);
    }
  };

  // ────────── chart (adoption) ──────────
  const openAddChart = () => {
    if (data.chartData.length >= MAX_CHART_ITEMS) {
      setPageError(limitMessage(MAX_CHART_ITEMS));
      return;
    }
    setPageError(null);
    setFormError(null);
    setChartErrors({});
    setEditingChart(emptyChart());
    setChartIsNew(true);
  };

  const openEditChart = (item: ImpactChartItem) => {
    setFormError(null);
    setChartErrors({});
    setEditingChart({ ...item });
    setChartIsNew(false);
  };

  const saveChart = async () => {
    if (!editingChart) return;
    const label = (editingChart.label ?? "").trim();
    const pct = Number.isFinite(editingChart.percentage)
      ? Number(editingChart.percentage)
      : 0;
    const errs: { label?: string; percentage?: string } = {};
    if (!label) errs.label = "Industry name is required.";
    if (pct < 0 || pct > 100) errs.percentage = "Percentage must be 0–100.";
    if (Object.keys(errs).length > 0) {
      setChartErrors(errs);
      return;
    }
    const item: ImpactChartItem = { ...editingChart, label, percentage: pct };
    let nextChart: ImpactChartItem[];
    if (chartIsNew) {
      if (data.chartData.length >= MAX_CHART_ITEMS) {
        setFormError(limitMessage(MAX_CHART_ITEMS));
        return;
      }
      nextChart = [...data.chartData, item];
    } else {
      nextChart = data.chartData.map((c) => (c.id === item.id ? item : c));
    }
    const ok = await persist({ ...data, chartData: nextChart });
    if (ok) {
      setEditingChart(null);
      setChartErrors({});
    }
  };

  const removeChart = async () => {
    if (!deleteChart) return;
    const nextChart = data.chartData.filter((c) => c.id !== deleteChart.id);
    setBusy(true);
    try {
      const updated = await replaceModule(token, moduleKey, {
        expected_version: moduleData.version,
        title:
          typeof moduleData.title === "string" && moduleData.title.trim()
            ? moduleData.title
            : "Our Proven Impact",
        status:
          typeof moduleData.status === "string" && moduleData.status
            ? moduleData.status
            : "draft",
        content: {
          stats: data.stats,
          chartData: nextChart,
          quote: data.quote,
        },
      });
      const mod = await ensureModuleAfterMutation(token, moduleKey, updated);
      onModuleUpdated(mod);
      setDeleteChart(null);
    } catch (e) {
      if (e instanceof ConflictError) {
        await reloadModule();
        onError(`${e.message} Reloaded latest version.`);
      } else {
        onError(e instanceof Error ? e.message : "Delete failed");
      }
    } finally {
      setBusy(false);
    }
  };

  // ────────── quote (testimonial) ──────────
  const hasQuote = !quoteIsEmpty(data.quote);

  const openAddQuote = () => {
    if (hasQuote) {
      setPageError(limitMessage(1));
      return;
    }
    setPageError(null);
    setFormError(null);
    setQuoteErrors({});
    setEditingQuote(emptyQuote());
    setQuoteIsNew(true);
  };

  const openEditQuote = () => {
    setFormError(null);
    setQuoteErrors({});
    setEditingQuote({ ...data.quote });
    setQuoteIsNew(false);
  };

  const saveQuote = async () => {
    if (!editingQuote) return;
    const text = (editingQuote.text ?? "").trim();
    if (!text) {
      setQuoteErrors({ text: "Quote text is required." });
      return;
    }
    const next: ImpactQuote = {
      text,
      author: (editingQuote.author ?? "").trim(),
      role: (editingQuote.role ?? "").trim(),
    };
    const ok = await persist({ ...data, quote: next });
    if (ok) {
      setEditingQuote(null);
      setQuoteErrors({});
    }
  };

  const removeQuote = async () => {
    setBusy(true);
    try {
      const updated = await replaceModule(token, moduleKey, {
        expected_version: moduleData.version,
        title:
          typeof moduleData.title === "string" && moduleData.title.trim()
            ? moduleData.title
            : "Our Proven Impact",
        status:
          typeof moduleData.status === "string" && moduleData.status
            ? moduleData.status
            : "draft",
        content: {
          stats: data.stats,
          chartData: data.chartData,
          quote: emptyQuote(),
        },
      });
      const mod = await ensureModuleAfterMutation(token, moduleKey, updated);
      onModuleUpdated(mod);
      setDeleteQuoteOpen(false);
    } catch (e) {
      if (e instanceof ConflictError) {
        await reloadModule();
        onError(`${e.message} Reloaded latest version.`);
      } else {
        onError(e instanceof Error ? e.message : "Delete failed");
      }
    } finally {
      setBusy(false);
    }
  };

  // ────────── render ──────────
  const sectionHeading =
    "text-[11px] font-semibold uppercase tracking-wider text-[var(--foreground-secondary)]";
  const emptyPanel =
    "neu-panel rounded-[var(--radius-panel)] border border-solid [border-color:var(--divider-soft)] p-6 text-center text-[13px] text-[var(--foreground-secondary)] shadow-[var(--shadow-button)]";

  const atStatsLimit = data.stats.length >= MAX_STATS;
  const atChartLimit = data.chartData.length >= MAX_CHART_ITEMS;

  return (
    <div className="space-y-10">
      {pageError ? (
        <p
          className="text-[13px] text-[var(--foreground-secondary)]"
          role="status">
          {pageError}
        </p>
      ) : null}

      {/* ───── Statistics ───── */}
      <section className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h3 className={sectionHeading}>Statistics</h3>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <ToolbarButton
              variant="primary"
              onClick={openAddStat}
              disabled={busy || atStatsLimit}>
              Add statistic
            </ToolbarButton>
            {atStatsLimit ? (
              <p
                className="text-[12px] text-[var(--foreground-secondary)]"
                role="status">
                {limitMessage(MAX_STATS)}
              </p>
            ) : null}
          </div>
        </div>

        {data.stats.length === 0 ? (
          <div className={emptyPanel}>
            No statistics yet. Add up to {MAX_STATS} cards.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {data.stats.map((stat) => (
              <ModuleItemCard
                key={stat.id}
                title={(stat.label ?? "").trim() || "Untitled stat"}
                onEdit={() => openEditStat(stat)}
                onDelete={() => setDeleteStat(stat)}
                busy={busy}
                editAriaLabel={`Edit statistic ${stat.label ?? stat.id}`}
                deleteAriaLabel={`Delete statistic ${stat.label ?? stat.id}`}>
                <p className="text-2xl font-semibold tabular-nums text-[var(--text-heading)]">
                  {(stat.value ?? "").trim() || "—"}
                </p>
              </ModuleItemCard>
            ))}
          </div>
        )}
      </section>

      {/* ───── Adoption by industry ───── */}
      <section className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h3 className={sectionHeading}>Adoption by industry</h3>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <ToolbarButton
              variant="primary"
              onClick={openAddChart}
              disabled={busy || atChartLimit}>
              Add industry
            </ToolbarButton>
            {atChartLimit ? (
              <p
                className="text-[12px] text-[var(--foreground-secondary)]"
                role="status">
                {limitMessage(MAX_CHART_ITEMS)}
              </p>
            ) : null}
          </div>
        </div>

        {data.chartData.length === 0 ? (
          <div className={emptyPanel}>
            No industries yet. Add up to {MAX_CHART_ITEMS} cards.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {data.chartData.map((item) => (
              <ModuleItemCard
                key={item.id}
                title={(item.label ?? "").trim() || "Untitled industry"}
                onEdit={() => openEditChart(item)}
                onDelete={() => setDeleteChart(item)}
                busy={busy}
                editAriaLabel={`Edit industry ${item.label ?? item.id}`}
                deleteAriaLabel={`Delete industry ${item.label ?? item.id}`}>
                <p className="text-2xl font-semibold tabular-nums text-[var(--text-heading)]">
                  {Number.isFinite(item.percentage) && item.percentage > 0
                    ? `${item.percentage}%`
                    : "—"}
                </p>
              </ModuleItemCard>
            ))}
          </div>
        )}
      </section>

      {/* ───── Testimonial ───── */}
      <section className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h3 className={sectionHeading}>Testimonial</h3>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <ToolbarButton
              variant="primary"
              onClick={openAddQuote}
              disabled={busy || hasQuote}>
              Add testimonial
            </ToolbarButton>
            {hasQuote ? (
              <p
                className="text-[12px] text-[var(--foreground-secondary)]"
                role="status">
                Only one testimonial is allowed.
              </p>
            ) : null}
          </div>
        </div>

        {!hasQuote ? (
          <div className={emptyPanel}>No testimonial yet.</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <ModuleItemCard
              title={(data.quote.author ?? "").trim() || "Testimonial"}
              label={(data.quote.role ?? "").trim() || undefined}
              onEdit={openEditQuote}
              onDelete={() => setDeleteQuoteOpen(true)}
              busy={busy}
              editAriaLabel="Edit testimonial"
              deleteAriaLabel="Delete testimonial">
              <p className="line-clamp-4 italic">
                {(data.quote.text ?? "").trim()
                  ? `“${data.quote.text.trim()}”`
                  : "—"}
              </p>
            </ModuleItemCard>
          </div>
        )}
      </section>

      {/* ───── Stat modal ───── */}
      <Modal
        open={!!editingStat}
        title={statIsNew ? "New statistic" : "Edit statistic"}
        onClose={() => !busy && setEditingStat(null)}>
        {editingStat ? (
          <div className="space-y-3">
            <FormAlert message={formError} />
            <Field label="Static name *" error={statErrors.label}>
              <input
                className={inputClass(!!statErrors.label)}
                value={editingStat.label}
                aria-invalid={!!statErrors.label}
                placeholder="Productivity Increase"
                onChange={(e) => {
                  setEditingStat({ ...editingStat, label: e.target.value });
                  setStatErrors((s) => ({ ...s, label: undefined }));
                }}
              />
            </Field>
            <Field label="Static value">
              <input
                className={inputClass()}
                value={editingStat.value}
                placeholder="e.g. 98 or 378%"
                onChange={(e) =>
                  setEditingStat({ ...editingStat, value: e.target.value })
                }
              />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <ToolbarButton onClick={() => setEditingStat(null)} disabled={busy}>
                Cancel
              </ToolbarButton>
              <ToolbarButton
                variant="primary"
                onClick={() => void saveStat()}
                disabled={busy}>
                {busy ? "Saving…" : statIsNew ? "Create" : "Save"}
              </ToolbarButton>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* ───── Chart modal ───── */}
      <Modal
        open={!!editingChart}
        title={chartIsNew ? "New industry" : "Edit industry"}
        onClose={() => !busy && setEditingChart(null)}>
        {editingChart ? (
          <div className="space-y-3">
            <FormAlert message={formError} />
            <Field label="Industry name *" error={chartErrors.label}>
              <input
                className={inputClass(!!chartErrors.label)}
                value={editingChart.label}
                aria-invalid={!!chartErrors.label}
                placeholder="e.g. Fintech"
                onChange={(e) => {
                  setEditingChart({ ...editingChart, label: e.target.value });
                  setChartErrors((s) => ({ ...s, label: undefined }));
                }}
              />
            </Field>
            <Field label="Percentage (0–100)" error={chartErrors.percentage}>
              <input
                type="number"
                min={0}
                max={100}
                className={inputClass(!!chartErrors.percentage)}
                value={editingChart.percentage || ""}
                aria-invalid={!!chartErrors.percentage}
                placeholder="e.g. 94"
                onChange={(e) => {
                  setEditingChart({
                    ...editingChart,
                    percentage: Number(e.target.value) || 0,
                  });
                  setChartErrors((s) => ({ ...s, percentage: undefined }));
                }}
              />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <ToolbarButton onClick={() => setEditingChart(null)} disabled={busy}>
                Cancel
              </ToolbarButton>
              <ToolbarButton
                variant="primary"
                onClick={() => void saveChart()}
                disabled={busy}>
                {busy ? "Saving…" : chartIsNew ? "Create" : "Save"}
              </ToolbarButton>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* ───── Quote modal ───── */}
      <Modal
        open={!!editingQuote}
        title={quoteIsNew ? "New testimonial" : "Edit testimonial"}
        onClose={() => !busy && setEditingQuote(null)}>
        {editingQuote ? (
          <div className="space-y-3">
            <FormAlert message={formError} />
            <Field label="Quote text *" error={quoteErrors.text}>
              <textarea
                className={`${inputClass(!!quoteErrors.text)} min-h-[100px] py-3`}
                value={editingQuote.text}
                aria-invalid={!!quoteErrors.text}
                placeholder="NyraAI reduced reporting cycles…"
                onChange={(e) => {
                  setEditingQuote({ ...editingQuote, text: e.target.value });
                  setQuoteErrors((s) => ({ ...s, text: undefined }));
                }}
              />
            </Field>
            <Field label="Author name">
              <input
                className={inputClass()}
                value={editingQuote.author}
                placeholder="e.g. Mira Singh"
                onChange={(e) =>
                  setEditingQuote({ ...editingQuote, author: e.target.value })
                }
              />
            </Field>
            <Field label="Role / company">
              <input
                className={inputClass()}
                value={editingQuote.role}
                placeholder="e.g. COO at NovaGrid Systems"
                onChange={(e) =>
                  setEditingQuote({ ...editingQuote, role: e.target.value })
                }
              />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <ToolbarButton onClick={() => setEditingQuote(null)} disabled={busy}>
                Cancel
              </ToolbarButton>
              <ToolbarButton
                variant="primary"
                onClick={() => void saveQuote()}
                disabled={busy}>
                {busy ? "Saving…" : quoteIsNew ? "Create" : "Save"}
              </ToolbarButton>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* ───── Delete confirms ───── */}
      <ConfirmDialog
        open={!!deleteStat}
        title="Delete statistic?"
        message={
          deleteStat
            ? `Remove “${deleteStat.label || deleteStat.id}”? This cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        busy={busy}
        onCancel={() => setDeleteStat(null)}
        onConfirm={() => void removeStat()}
      />
      <ConfirmDialog
        open={!!deleteChart}
        title="Delete industry?"
        message={
          deleteChart
            ? `Remove “${deleteChart.label || deleteChart.id}”? This cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        busy={busy}
        onCancel={() => setDeleteChart(null)}
        onConfirm={() => void removeChart()}
      />
      <ConfirmDialog
        open={deleteQuoteOpen}
        title="Delete testimonial?"
        message="Remove the testimonial? This cannot be undone."
        confirmLabel="Delete"
        busy={busy}
        onCancel={() => setDeleteQuoteOpen(false)}
        onConfirm={() => void removeQuote()}
      />
    </div>
  );
}
