"use client";

import {
  ConflictError,
  createCollectionItem,
  deleteCollectionItem,
  updateCollectionItem,
} from "@/lib/content-api";
import { ensureModuleAfterMutation } from "@/lib/cms-refresh";
import { uploadTestimonialVideoToCloud } from "@/lib/dashboard-video-upload";
import { ModuleItemCard } from "@/components/cms/ModuleItemCard";
import { TestimonialMarketingPreview } from "@/components/cms/TestimonialMarketingPreview";
import { TestimonialVideoPlayer } from "@/components/cms/TestimonialVideoPlayer";
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
import { useCallback, useRef, useState } from "react";

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
  const [videoInputMode, setVideoInputMode] = useState<"link" | "upload">("link");
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [videoUploadBusy, setVideoUploadBusy] = useState(false);
  const videoFileInputRef = useRef<HTMLInputElement>(null);
  const uploadAbortRef = useRef<AbortController | null>(null);

  const clearLocalVideoPreview = useCallback(() => {
    uploadAbortRef.current?.abort();
    setLocalPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, []);

  const openCreate = () => {
    setPreview(null);
    clearLocalVideoPreview();
    setVideoUploadBusy(false);
    setVideoInputMode("link");
    setEditing(emptyItem());
    setFieldErrors({});
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (it: TestimonialItem) => {
    setPreview(null);
    clearLocalVideoPreview();
    setVideoUploadBusy(false);
    setVideoInputMode((it.mediaUrl ?? "").trim() ? "link" : "upload");
    setEditing({ ...it });
    setFieldErrors({});
    setFormError(null);
    setModalOpen(true);
  };

  const closeModal = useCallback(() => {
    clearLocalVideoPreview();
    setVideoUploadBusy(false);
    setModalOpen(false);
    setEditing(null);
    setVideoInputMode("link");
    setFieldErrors({});
    setFormError(null);
  }, [clearLocalVideoPreview]);

  const save = useCallback(async () => {
    if (!editing) return;
    const quote = (editing.quote ?? "").trim();
    const name = (editing.name ?? "").trim();
    const mediaUrlTrim = (editing.mediaUrl ?? "").trim();
    const nextErr: { quote?: string; name?: string; mediaUrl?: string } = {};
    if (!quote) nextErr.quote = "Quote is required.";
    if (!name) nextErr.name = "Name is required.";
    if (editing.type === "video" && !mediaUrlTrim) {
      nextErr.mediaUrl =
        "Add a video link or upload a file (wait for upload to finish).";
    }
    if (Object.keys(nextErr).length > 0) {
      setFieldErrors(nextErr);
      setFormError(null);
      return;
    }
    const t = editing.type === "video" ? "video" : "text";
    const isExisting = items.some((x) => x.id === editing.id);

    /** Text items must not send `mediaUrl` — API rejects empty string / missing URL. */
    const item: TestimonialItem = {
      ...editing,
      type: t,
      quote,
      name,
    };
    if (t === "video") {
      item.mediaUrl = mediaUrlTrim;
    } else {
      delete item.mediaUrl;
    }

    setFieldErrors({});
    setBusy(true);
    setFormError(null);
    try {
      const v = moduleData.version;
      const next = isExisting
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
                onChange={(e) => {
                  const nextType =
                    e.target.value === "video" ? "video" : "text";
                  clearLocalVideoPreview();
                  setVideoUploadBusy(false);
                  setVideoInputMode("link");
                  setEditing({
                    ...editing,
                    type: nextType,
                  });
                }}>
                <option value="text">Text</option>
                <option value="video">Video</option>
              </select>
            </Field>
            {editing.type === "video" && (
              <div>
                <Field label="Video *" error={fieldErrors.mediaUrl}>
                  <div
                    className="mb-3 flex flex-wrap gap-2"
                    role="tablist"
                    aria-label="Video source">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={videoInputMode === "link"}
                      onClick={() => {
                        clearLocalVideoPreview();
                        setVideoUploadBusy(false);
                        setVideoInputMode("link");
                      }}
                      disabled={busy || videoUploadBusy}
                      className={`rounded-[var(--radius-button)] px-4 py-2 text-[13px] font-semibold shadow-none transition disabled:opacity-50 ${
                        videoInputMode === "link"
                          ? "neu-btn-primary"
                          : "neu-btn-default"
                      }`}>
                      Paste link
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={videoInputMode === "upload"}
                      onClick={() => {
                        setVideoInputMode("upload");
                      }}
                      disabled={busy || videoUploadBusy}
                      className={`rounded-[var(--radius-button)] px-4 py-2 text-[13px] font-semibold shadow-none transition disabled:opacity-50 ${
                        videoInputMode === "upload"
                          ? "neu-btn-primary"
                          : "neu-btn-default"
                      }`}>
                      Upload from device
                    </button>
                  </div>
                  {videoInputMode === "link" ? (
                    <input
                      className={inputClass(!!fieldErrors.mediaUrl)}
                      value={editing.mediaUrl ?? ""}
                      aria-invalid={!!fieldErrors.mediaUrl}
                      placeholder="Direct .mp4 / .webm URL, or YouTube / Vimeo link"
                      onChange={(e) => {
                        clearLocalVideoPreview();
                        setVideoUploadBusy(false);
                        setEditing({
                          ...editing,
                          mediaUrl: e.target.value,
                        });
                        setFieldErrors((f) => ({
                          ...f,
                          mediaUrl: undefined,
                        }));
                      }}
                    />
                  ) : (
                    <div className="space-y-2">
                      <input
                        ref={videoFileInputRef}
                        type="file"
                        accept="video/*"
                        className="sr-only"
                        tabIndex={-1}
                        onChange={(e) => {
                          const f = e.target.files?.[0] ?? null;
                          e.target.value = "";
                          if (!f) return;
                          clearLocalVideoPreview();
                          const objectUrl = URL.createObjectURL(f);
                          setLocalPreviewUrl(objectUrl);
                          const ac = new AbortController();
                          uploadAbortRef.current = ac;
                          setVideoUploadBusy(true);
                          setFormError(null);
                          setEditing({ ...editing, mediaUrl: "" });
                          setFieldErrors((fr) => ({
                            ...fr,
                            mediaUrl: undefined,
                          }));
                          void (async () => {
                            try {
                              const { url } =
                                await uploadTestimonialVideoToCloud(
                                  token,
                                  f,
                                  ac.signal,
                                );
                              setEditing((ed) =>
                                ed ? { ...ed, mediaUrl: url } : null,
                              );
                              setVideoInputMode("link");
                              setFieldErrors((fr) => ({
                                ...fr,
                                mediaUrl: undefined,
                              }));
                            } catch (err: unknown) {
                              const aborted =
                                (err instanceof DOMException &&
                                  err.name === "AbortError") ||
                                (err instanceof Error &&
                                  err.name === "AbortError");
                              if (aborted) return;
                              setFormError(
                                err instanceof Error
                                  ? err.message
                                  : "Upload failed",
                              );
                            } finally {
                              setLocalPreviewUrl((prev) => {
                                if (prev === objectUrl) {
                                  URL.revokeObjectURL(objectUrl);
                                  return null;
                                }
                                URL.revokeObjectURL(objectUrl);
                                return prev;
                              });
                              setVideoUploadBusy(false);
                              if (uploadAbortRef.current === ac) {
                                uploadAbortRef.current = null;
                              }
                            }
                          })();
                        }}
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <ToolbarButton
                          onClick={() =>
                            videoFileInputRef.current?.click()
                          }
                          disabled={busy || videoUploadBusy}>
                          Choose video file
                        </ToolbarButton>
                      </div>
                      <p className="text-[12px] leading-relaxed text-[var(--foreground-secondary)]">
                        The file uploads to your configured storage right away.
                        When it finishes, the public link is filled in and saved
                        with the testimonial when you click Save.
                      </p>
                    </div>
                  )}
                </Field>
                <div className="mt-4 space-y-2">
                  {videoUploadBusy ? (
                    <div
                      className="flex items-center gap-3 rounded-[var(--radius-panel)] border border-solid [border-color:var(--divider-soft)] bg-[var(--accent-fill)] px-4 py-3 text-[13px] text-[var(--foreground-secondary)]"
                      role="status"
                      aria-live="polite">
                      <span
                        className="inline-block size-5 shrink-0 animate-spin rounded-full border-2 border-solid border-[var(--text-muted)] border-t-transparent"
                        aria-hidden
                      />
                      Uploading video to storage…
                    </div>
                  ) : null}
                  <p className="text-[12px] font-medium text-[var(--foreground-secondary)]">
                    Preview (play / pause)
                  </p>
                  <div
                    className={
                      videoUploadBusy ? "pointer-events-none opacity-60" : ""
                    }>
                    <TestimonialVideoPlayer
                      src={
                        (localPreviewUrl ??
                          (editing.mediaUrl ?? "").trim()) ||
                        ""
                      }
                    />
                  </div>
                  {(localPreviewUrl || (editing.mediaUrl ?? "").trim()) &&
                  !videoUploadBusy ? (
                    <ToolbarButton
                      variant="danger"
                      onClick={() => {
                        clearLocalVideoPreview();
                        setVideoUploadBusy(false);
                        setEditing({ ...editing, mediaUrl: "" });
                        setFieldErrors((f) => ({
                          ...f,
                          mediaUrl: undefined,
                        }));
                      }}
                      disabled={busy}>
                      Remove video
                    </ToolbarButton>
                  ) : null}
                </div>
              </div>
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
              <ToolbarButton
                variant="primary"
                onClick={() => void save()}
                disabled={busy || videoUploadBusy}>
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
