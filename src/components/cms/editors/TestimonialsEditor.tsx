"use client";

import {
  ConflictError,
  createCollectionItem,
  deleteCollectionItem,
  updateCollectionItem,
} from "@/lib/content-api";
import { ensureModuleAfterMutation } from "@/lib/cms-refresh";
import { ModuleItemCard } from "@/components/cms/ModuleItemCard";
import { TestimonialMarketingPreview } from "@/components/cms/TestimonialMarketingPreview";
import { newId, testimonialItems, type TestimonialItem } from "@/lib/content-types";
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

function emptyItem(): TestimonialItem {
  return {
    id: newId("t"),
    type: "text",
    quote: "",
    name: "",
    role: "",
    tag: "",
    mediaUrl: "",
    visible: true,
  };
}

export function TestimonialsEditor({
  token,
  moduleKey,
  moduleData,
  onModuleUpdated,
  reloadModule,
  onError,
}: EditorProps) {
  const items = testimonialItems(moduleData);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TestimonialItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TestimonialItem | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    quote?: string;
    name?: string;
    mediaUrl?: string;
  }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [preview, setPreview] = useState<TestimonialItem | null>(null);

  const openCreate = () => {
    setPreview(null);
    setEditing(emptyItem());
    setFieldErrors({});
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (it: TestimonialItem) => {
    setPreview(null);
    setEditing({ ...it });
    setFieldErrors({});
    setFormError(null);
    setModalOpen(true);
  };

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditing(null);
    setFieldErrors({});
    setFormError(null);
  }, []);

  const save = useCallback(async () => {
    if (!editing) return;
    const quote = (editing.quote ?? "").trim();
    const name = (editing.name ?? "").trim();
    const mediaUrl = (editing.mediaUrl ?? "").trim();
    const nextErr: { quote?: string; name?: string; mediaUrl?: string } = {};
    if (!quote) nextErr.quote = "Quote is required.";
    if (!name) nextErr.name = "Name is required.";
    if (editing.type === "video" && !mediaUrl) {
      nextErr.mediaUrl = "Media URL is required for video type.";
    }
    if (Object.keys(nextErr).length > 0) {
      setFieldErrors(nextErr);
      setFormError(null);
      return;
    }
    const t = editing.type === "video" ? "video" : "text";
    const item = { ...editing, type: t, quote, name, mediaUrl };
    setFieldErrors({});
    setBusy(true);
    setFormError(null);
    try {
      const v = moduleData.version;
      let next: Awaited<ReturnType<typeof createCollectionItem>>;
      if (items.some((x) => x.id === item.id)) {
        next = await updateCollectionItem(
          token,
          moduleKey,
          COLLECTION,
          item.id,
          v,
          item,
        );
      } else {
        next = await createCollectionItem(
          token,
          moduleKey,
          COLLECTION,
          v,
          item,
        );
      }
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
    editing,
    items,
    moduleData.version,
    moduleKey,
    onModuleUpdated,
    reloadModule,
    token,
    closeModal,
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
      <div className="flex flex-wrap gap-2">
        <ToolbarButton variant="primary" onClick={openCreate} disabled={busy}>
          Add testimonial
        </ToolbarButton>
      </div>
      {items.length === 0 ? (
        <div className="neu-panel rounded-[var(--radius-panel)] border border-solid [border-color:var(--divider-soft)] p-8 text-center text-[14px] text-[var(--foreground-secondary)] shadow-[var(--shadow-button)]">
          No testimonials yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((row) => (
            <ModuleItemCard
              key={row.id}
              label={row.type === "video" ? "Video" : "Text"}
              title={row.name ?? row.id}
              onView={() => setPreview(row)}
              onPrimaryClick={() => setPreview(row)}
              onEdit={() => openEdit(row)}
              onDelete={() => setDeleteTarget(row)}
              busy={busy}
              viewAriaLabel={`Preview testimonial from ${row.name ?? row.id}`}
              editAriaLabel={`Edit testimonial ${row.name ?? row.id}`}
              deleteAriaLabel={`Delete testimonial ${row.name ?? row.id}`}>
              <p className="line-clamp-3 italic text-[var(--foreground-secondary)]">
                {row.quote?.trim() ? `“${row.quote.trim()}”` : "—"}
              </p>
              {(row.role ?? "").trim() ? (
                <p className="mt-2 text-[12px] text-[var(--text-muted)]">
                  {(row.role ?? "").trim()}
                </p>
              ) : null}
            </ModuleItemCard>
          ))}
        </div>
      )}

      <Modal
        open={!!preview}
        title="Testimonial preview"
        size="xl"
        layout="plain"
        onClose={() => setPreview(null)}>
        {preview ? <TestimonialMarketingPreview item={preview} /> : null}
      </Modal>

      <Modal
        open={modalOpen}
        title={editing && items.some((x) => x.id === editing.id) ? "Edit testimonial" : "New testimonial"}
        onClose={() => !busy && closeModal()}>
        {editing && (
          <div className="space-y-3">
            <FormAlert message={formError} />
            <Field label="Type">
              <select
                className={inputClass()}
                value={editing.type === "video" ? "video" : "text"}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    type: e.target.value === "video" ? "video" : "text",
                  })
                }>
                <option value="text">Text</option>
                <option value="video">Video</option>
              </select>
            </Field>
            {editing.type === "video" && (
              <Field label="Media URL *" error={fieldErrors.mediaUrl}>
                <input
                  className={inputClass(!!fieldErrors.mediaUrl)}
                  value={editing.mediaUrl ?? ""}
                  aria-invalid={!!fieldErrors.mediaUrl}
                  onChange={(e) => {
                    setEditing({ ...editing, mediaUrl: e.target.value });
                    setFieldErrors((f) => ({ ...f, mediaUrl: undefined }));
                  }}
                  placeholder="e.g. https://cdn.example.com/video.mp4 or YouTube embed link"
                />
              </Field>
            )}
            <Field label="Quote *" error={fieldErrors.quote}>
              <textarea
                className={`${inputClass(!!fieldErrors.quote)} min-h-[88px]`}
                value={editing.quote ?? ""}
                aria-invalid={!!fieldErrors.quote}
                onChange={(e) => {
                  setEditing({ ...editing, quote: e.target.value });
                  setFieldErrors((f) => ({ ...f, quote: undefined }));
                }}
              />
            </Field>
            <Field label="Name *" error={fieldErrors.name}>
              <input
                className={inputClass(!!fieldErrors.name)}
                value={editing.name ?? ""}
                aria-invalid={!!fieldErrors.name}
                onChange={(e) => {
                  setEditing({ ...editing, name: e.target.value });
                  setFieldErrors((f) => ({ ...f, name: undefined }));
                }}
              />
            </Field>
            <Field label="Role">
              <input
                className={inputClass()}
                value={editing.role ?? ""}
                onChange={(e) =>
                  setEditing({ ...editing, role: e.target.value })
                }
              />
            </Field>
            <Field label="Tag">
              <input
                className={inputClass()}
                value={editing.tag ?? ""}
                onChange={(e) =>
                  setEditing({ ...editing, tag: e.target.value })
                }
              />
            </Field>
            <label className="flex items-center gap-2 text-[13px] text-[var(--foreground)]">
              <input
                type="checkbox"
                checked={editing.visible !== false}
                onChange={(e) =>
                  setEditing({ ...editing, visible: e.target.checked })
                }
              />
              Visible on site
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
        title="Delete testimonial?"
        message={
          deleteTarget
            ? `Remove the testimonial from “${deleteTarget.name ?? deleteTarget.id}”? This cannot be undone.`
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
