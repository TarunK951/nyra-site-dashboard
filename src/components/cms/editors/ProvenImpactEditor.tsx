"use client";

import { useCallback, useMemo, useState } from "react";
import {
  ConflictError,
  replaceModule,
  type ContentModulePayload,
} from "@/lib/content-api";
import { ensureModuleAfterMutation } from "@/lib/cms-refresh";
import {
  type ProvenImpactData,
  getProvenImpactData,
} from "@/lib/content-types";
import { Field, FormAlert, Modal, ToolbarButton, inputClass } from "../shared";
import type { EditorProps } from "../editor-types";

function getEmptyState(): ProvenImpactData {
  return {
    stats: [
      { id: "stat-1", value: "", label: "Productivity Increase" },
      { id: "stat-2", value: "", label: "Faster Decision Making" },
      { id: "stat-3", value: "", label: "Cost Reduction" },
      { id: "stat-4", value: "", label: "Uptime SLA" },
    ],
    chartData: [
      { id: "chart-1", label: "Fintech", percentage: 0 },
      { id: "chart-2", label: "Healthcare", percentage: 0 },
      { id: "chart-3", label: "Retail", percentage: 0 },
      { id: "chart-4", label: "Manufacturing", percentage: 0 },
      { id: "chart-5", label: "Logistics", percentage: 0 },
    ],
    quote: { text: "", author: "", role: "" },
  };
}

function formDefaults(mod: ContentModulePayload): ProvenImpactData {
  const fromApi = getProvenImpactData(mod);
  const emptyQuote =
    !(fromApi.quote.text ?? "").trim() &&
    !(fromApi.quote.author ?? "").trim() &&
    !(fromApi.quote.role ?? "").trim();
  if (
    fromApi.stats.length === 0 &&
    fromApi.chartData.length === 0 &&
    emptyQuote
  ) {
    return getEmptyState();
  }
  return fromApi;
}

export function ProvenImpactEditor({
  token,
  moduleKey,
  moduleData,
  onModuleUpdated,
  reloadModule,
}: EditorProps) {
  const data = useMemo(() => getProvenImpactData(moduleData), [moduleData]);

  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState<ProvenImpactData>(() =>
    formDefaults(moduleData),
  );
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const openForm = useCallback(() => {
    setFormData(formDefaults(moduleData));
    setFormError(null);
    setModalOpen(true);
  }, [moduleData]);

  const handleStatChange = (index: number, value: string) => {
    const newStats = [...formData.stats];
    newStats[index] = { ...newStats[index], value };
    setFormData({ ...formData, stats: newStats });
  };

  const handleChartChange = (index: number, percentage: number) => {
    const newChart = [...formData.chartData];
    newChart[index] = { ...newChart[index], percentage };
    setFormData({ ...formData, chartData: newChart });
  };

  const handleQuoteChange = (
    field: keyof ProvenImpactData["quote"],
    value: string,
  ) => {
    setFormData({
      ...formData,
      quote: { ...formData.quote, [field]: value },
    });
  };

  const save = useCallback(async () => {
    setBusy(true);
    setFormError(null);
    try {
      const next = await replaceModule(token, moduleKey, {
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
          stats: formData.stats,
          chartData: formData.chartData,
          quote: formData.quote,
        },
      });
      const mod = await ensureModuleAfterMutation(token, moduleKey, next);
      onModuleUpdated(mod);
      setModalOpen(false);
    } catch (e) {
      if (e instanceof ConflictError) {
        await reloadModule();
        setFormError(
          `${e.message} The latest version was loaded — review the form and try Save again.`,
        );
      } else {
        setFormError(e instanceof Error ? e.message : "Save failed.");
      }
    } finally {
      setBusy(false);
    }
  }, [
    formData,
    moduleData.status,
    moduleData.title,
    moduleData.version,
    moduleKey,
    onModuleUpdated,
    reloadModule,
    token,
  ]);

  const panelClass =
    "neu-panel rounded-[var(--radius-panel)] border border-solid [border-color:var(--divider-soft)] shadow-[var(--shadow-button)]";
  const innerTileClass =
    "rounded-xl border border-solid [border-color:var(--divider-soft)] bg-[var(--accent-fill)] px-3 py-3 sm:px-4 sm:py-3.5";

  const showStats = data.stats.length > 0;
  const showChart = data.chartData.length > 0;
  const showQuote =
    !!(data.quote.text ?? "").trim() ||
    !!(data.quote.author ?? "").trim() ||
    !!(data.quote.role ?? "").trim();
  const showPreview = showStats || showChart || showQuote;
  const previewColumnCount =
    Number(showStats) + Number(showChart) + Number(showQuote);

  const sectionLabelClass =
    "text-[11px] font-semibold uppercase tracking-wider text-[var(--foreground-secondary)]";
  const columnClass = "min-w-0 space-y-3";

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <ToolbarButton variant="primary" onClick={openForm} disabled={busy}>
          Add our proven impact
        </ToolbarButton>
      </div>

      <div className="flex justify-start">
        <div className="w-full max-w-5xl space-y-4">
          {!showPreview ? (
            <div className={`${panelClass} p-4`}>
              <p className="text-[13px] leading-relaxed text-[var(--foreground-secondary)]">
                No impact content loaded yet. Add content with the button
                above; it is saved to the content API with version checking.
              </p>
            </div>
          ) : null}

          {showPreview ? (
            <div
              className={`${panelClass} box-border p-5 sm:p-6 lg:px-8 lg:py-7`}>
              <div
                className={`grid min-w-0 grid-cols-1 gap-8 lg:items-start lg:gap-x-8 lg:gap-y-0 xl:gap-x-10 ${
                  previewColumnCount === 3
                    ? "lg:grid-cols-3"
                    : previewColumnCount === 2
                      ? "lg:grid-cols-2"
                      : "lg:grid-cols-1"
                }`}>
                {showStats ? (
                  <section className={columnClass}>
                    <p className={sectionLabelClass}>Statistics</p>
                    <div className="grid grid-cols-2 gap-2 sm:gap-3">
                      {data.stats.map((stat) => (
                        <div key={stat.id} className={innerTileClass}>
                          <p className="text-base font-semibold tabular-nums text-[var(--text-heading)] sm:text-lg">
                            {(stat.value ?? "").trim() || "—"}
                          </p>
                          <p className="mt-1 text-[11px] leading-snug text-[var(--foreground-secondary)] sm:text-[12px]">
                            {(stat.label ?? "").trim() || "—"}
                          </p>
                        </div>
                      ))}
                    </div>
                  </section>
                ) : null}

                {showChart ? (
                  <section className={columnClass}>
                    <p className={sectionLabelClass}>Adoption by industry</p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
                      {data.chartData.map((row) => (
                        <div key={row.id} className={innerTileClass}>
                          <p className="text-[12px] font-medium text-[var(--text-heading)] sm:text-[13px]">
                            {(row.label ?? "").trim() || "—"}
                          </p>
                          <p className="mt-1.5 text-base font-semibold tabular-nums text-[var(--text-heading)] sm:text-lg">
                            {typeof row.percentage === "number" &&
                            row.percentage > 0
                              ? `${row.percentage}%`
                              : "—"}
                          </p>
                        </div>
                      ))}
                    </div>
                  </section>
                ) : null}

                {showQuote ? (
                  <section className={columnClass}>
                    <p className={sectionLabelClass}>Testimonial</p>
                    <div
                      className={`${innerTileClass} flex min-h-[7.5rem] flex-col justify-center py-4 min-w-0`}>
                      <p className="break-words text-[13px] italic leading-relaxed text-[var(--text-heading)] sm:text-[14px]">
                        {(data.quote.text ?? "").trim()
                          ? `“${data.quote.text.trim()}”`
                          : "—"}
                      </p>
                      <p className="mt-3 text-[12px] text-[var(--foreground-secondary)]">
                        {(data.quote.author ?? "").trim() || "—"}
                        {(data.quote.role ?? "").trim()
                          ? ` · ${(data.quote.role ?? "").trim()}`
                          : ""}
                      </p>
                    </div>
                  </section>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <Modal
        open={modalOpen}
        title="Proven impact"
        onClose={() => !busy && setModalOpen(false)}>
        <FormAlert message={formError} />
        <div className="space-y-10">
          <div>
            <h4 className="mb-5 border-b border-solid [border-color:var(--divider-soft)] pb-2 text-sm font-semibold uppercase tracking-wider text-[var(--foreground-secondary)]">
              Top statistics
            </h4>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {formData.stats.map((stat, i) => (
                <Field key={stat.id} label={`${stat.label} value`}>
                  <input
                    className={inputClass()}
                    value={stat.value}
                    placeholder="e.g. 378%"
                    onChange={(e) => handleStatChange(i, e.target.value)}
                  />
                </Field>
              ))}
            </div>
          </div>

          <div>
            <h4 className="mb-5 border-b border-solid [border-color:var(--divider-soft)] pb-2 text-sm font-semibold uppercase tracking-wider text-[var(--foreground-secondary)]">
              AI adoption ROI (%)
            </h4>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              {formData.chartData.map((chart, i) => (
                <Field key={chart.id} label={chart.label}>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    className={inputClass()}
                    value={chart.percentage || ""}
                    placeholder="e.g. 94"
                    onChange={(e) =>
                      handleChartChange(i, Number(e.target.value) || 0)
                    }
                  />
                </Field>
              ))}
            </div>
          </div>

          <div>
            <h4 className="mb-5 border-b border-solid [border-color:var(--divider-soft)] pb-2 text-sm font-semibold uppercase tracking-wider text-[var(--foreground-secondary)]">
              Testimonial quote
            </h4>
            <div className="space-y-5">
              <Field label="Quote text">
                <textarea
                  className={`${inputClass()} min-h-[100px] py-3`}
                  value={formData.quote.text}
                  placeholder="NyraAI reduced reporting cycles…"
                  onChange={(e) => handleQuoteChange("text", e.target.value)}
                />
              </Field>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field label="Author name">
                  <input
                    className={inputClass()}
                    value={formData.quote.author}
                    placeholder="e.g. Mira Singh"
                    onChange={(e) =>
                      handleQuoteChange("author", e.target.value)
                    }
                  />
                </Field>
                <Field label="Role / company">
                  <input
                    className={inputClass()}
                    value={formData.quote.role}
                    placeholder="e.g. COO at NovaGrid Systems"
                    onChange={(e) => handleQuoteChange("role", e.target.value)}
                  />
                </Field>
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-end gap-3 border-t border-solid [border-color:var(--divider-soft)] pt-6">
            <ToolbarButton onClick={() => setModalOpen(false)} disabled={busy}>
              Cancel
            </ToolbarButton>
            <ToolbarButton variant="primary" onClick={() => void save()} disabled={busy}>
              {busy ? "Saving…" : "Save"}
            </ToolbarButton>
          </div>
        </div>
      </Modal>
    </div>
  );
}
