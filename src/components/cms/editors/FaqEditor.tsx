"use client";

import {
  ConflictError,
  createCollectionItem,
  deleteCollectionItem,
  updateCollectionItem,
} from "@/lib/content-api";
import { ensureModuleAfterMutation } from "@/lib/cms-refresh";
import { ModuleItemCard } from "@/components/cms/ModuleItemCard";
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

  const setItemVisible = useCallback(
    async (item: FaqItem, visible: boolean) => {
      setBusy(true);
      try {
        const next = await updateCollectionItem(
          token, moduleKey, COLLECTION, item.id, moduleData.version,
          { ...item, visible },
        );
        const mod = await ensureModuleAfterMutation(token, moduleKey, next);
        onModuleUpdated(mod);
      } catch (e) {
        if (e instanceof ConflictError) {
          await reloadModule();
          onError(`${e.message} Reloaded latest version.`);
        } else {
          onError(e instanceof Error ? e.message : "Could not update FAQ item.");
        }
      } finally {
        setBusy(false);
      }
    },
    [moduleData.version, moduleKey, onError, onModuleUpdated, reloadModule, token],
  );

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
      {items.length === 0 ? (
        <div className="neu-panel rounded-[var(--radius-panel)] border border-solid [border-color:var(--divider-soft)] p-8 text-center text-[14px] text-[var(--foreground-secondary)] shadow-[var(--shadow-button)]">
          No FAQ items yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((row) => (
            <ModuleItemCard
              key={row.id}
              title={row.question ?? row.id}
              isPublished={row.visible !== false}
              onEdit={() => {
                setEditing({ ...row });
                setFieldErrors({});
                setFormError(null);
                setModalOpen(true);
              }}
              onDelete={() => setDeleteTarget(row)}
              onPublish={() => void setItemVisible(row, true)}
              onUnpublish={() => void setItemVisible(row, false)}
              busy={busy}
              editAriaLabel={`Edit FAQ ${row.question ?? row.id}`}
              deleteAriaLabel={`Delete FAQ ${row.question ?? row.id}`}
              publishAriaLabel={`Publish FAQ ${row.question ?? row.id}`}
              unpublishAriaLabel={`Unpublish FAQ ${row.question ?? row.id}`}>
              <p className="line-clamp-4">{row.answer?.trim() || "—"}</p>
            </ModuleItemCard>
          ))}
        </div>
      )}

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
