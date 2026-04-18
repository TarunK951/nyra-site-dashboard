"use client";

import {
  ConflictError,
  createCollectionItem,
  deleteCollectionItem,
  updateCollectionItem,
} from "@/lib/content-api";
import { ensureModuleAfterMutation } from "@/lib/cms-refresh";
import { RowDeleteButton, RowEditButton } from "@/components/cms/RowActionIcons";
import { newId, impactStats, impactRois, type ImpactStat, type ImpactRoi } from "@/lib/content-types";
import {
  Field,
  FormAlert,
  Modal,
  ConfirmDialog,
  ToolbarButton,
  inputClass,
} from "../shared";
import type { EditorProps } from "../editor-types";
import { useCallback, useState } from "react";

export function ImpactEditor(props: EditorProps) {
  return (
    <div className="space-y-8">
      <section>
        <h3 className="mb-4 text-sm font-semibold text-[var(--foreground)]">Proven Impact Stats</h3>
        <StatsEditor {...props} />
      </section>
      <section>
        <h3 className="mb-4 text-sm font-semibold text-[var(--foreground)]">AI Adoption ROI</h3>
        <RoisEditor {...props} />
      </section>
    </div>
  );
}

function StatsEditor({
  token,
  moduleKey,
  moduleData,
  onModuleUpdated,
  reloadModule,
  onError,
}: EditorProps) {
  const items = impactStats(moduleData);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ImpactStat | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ImpactStat | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ value?: string; label?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);

  const COLLECTION = "stats";

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditing(null);
    setFieldErrors({});
    setFormError(null);
  }, []);

  const save = useCallback(async () => {
    if (!editing) return;
    const value = (editing.value ?? "").trim();
    const label = (editing.label ?? "").trim();
    const nextErr: { value?: string; label?: string } = {};
    if (!value) nextErr.value = "Value is required.";
    if (!label) nextErr.label = "Label is required.";
    
    if (Object.keys(nextErr).length > 0) {
      setFieldErrors(nextErr);
      setFormError(null);
      return;
    }
    const item = { ...editing, value, label };
    setFieldErrors({});
    setBusy(true);
    setFormError(null);
    try {
      const v = moduleData.version;
      let next;
      if (items.some((x) => x.id === item.id)) {
        next = await updateCollectionItem(token, moduleKey, COLLECTION, item.id, v, item);
      } else {
        next = await createCollectionItem(token, moduleKey, COLLECTION, v, item);
      }
      if (next) {
        const mod = await ensureModuleAfterMutation(token, moduleKey, next);
        onModuleUpdated(mod);
      }
      closeModal();
    } catch (e) {
      if (e instanceof ConflictError) {
        await reloadModule();
        setFormError(`${e.message} Latest version was loaded. Try Saving again.`);
      } else {
        setFormError(e instanceof Error ? e.message : "Save failed.");
      }
    } finally {
      setBusy(false);
    }
  }, [editing, items, moduleData.version, moduleKey, onModuleUpdated, reloadModule, token, closeModal]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      const next = await deleteCollectionItem(token, moduleKey, COLLECTION, deleteTarget.id, moduleData.version);
      if (next) {
        const mod = await ensureModuleAfterMutation(token, moduleKey, next);
        onModuleUpdated(mod);
      }
      setDeleteTarget(null);
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

  return (
    <div className="space-y-4">
      <ToolbarButton
        variant="primary"
        onClick={() => {
          setEditing({ id: newId("stat"), value: "", label: "", visible: true });
          setFieldErrors({});
          setFormError(null);
          setModalOpen(true);
        }}
        disabled={busy}>
        Add stat
      </ToolbarButton>
      <div className="neu-panel overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[360px] text-left text-[13px]">
            <thead>
              <tr className="text-[11px] font-semibold text-[var(--foreground-secondary)]">
                <th className="neu-surface-inset-deep px-4 py-3">Value</th>
                <th className="neu-surface-inset-deep px-2 py-3">Label</th>
                <th className="neu-surface-inset-deep px-2 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-[var(--foreground-secondary)]">
                    No stats yet.
                  </td>
                </tr>
              ) : (
                items.map((row) => (
                  <tr key={row.id} className="hover:bg-[var(--accent-fill)]">
                    <td className="px-4 py-3 font-medium">{row.value ?? "—"}</td>
                    <td className="px-2 py-3">{row.label ?? "—"}</td>
                    <td className="whitespace-nowrap px-2 py-3 text-right">
                      <RowEditButton
                        onClick={() => {
                          setEditing({ ...row });
                          setFieldErrors({});
                          setFormError(null);
                          setModalOpen(true);
                        }}
                        disabled={busy}
                        ariaLabel={`Edit stat ${row.label}`}
                      />
                      <RowDeleteButton
                        onClick={() => setDeleteTarget(row)}
                        disabled={busy}
                        ariaLabel={`Delete stat ${row.label}`}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modalOpen} title={editing && items.some((x) => x.id === editing.id) ? "Edit stat" : "New stat"} onClose={() => !busy && closeModal()}>
        {editing && (
          <div className="space-y-3">
            <FormAlert message={formError} />
            <Field label="Value *" error={fieldErrors.value}>
              <input
                className={inputClass(!!fieldErrors.value)}
                value={editing.value ?? ""}
                onChange={(e) => {
                  setEditing({ ...editing, value: e.target.value });
                  setFieldErrors((f) => ({ ...f, value: undefined }));
                }}
                placeholder="e.g. 248%"
              />
            </Field>
            <Field label="Label *" error={fieldErrors.label}>
              <input
                className={inputClass(!!fieldErrors.label)}
                value={editing.label ?? ""}
                onChange={(e) => {
                  setEditing({ ...editing, label: e.target.value });
                  setFieldErrors((f) => ({ ...f, label: undefined }));
                }}
                placeholder="e.g. Productivity Increase"
              />
            </Field>
            <label className="flex items-center gap-2 text-[13px]">
              <input
                type="checkbox"
                checked={editing.visible !== false}
                onChange={(e) => setEditing({ ...editing, visible: e.target.checked })}
              />
              Visible
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <ToolbarButton onClick={closeModal} disabled={busy}>Cancel</ToolbarButton>
              <ToolbarButton variant="primary" onClick={() => void save()} disabled={busy}>
                {busy ? "Saving…" : "Save"}
              </ToolbarButton>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete stat?"
        message={deleteTarget ? `Remove stat “${deleteTarget.label}”?` : ""}
        confirmLabel="Delete"
        busy={busy}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}

function RoisEditor({
  token,
  moduleKey,
  moduleData,
  onModuleUpdated,
  reloadModule,
  onError,
}: EditorProps) {
  const items = impactRois(moduleData);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ImpactRoi | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ImpactRoi | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ industry?: string; percentage?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);

  const COLLECTION = "rois";

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditing(null);
    setFieldErrors({});
    setFormError(null);
  }, []);

  const save = useCallback(async () => {
    if (!editing) return;
    const industry = (editing.industry ?? "").trim();
    const nextErr: { industry?: string; percentage?: string } = {};
    if (!industry) nextErr.industry = "Industry name is required.";
    if (editing.percentage === undefined || isNaN(editing.percentage)) nextErr.percentage = "Percentage is required.";
    
    if (Object.keys(nextErr).length > 0) {
      setFieldErrors(nextErr);
      setFormError(null);
      return;
    }
    const item = { ...editing, industry };
    setFieldErrors({});
    setBusy(true);
    setFormError(null);
    try {
      const v = moduleData.version;
      let next;
      if (items.some((x) => x.id === item.id)) {
        next = await updateCollectionItem(token, moduleKey, COLLECTION, item.id, v, item);
      } else {
        next = await createCollectionItem(token, moduleKey, COLLECTION, v, item);
      }
      if (next) {
        const mod = await ensureModuleAfterMutation(token, moduleKey, next);
        onModuleUpdated(mod);
      }
      closeModal();
    } catch (e) {
      if (e instanceof ConflictError) {
        await reloadModule();
        setFormError(`${e.message} Latest version was loaded. Try Saving again.`);
      } else {
        setFormError(e instanceof Error ? e.message : "Save failed.");
      }
    } finally {
      setBusy(false);
    }
  }, [editing, items, moduleData.version, moduleKey, onModuleUpdated, reloadModule, token, closeModal]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      const next = await deleteCollectionItem(token, moduleKey, COLLECTION, deleteTarget.id, moduleData.version);
      if (next) {
        const mod = await ensureModuleAfterMutation(token, moduleKey, next);
        onModuleUpdated(mod);
      }
      setDeleteTarget(null);
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

  return (
    <div className="space-y-4">
      <ToolbarButton
        variant="primary"
        onClick={() => {
          setEditing({ id: newId("roi"), industry: "", percentage: 50, visible: true });
          setFieldErrors({});
          setFormError(null);
          setModalOpen(true);
        }}
        disabled={busy}>
        Add ROI entry
      </ToolbarButton>
      <div className="neu-panel overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[360px] text-left text-[13px]">
            <thead>
              <tr className="text-[11px] font-semibold text-[var(--foreground-secondary)]">
                <th className="neu-surface-inset-deep px-4 py-3">Industry</th>
                <th className="neu-surface-inset-deep px-2 py-3">Percentage</th>
                <th className="neu-surface-inset-deep px-2 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-[var(--foreground-secondary)]">
                    No ROI entries yet.
                  </td>
                </tr>
              ) : (
                items.map((row) => (
                  <tr key={row.id} className="hover:bg-[var(--accent-fill)]">
                    <td className="px-4 py-3 font-medium">{row.industry ?? "—"}</td>
                    <td className="px-2 py-3">{row.percentage ?? 0}%</td>
                    <td className="whitespace-nowrap px-2 py-3 text-right">
                      <RowEditButton
                        onClick={() => {
                          setEditing({ ...row });
                          setFieldErrors({});
                          setFormError(null);
                          setModalOpen(true);
                        }}
                        disabled={busy}
                        ariaLabel={`Edit ${row.industry}`}
                      />
                      <RowDeleteButton
                        onClick={() => setDeleteTarget(row)}
                        disabled={busy}
                        ariaLabel={`Delete ${row.industry}`}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modalOpen} title={editing && items.some((x) => x.id === editing.id) ? "Edit ROI" : "New ROI"} onClose={() => !busy && closeModal()}>
        {editing && (
          <div className="space-y-3">
            <FormAlert message={formError} />
            <Field label="Industry *" error={fieldErrors.industry}>
              <input
                className={inputClass(!!fieldErrors.industry)}
                value={editing.industry ?? ""}
                onChange={(e) => {
                  setEditing({ ...editing, industry: e.target.value });
                  setFieldErrors((f) => ({ ...f, industry: undefined }));
                }}
                placeholder="e.g. Fintech"
              />
            </Field>
            <Field label="Percentage *" error={fieldErrors.percentage}>
              <input
                type="number"
                min="0"
                max="100"
                className={inputClass(!!fieldErrors.percentage)}
                value={editing.percentage ?? ""}
                onChange={(e) => {
                  setEditing({ ...editing, percentage: parseInt(e.target.value, 10) || 0 });
                  setFieldErrors((f) => ({ ...f, percentage: undefined }));
                }}
              />
            </Field>
            <label className="flex items-center gap-2 text-[13px]">
              <input
                type="checkbox"
                checked={editing.visible !== false}
                onChange={(e) => setEditing({ ...editing, visible: e.target.checked })}
              />
              Visible
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <ToolbarButton onClick={closeModal} disabled={busy}>Cancel</ToolbarButton>
              <ToolbarButton variant="primary" onClick={() => void save()} disabled={busy}>
                {busy ? "Saving…" : "Save"}
              </ToolbarButton>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete ROI entry?"
        message={deleteTarget ? `Remove ROI for “${deleteTarget.industry}”?` : ""}
        confirmLabel="Delete"
        busy={busy}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
