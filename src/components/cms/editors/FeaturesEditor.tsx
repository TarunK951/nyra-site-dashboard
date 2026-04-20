"use client";

import {
  ConflictError,
  createCollectionItem,
  deleteCollectionItem,
  updateCollectionItem,
} from "@/lib/content-api";
import { ensureModuleAfterMutation } from "@/lib/cms-refresh";
import { FeatureMarketingPreview } from "@/components/cms/FeatureMarketingPreview";
import { ModuleItemCard } from "@/components/cms/ModuleItemCard";
import { featureItems, newId, type FeatureItem } from "@/lib/content-types";
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

const COLLECTION = "items";

function emptyItem(): FeatureItem {
  return {
    id: newId("feature"),
    title: "",
    description: "",
    icon: "sparkles",
    colSpan: 1,
    image: "",
    visible: true,
  };
}

export function FeaturesEditor({
  token,
  moduleKey,
  moduleData,
  onModuleUpdated,
  reloadModule,
  onError,
}: EditorProps) {
  const items = featureItems(moduleData);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<FeatureItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FeatureItem | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ title?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [preview, setPreview] = useState<FeatureItem | null>(null);

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
          setPreview(null);
          setEditing(emptyItem());
          setFieldErrors({});
          setFormError(null);
          setModalOpen(true);
        }}
        disabled={busy}>
        Add feature
      </ToolbarButton>
      {items.length === 0 ? (
        <div className="neu-panel rounded-[var(--radius-panel)] border border-solid [border-color:var(--divider-soft)] p-8 text-center text-[14px] text-[var(--foreground-secondary)] shadow-[var(--shadow-button)]">
          No features yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((row) => (
            <ModuleItemCard
              key={row.id}
              title={row.title ?? row.id}
              onView={() => setPreview(row)}
              onPrimaryClick={() => setPreview(row)}
              onEdit={() => {
                setPreview(null);
                setEditing({ ...row });
                setFieldErrors({});
                setFormError(null);
                setModalOpen(true);
              }}
              onDelete={() => setDeleteTarget(row)}
              busy={busy}
              viewAriaLabel={`Preview feature ${row.title ?? row.id}`}
              editAriaLabel={`Edit feature ${row.title ?? row.id}`}
              deleteAriaLabel={`Delete feature ${row.title ?? row.id}`}>
              <p className="text-[11px] font-mono text-[var(--text-muted)]">
                {(row.icon ?? "sparkles").trim()}
                {typeof row.colSpan === "number" && row.colSpan >= 2
                  ? " · wide layout"
                  : ""}
              </p>
              <p className="mt-2 line-clamp-3">
                {row.description?.trim() || "—"}
              </p>
            </ModuleItemCard>
          ))}
        </div>
      )}

      <Modal
        open={!!preview}
        title="Feature preview"
        size="xl"
        layout="plain"
        onClose={() => setPreview(null)}>
        {preview ? <FeatureMarketingPreview item={preview} /> : null}
      </Modal>

      <Modal
        open={modalOpen}
        title={
          editing && items.some((x) => x.id === editing.id)
            ? "Edit feature"
            : "New feature"
        }
        onClose={() => !busy && closeModal()}>
        {editing && (
          <div className="space-y-3">
            <FormAlert message={formError} />
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
            <Field label="Description">
              <textarea
                className={`${inputClass()} min-h-[80px]`}
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
            <Field label="Column span">
              <input
                type="number"
                min={1}
                className={inputClass()}
                value={editing.colSpan ?? 1}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    colSpan: Number(e.target.value) || 1,
                  })
                }
              />
            </Field>
            <Field label="Image URL">
              <input
                className={inputClass()}
                value={editing.image ?? ""}
                onChange={(e) =>
                  setEditing({ ...editing, image: e.target.value })
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
        title="Delete feature?"
        message={
          deleteTarget
            ? `Remove “${deleteTarget.title ?? deleteTarget.id}”? This cannot be undone.`
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
