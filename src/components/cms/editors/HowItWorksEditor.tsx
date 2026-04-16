"use client";

import {
  ConflictError,
  createCollectionItem,
  deleteCollectionItem,
  updateCollectionItem,
} from "@/lib/content-api";
import { ensureModuleAfterMutation } from "@/lib/cms-refresh";
import { RowDeleteButton, RowEditButton } from "@/components/cms/RowActionIcons";
import { howItWorksSteps, newId, type HowItWorksStep } from "@/lib/content-types";
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

const COLLECTION = "steps";

function emptyItem(order: number): HowItWorksStep {
  return {
    id: newId("step"),
    number: order,
    title: "",
    shortLabel: "",
    description: "",
    icon: "activity",
    visible: true,
  };
}

export function HowItWorksEditor({
  token,
  moduleKey,
  moduleData,
  onModuleUpdated,
  reloadModule,
  onError,
}: EditorProps) {
  const items = howItWorksSteps(moduleData);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<HowItWorksStep | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<HowItWorksStep | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ title?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditing(null);
    setFieldErrors({});
    setFormError(null);
  }, []);

  const save = useCallback(async () => {
    if (!editing) return;
    const title = (editing.title ?? "").trim();
    if (!title) {
      setFieldErrors({ title: "Title is required." });
      setFormError(null);
      return;
    }
    const item = { ...editing, title };
    setFieldErrors({});
    setBusy(true);
    setFormError(null);
    try {
      const v = moduleData.version;
      const next = items.some((x) => x.id === item.id)
        ? await updateCollectionItem(
            token,
            moduleKey,
            COLLECTION,
            item.id,
            v,
            item,
          )
        : await createCollectionItem(
            token,
            moduleKey,
            COLLECTION,
            v,
            item,
          );
      const mod = await ensureModuleAfterMutation(token, moduleKey, next);
      onModuleUpdated(mod);
      closeModal();
    } catch (e) {
      if (e instanceof ConflictError) {
        await reloadModule();
        setFormError(
          `${e.message} Latest version was loaded — review the form and try Save again.`,
        );
      } else {
        setFormError(e instanceof Error ? e.message : "Save failed.");
      }
    } finally {
      setBusy(false);
    }
  }, [
    closeModal,
    editing,
    items,
    moduleData.version,
    moduleKey,
    onModuleUpdated,
    reloadModule,
    token,
  ]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      const next = await deleteCollectionItem(
        token,
        moduleKey,
        COLLECTION,
        deleteTarget.id,
        moduleData.version,
      );
      const mod = await ensureModuleAfterMutation(token, moduleKey, next);
      onModuleUpdated(mod);
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
          setEditing(emptyItem(items.length + 1));
          setFieldErrors({});
          setFormError(null);
          setModalOpen(true);
        }}
        disabled={busy}>
        Add step
      </ToolbarButton>
      <div className="neu-panel overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-[13px]">
            <thead>
              <tr className="text-[11px] font-semibold text-[var(--foreground-secondary)]">
                <th className="neu-surface-inset-deep px-4 py-3">#</th>
                <th className="neu-surface-inset-deep px-2 py-3">Title</th>
                <th className="neu-surface-inset-deep px-2 py-3 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-[var(--foreground-secondary)]">
                    No steps yet.
                  </td>
                </tr>
              ) : (
                items.map((row) => (
                  <tr key={row.id} className="hover:bg-[var(--accent-fill)]">
                    <td className="px-4 py-3 font-mono">{row.number ?? "—"}</td>
                    <td className="px-2 py-3">{row.title ?? row.id}</td>
                    <td className="whitespace-nowrap px-2 py-3 text-right">
                      <RowEditButton
                        onClick={() => {
                          setEditing({ ...row });
                          setFieldErrors({});
                          setFormError(null);
                          setModalOpen(true);
                        }}
                        disabled={busy}
                        ariaLabel={`Edit step ${row.title ?? row.id}`}
                      />
                      <RowDeleteButton
                        onClick={() => setDeleteTarget(row)}
                        disabled={busy}
                        ariaLabel={`Delete step ${row.title ?? row.id}`}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={modalOpen}
        title={
          editing && items.some((x) => x.id === editing.id)
            ? "Edit step"
            : "New step"
        }
        onClose={() => !busy && closeModal()}>
        {editing && (
          <div className="space-y-3">
            <FormAlert message={formError} />
            <Field label="Number">
              <input
                type="number"
                className={inputClass()}
                value={editing.number ?? ""}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    number: Number(e.target.value) || 0,
                  })
                }
              />
            </Field>
            <Field label="Title *" error={fieldErrors.title}>
              <input
                className={inputClass(!!fieldErrors.title)}
                value={editing.title ?? ""}
                aria-invalid={!!fieldErrors.title}
                onChange={(e) => {
                  setEditing({ ...editing, title: e.target.value });
                  setFieldErrors((f) => ({ ...f, title: undefined }));
                }}
              />
            </Field>
            <Field label="Short label">
              <input
                className={inputClass()}
                value={editing.shortLabel ?? ""}
                onChange={(e) =>
                  setEditing({ ...editing, shortLabel: e.target.value })
                }
              />
            </Field>
            <Field label="Description">
              <textarea
                className={`${inputClass()} min-h-[88px]`}
                value={editing.description ?? ""}
                onChange={(e) =>
                  setEditing({ ...editing, description: e.target.value })
                }
              />
            </Field>
            <Field label="Icon key">
              <input
                className={inputClass()}
                value={editing.icon ?? ""}
                onChange={(e) =>
                  setEditing({ ...editing, icon: e.target.value })
                }
              />
            </Field>
            <label className="flex items-center gap-2 text-[13px]">
              <input
                type="checkbox"
                checked={editing.visible !== false}
                onChange={(e) =>
                  setEditing({ ...editing, visible: e.target.checked })
                }
              />
              Visible
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <ToolbarButton onClick={closeModal} disabled={busy}>
                Cancel
              </ToolbarButton>
              <ToolbarButton variant="primary" onClick={() => void save()} disabled={busy}>
                {busy ? "Saving…" : "Save"}
              </ToolbarButton>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete step?"
        message={
          deleteTarget
            ? `Remove step “${deleteTarget.title ?? deleteTarget.id}”? This cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        busy={busy}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
