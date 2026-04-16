"use client";

import {
  ConflictError,
  createCollectionItem,
  deleteCollectionItem,
  updateCollectionItem,
} from "@/lib/content-api";
import { ensureModuleAfterMutation } from "@/lib/cms-refresh";
import { RowDeleteButton, RowEditButton } from "@/components/cms/RowActionIcons";
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
  }>({});
  const [formError, setFormError] = useState<string | null>(null);

  const openCreate = () => {
    setEditing(emptyItem());
    setFieldErrors({});
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (it: TestimonialItem) => {
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
    const nextErr: { quote?: string; name?: string } = {};
    if (!quote) nextErr.quote = "Quote is required.";
    if (!name) nextErr.name = "Name is required.";
    if (Object.keys(nextErr).length > 0) {
      setFieldErrors(nextErr);
      setFormError(null);
      return;
    }
    const item = { ...editing, quote, name };
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
      <div className="neu-panel overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-[13px]">
            <thead>
              <tr className="text-[11px] font-semibold uppercase tracking-wide text-[var(--foreground-secondary)]">
                <th className="neu-surface-inset-deep px-4 py-3">Name</th>
                <th className="neu-surface-inset-deep px-2 py-3">Quote</th>
                <th className="neu-surface-inset-deep px-2 py-3 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-8 text-center text-[var(--foreground-secondary)]">
                    No testimonials yet.
                  </td>
                </tr>
              ) : (
                items.map((row) => (
                  <tr key={row.id} className="hover:bg-[var(--accent-fill)]">
                    <td className="px-4 py-3 font-medium text-[var(--foreground)]">
                      {row.name ?? row.id}
                    </td>
                    <td className="max-w-md truncate px-2 py-3 text-[var(--foreground-secondary)]">
                      {row.quote ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-2 py-3 text-right">
                      <RowEditButton
                        onClick={() => openEdit(row)}
                        disabled={busy}
                        ariaLabel={`Edit testimonial ${row.name ?? row.id}`}
                      />
                      <RowDeleteButton
                        onClick={() => setDeleteTarget(row)}
                        disabled={busy}
                        ariaLabel={`Delete testimonial ${row.name ?? row.id}`}
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
        title={editing && items.some((x) => x.id === editing.id) ? "Edit testimonial" : "New testimonial"}
        onClose={() => !busy && closeModal()}>
        {editing && (
          <div className="space-y-3">
            <FormAlert message={formError} />
            <Field label="Type">
              <input
                className={inputClass()}
                value={editing.type ?? ""}
                onChange={(e) =>
                  setEditing({ ...editing, type: e.target.value })
                }
              />
            </Field>
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
