"use client";

import {
  ConflictError,
  createCollectionItem,
  deleteCollectionItem,
  updateCollectionItem,
} from "@/lib/content-api";
import { ensureModuleAfterMutation } from "@/lib/cms-refresh";
import { RowDeleteButton, RowEditButton } from "@/components/cms/RowActionIcons";
import { newId, salesReps, type SalesRep } from "@/lib/content-types";
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

const COLLECTION = "reps";

function emptyItem(): SalesRep {
  return {
    id: newId("rep"),
    name: "",
    designation: "",
    image: "",
    email: "",
    phone: "",
    regions: [],
    social: { linkedin: "" },
    visible: true,
  };
}

function regionsToString(r: string[] | undefined): string {
  return (r ?? []).join(", ");
}

function parseRegions(s: string): string[] {
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

export function SalesTeamEditor({
  token,
  moduleKey,
  moduleData,
  onModuleUpdated,
  reloadModule,
  onError,
}: EditorProps) {
  const items = salesReps(moduleData);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SalesRep | null>(null);
  const [regionsStr, setRegionsStr] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SalesRep | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditing(null);
    setRegionsStr("");
    setFieldErrors({});
    setFormError(null);
  }, []);

  const openEdit = (row: SalesRep) => {
    setEditing({ ...row });
    setRegionsStr(regionsToString(row.regions));
    setFieldErrors({});
    setFormError(null);
    setModalOpen(true);
  };

  const openCreate = () => {
    const e = emptyItem();
    setEditing(e);
    setRegionsStr("");
    setFieldErrors({});
    setFormError(null);
    setModalOpen(true);
  };

  const save = useCallback(async () => {
    if (!editing) return;
    const name = (editing.name ?? "").trim();
    if (!name) {
      setFieldErrors({ name: "Name is required." });
      setFormError(null);
      return;
    }
    const regionsSnapshot = regionsStr;
    const payload: SalesRep = {
      ...editing,
      name,
      regions: parseRegions(regionsSnapshot),
    };
    setFieldErrors({});
    setBusy(true);
    setFormError(null);
    try {
      const v = moduleData.version;
      const next = items.some((x) => x.id === payload.id)
        ? await updateCollectionItem(
            token,
            moduleKey,
            COLLECTION,
            payload.id,
            v,
            payload,
          )
        : await createCollectionItem(
            token,
            moduleKey,
            COLLECTION,
            v,
            payload,
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
    regionsStr,
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
      <ToolbarButton variant="primary" onClick={openCreate} disabled={busy}>
        Add sales rep
      </ToolbarButton>
      <div className="neu-surface overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-[13px]">
            <thead>
              <tr className="text-[11px] font-semibold text-[var(--foreground-secondary)]">
                <th className="neu-surface-inset-deep px-4 py-3">Name</th>
                <th className="neu-surface-inset-deep px-2 py-3">Designation</th>
                <th className="neu-surface-inset-deep px-2 py-3 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-[var(--foreground-secondary)]">
                    No reps yet.
                  </td>
                </tr>
              ) : (
                items.map((row) => (
                  <tr key={row.id} className="hover:bg-[var(--accent-fill)]">
                    <td className="px-4 py-3 font-medium">{row.name ?? row.id}</td>
                    <td className="px-2 py-3 text-[var(--foreground-secondary)]">
                      {row.designation ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-2 py-3 text-right">
                      <RowEditButton
                        onClick={() => openEdit(row)}
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
            ? "Edit rep"
            : "New rep"
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
            <Field label="Designation">
              <input
                className={inputClass()}
                value={editing.designation ?? ""}
                onChange={(e) =>
                  setEditing({ ...editing, designation: e.target.value })
                }
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                className={inputClass()}
                value={editing.email ?? ""}
                onChange={(e) =>
                  setEditing({ ...editing, email: e.target.value })
                }
              />
            </Field>
            <Field label="Phone">
              <input
                className={inputClass()}
                value={editing.phone ?? ""}
                onChange={(e) =>
                  setEditing({ ...editing, phone: e.target.value })
                }
              />
            </Field>
            <Field label="Regions (comma-separated)">
              <input
                className={inputClass()}
                value={regionsStr}
                onChange={(e) => setRegionsStr(e.target.value)}
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
        title="Delete rep?"
        message={
          deleteTarget
            ? `Remove “${deleteTarget.name ?? deleteTarget.id}” from the sales team? This cannot be undone.`
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
