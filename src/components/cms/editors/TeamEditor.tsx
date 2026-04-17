"use client";

import {
  ConflictError,
  createCollectionItem,
  deleteCollectionItem,
  updateCollectionItem,
} from "@/lib/content-api";
import { ensureModuleAfterMutation } from "@/lib/cms-refresh";
import { RowDeleteButton, RowEditButton } from "@/components/cms/RowActionIcons";
import { newId, teamMembers, type TeamMember } from "@/lib/content-types";
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

const COLLECTION = "members";

function emptyItem(): TeamMember {
  return {
    id: newId("team"),
    name: "",
    role: "",
    tagline: "",
    image: "",
    social: { linkedin: "" },
    visible: true,
  };
}

export function TeamEditor({
  token,
  moduleKey,
  moduleData,
  onModuleUpdated,
  reloadModule,
  onError,
}: EditorProps) {
  const items = teamMembers(moduleData);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TeamMember | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditing(null);
    setFieldErrors({});
    setFormError(null);
  }, []);

  const save = useCallback(async () => {
    if (!editing) return;
    const name = (editing.name ?? "").trim();
    if (!name) {
      setFieldErrors({ name: "Name is required." });
      setFormError(null);
      return;
    }
    const isUpdate = items.some((x) => x.id === editing.id);
    const item: TeamMember = {
      id: editing.id,
      name,
      role: editing.role,
      tagline: editing.tagline,
      image: editing.image,
      social: editing.social,
      visible: editing.visible,
    };
    setFieldErrors({});
    setBusy(true);
    setFormError(null);
    try {
      const v = moduleData.version;
      const next = isUpdate
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
        Add member
      </ToolbarButton>
      <div className="neu-panel overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-[13px]">
            <thead>
              <tr className="text-[11px] font-semibold uppercase text-[var(--foreground-secondary)]">
                <th className="neu-surface-inset-deep px-4 py-3">Name</th>
                <th className="neu-surface-inset-deep px-2 py-3">Role</th>
                <th className="neu-surface-inset-deep px-2 py-3 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-[var(--foreground-secondary)]">
                    No team members yet.
                  </td>
                </tr>
              ) : (
                items.map((row) => (
                  <tr key={row.id} className="hover:bg-[var(--accent-fill)]">
                    <td className="px-4 py-3 font-medium">{row.name ?? row.id}</td>
                    <td className="px-2 py-3 text-[var(--foreground-secondary)]">
                      {row.role ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-2 py-3 text-right">
                      <RowEditButton
                        onClick={() => {
                          setEditing({ ...row });
                          setFieldErrors({});
                          setFormError(null);
                          setModalOpen(true);
                        }}
                        disabled={busy}
                        ariaLabel={`Edit ${row.name ?? row.id}`}
                      />
                      <RowDeleteButton
                        onClick={() => setDeleteTarget(row)}
                        disabled={busy}
                        ariaLabel={`Delete ${row.name ?? row.id}`}
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
            ? "Edit member"
            : "New member"
        }
        onClose={() => !busy && closeModal()}>
        {editing && (
          <div className="space-y-3">
            <FormAlert message={formError} />
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
            <Field label="Tagline">
              <input
                className={inputClass()}
                value={editing.tagline ?? ""}
                onChange={(e) =>
                  setEditing({ ...editing, tagline: e.target.value })
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
            <Field label="LinkedIn URL">
              <input
                className={inputClass()}
                value={editing.social?.linkedin ?? ""}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    social: {
                      ...editing.social,
                      linkedin: e.target.value,
                    },
                  })
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
        title="Delete member?"
        message={
          deleteTarget
            ? `Remove “${deleteTarget.name ?? deleteTarget.id}” from the team? This cannot be undone.`
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
