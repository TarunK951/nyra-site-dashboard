"use client";

import {
  ConflictError,
  createCollectionItem,
  deleteCollectionItem,
  updateCollectionItem,
} from "@/lib/content-api";
import { ensureModuleAfterMutation } from "@/lib/cms-refresh";
import { RowDeleteButton, RowEditButton } from "@/components/cms/RowActionIcons";
import { faqItems, newId, type FaqItem } from "@/lib/content-types";
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

function emptyItem(): FaqItem {
  return { id: newId("faq"), question: "", answer: "", visible: true };
}

export function FaqEditor({
  token,
  moduleKey,
  moduleData,
  onModuleUpdated,
  reloadModule,
  onError,
}: EditorProps) {
  const items = faqItems(moduleData);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<FaqItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FaqItem | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    question?: string;
    answer?: string;
  }>({});
  const [formError, setFormError] = useState<string | null>(null);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditing(null);
    setFieldErrors({});
    setFormError(null);
  }, []);

  const save = useCallback(async () => {
    if (!editing) return;
    const question = (editing.question ?? "").trim();
    const answer = (editing.answer ?? "").trim();
    const nextErr: { question?: string; answer?: string } = {};
    if (!question) nextErr.question = "Question is required.";
    if (!answer) nextErr.answer = "Answer is required.";
    if (Object.keys(nextErr).length > 0) {
      setFieldErrors(nextErr);
      setFormError(null);
      return;
    }
    const item = { ...editing, question, answer };
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
          setEditing(emptyItem());
          setFieldErrors({});
          setFormError(null);
          setModalOpen(true);
        }}
        disabled={busy}>
        Add FAQ
      </ToolbarButton>
      <div className="neu-surface overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-[13px]">
            <thead>
              <tr className="text-[11px] font-semibold text-[var(--foreground-secondary)]">
                <th className="neu-surface-inset-deep px-4 py-3">Question</th>
                <th className="neu-surface-inset-deep px-2 py-3 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-4 py-8 text-center text-[var(--foreground-secondary)]">
                    No FAQ items yet.
                  </td>
                </tr>
              ) : (
                items.map((row) => (
                  <tr key={row.id} className="hover:bg-[var(--accent-fill)]">
                    <td className="max-w-xl px-4 py-3">{row.question ?? row.id}</td>
                    <td className="whitespace-nowrap px-2 py-3 text-right">
                      <RowEditButton
                        onClick={() => {
                          setEditing({ ...row });
                          setFieldErrors({});
                          setFormError(null);
                          setModalOpen(true);
                        }}
                        disabled={busy}
                        ariaLabel={`Edit FAQ ${row.question ?? row.id}`}
                      />
                      <RowDeleteButton
                        onClick={() => setDeleteTarget(row)}
                        disabled={busy}
                        ariaLabel={`Delete FAQ ${row.question ?? row.id}`}
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
            ? "Edit FAQ"
            : "New FAQ"
        }
        onClose={() => !busy && closeModal()}>
        {editing && (
          <div className="space-y-3">
            <FormAlert message={formError} />
            <Field label="Question *" error={fieldErrors.question}>
              <input
                className={inputClass(!!fieldErrors.question)}
                value={editing.question ?? ""}
                aria-invalid={!!fieldErrors.question}
                onChange={(e) => {
                  setEditing({ ...editing, question: e.target.value });
                  setFieldErrors((f) => ({ ...f, question: undefined }));
                }}
              />
            </Field>
            <Field label="Answer *" error={fieldErrors.answer}>
              <textarea
                className={`${inputClass(!!fieldErrors.answer)} min-h-[120px]`}
                value={editing.answer ?? ""}
                aria-invalid={!!fieldErrors.answer}
                onChange={(e) => {
                  setEditing({ ...editing, answer: e.target.value });
                  setFieldErrors((f) => ({ ...f, answer: undefined }));
                }}
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
        title="Delete FAQ?"
        message={
          deleteTarget
            ? `Remove this FAQ entry? This cannot be undone.`
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
