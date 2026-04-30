"use client";

import {
  ConflictError,
  createCollectionItem,
  deleteCollectionItem,
  updateCollectionItem,
  uploadImageViaDashboardBlobRoute,
} from "@/lib/content-api";
import { ensureModuleAfterMutation } from "@/lib/cms-refresh";
import { ModuleItemCard } from "@/components/cms/ModuleItemCard";
import { TeamMemberCardPreview } from "@/components/cms/TeamMemberCardPreview";
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
import { useCallback, useRef, useState } from "react";

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
  const [preview, setPreview] = useState<TeamMember | null>(null);
  const [uploading, setUploading] = useState(false);
  const imageFileInputRef = useRef<HTMLInputElement | null>(null);
  const uploadAbortRef = useRef<AbortController | null>(null);

  const closeModal = useCallback(() => {
    uploadAbortRef.current?.abort();
    uploadAbortRef.current = null;
    setUploading(false);
    setModalOpen(false);
    setEditing(null);
    setFieldErrors({});
    setFormError(null);
  }, []);

  const handleImageFileSelected = useCallback(
    async (file: File) => {
      if (!editing) return;
      uploadAbortRef.current?.abort();
      const ac = new AbortController();
      uploadAbortRef.current = ac;
      setUploading(true);
      setFormError(null);
      try {
        const { url } = await uploadImageViaDashboardBlobRoute(
          token,
          file,
          "team",
          ac.signal,
        );
        setEditing((cur) => (cur ? { ...cur, image: url } : cur));
      } catch (e) {
        if ((e as { name?: string })?.name === "AbortError") return;
        setFormError(e instanceof Error ? e.message : "Image upload failed.");
      } finally {
        if (uploadAbortRef.current === ac) uploadAbortRef.current = null;
        setUploading(false);
      }
    },
    [editing, token],
  );

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
          setPreview(null);
          setEditing(emptyItem());
          setFieldErrors({});
          setFormError(null);
          setModalOpen(true);
        }}
        disabled={busy}>
        Add member
      </ToolbarButton>
      {items.length === 0 ? (
        <div className="neu-panel rounded-[var(--radius-panel)] border border-solid [border-color:var(--divider-soft)] p-8 text-center text-[14px] text-[var(--foreground-secondary)] shadow-[var(--shadow-button)]">
          No team members yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((row) => (
            <ModuleItemCard
              key={row.id}
              title={row.name ?? row.id}
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
              viewAriaLabel={`Preview team member ${row.name ?? row.id}`}
              editAriaLabel={`Edit ${row.name ?? row.id}`}
              deleteAriaLabel={`Delete ${row.name ?? row.id}`}>
              <p className="line-clamp-2">{row.role?.trim() || "—"}</p>
              {(row.tagline ?? "").trim() ? (
                <p className="mt-2 line-clamp-2 text-[12px] text-[var(--text-muted)]">
                  {(row.tagline ?? "").trim()}
                </p>
              ) : null}
            </ModuleItemCard>
          ))}
        </div>
      )}

      <Modal
        open={!!preview}
        title="Team member preview"
        size="2xl"
        layout="plain"
        onClose={() => setPreview(null)}>
        {preview ? <TeamMemberCardPreview member={preview} /> : null}
      </Modal>

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
            <Field label="Image">
              <div className="space-y-2">
                <input
                  className={inputClass()}
                  placeholder="Paste image URL or upload from device"
                  value={editing.image ?? ""}
                  onChange={(e) =>
                    setEditing({ ...editing, image: e.target.value })
                  }
                />
                <input
                  ref={imageFileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif,image/avif,image/svg+xml,image/*"
                  className="sr-only"
                  tabIndex={-1}
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    e.target.value = "";
                    if (!f) return;
                    void handleImageFileSelected(f);
                  }}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <ToolbarButton
                    onClick={() => imageFileInputRef.current?.click()}
                    disabled={busy || uploading}>
                    {uploading ? "Uploading…" : "Upload from device"}
                  </ToolbarButton>
                  {editing.image ? (
                    <ToolbarButton
                      onClick={() =>
                        setEditing({ ...editing, image: "" })
                      }
                      disabled={busy || uploading}>
                      Clear
                    </ToolbarButton>
                  ) : null}
                </div>
                {editing.image ? (
                  <div className="mt-1 flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={editing.image}
                      alt="Preview"
                      className="h-16 w-16 rounded-md object-cover [border:1px_solid_var(--divider-soft)]"
                    />
                    <span className="truncate text-[12px] text-[var(--foreground-secondary)]">
                      {editing.image}
                    </span>
                  </div>
                ) : null}
              </div>
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
              <ToolbarButton
                variant="primary"
                onClick={() => void save()}
                disabled={busy || uploading}>
                {busy ? "Saving…" : uploading ? "Uploading…" : "Save"}
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
