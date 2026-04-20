"use client";

import {
  ConflictError,
  createCollectionItem,
  deleteCollectionItem,
  updateCollectionItem,
} from "@/lib/content-api";
import { ensureModuleAfterMutation } from "@/lib/cms-refresh";
import { blogsPosts, newId, type BlogPost, type BlogSection } from "@/lib/content-types";
import { BlogPostMarketingPreview } from "@/components/cms/BlogPostMarketingPreview";
import { ModuleItemCard } from "@/components/cms/ModuleItemCard";
import {
  ConfirmDialog,
  Field,
  FormAlert,
  Modal,
  ToolbarButton,
  inputClass,
} from "../shared";
import type { EditorProps } from "../editor-types";
import { useCallback, useMemo, useState } from "react";

const COLLECTION = "posts";

function defaultSections(introText: string): BlogSection[] {
  return [{ id: newId("s"), type: "text", text: introText || " " }];
}

function mergeExcerptIntoSections(
  sections: BlogSection[] | undefined,
  excerpt: string,
): BlogSection[] {
  const list =
    Array.isArray(sections) && sections.length > 0
      ? sections.map((s) => ({ ...s }))
      : defaultSections(excerpt);
  const first = list[0];
  if (first && first.type === "text") {
    list[0] = { ...first, text: excerpt };
  } else {
    list.unshift({ id: newId("s"), type: "text", text: excerpt });
  }
  return list;
}

type FormState = {
  slug: string;
  title: string;
  category: string;
  excerpt: string;
  publishedAt: string;
  heroImage: string;
  authorName: string;
  authorAvatar: string;
  tags: string;
};

function localDatetimeLocalValue(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function isoToDatetimeLocal(iso: string | undefined): string {
  if (!iso) return localDatetimeLocalValue();
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return localDatetimeLocalValue();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function postToForm(post: BlogPost): FormState {
  return {
    slug: post.slug ?? "",
    title: post.title ?? "",
    category: post.category ?? "",
    excerpt: post.excerpt ?? "",
    publishedAt: isoToDatetimeLocal(post.publishedAt),
    heroImage: post.heroImage ?? "",
    authorName: post.author?.name ?? "",
    authorAvatar: post.author?.avatar ?? "",
    tags: (post.tags ?? []).join(", "),
  };
}

function emptyForm(): FormState {
  return {
    slug: "",
    title: "",
    category: "",
    excerpt: "",
    publishedAt: localDatetimeLocalValue(),
    heroImage: "",
    authorName: "",
    authorAvatar: "",
    tags: "",
  };
}

function parseTags(s: string): string[] {
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

type BlogFieldKey =
  | "slug"
  | "title"
  | "category"
  | "excerpt"
  | "publishedAt"
  | "authorName";

function validateBlogForm(form: FormState): Partial<Record<BlogFieldKey, string>> {
  const e: Partial<Record<BlogFieldKey, string>> = {};
  if (!form.slug.trim()) e.slug = "Slug is required.";
  if (!form.title.trim()) e.title = "Title is required.";
  if (!form.category.trim()) e.category = "Category is required.";
  if (!form.excerpt.trim()) e.excerpt = "Excerpt is required.";
  if (!form.authorName.trim()) e.authorName = "Author name is required.";
  const raw = form.publishedAt.trim();
  if (raw) {
    const asDate = new Date(raw);
    if (Number.isNaN(asDate.getTime())) {
      e.publishedAt = "Enter a valid date and time.";
    }
  }
  return e;
}

/** Posts that appear on the public site when the module is published (per API guide). */
function publishedPosts(posts: BlogPost[]): BlogPost[] {
  return posts.filter((p) => p.status === "published");
}

export function BlogsEditor({
  token,
  moduleKey,
  moduleData,
  onModuleUpdated,
  reloadModule,
  onError,
}: EditorProps) {
  const allPosts = blogsPosts(moduleData);
  const tableRows = useMemo(() => publishedPosts(allPosts), [allPosts]);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  /** When set, modal is editing this post (same id on save). */
  const [editingSnapshot, setEditingSnapshot] = useState<BlogPost | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<BlogPost | null>(null);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<BlogFieldKey, string>>
  >({});
  const [formError, setFormError] = useState<string | null>(null);
  const [blogPreview, setBlogPreview] = useState<BlogPost | null>(null);

  const openCreate = () => {
    setBlogPreview(null);
    setEditingSnapshot(null);
    setForm(emptyForm());
    setFieldErrors({});
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (post: BlogPost) => {
    setBlogPreview(null);
    setEditingSnapshot(post);
    setForm(postToForm(post));
    setFieldErrors({});
    setFormError(null);
    setModalOpen(true);
  };

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditingSnapshot(null);
    setForm(emptyForm());
    setFieldErrors({});
    setFormError(null);
  }, []);

  const save = useCallback(async () => {
    const validation = validateBlogForm(form);
    if (Object.keys(validation).length > 0) {
      setFieldErrors(validation);
      setFormError(null);
      return;
    }
    setFieldErrors({});

    const slug = form.slug.trim();
    const title = form.title.trim();
    const category = form.category.trim();
    const excerpt = form.excerpt.trim();
    const authorName = form.authorName.trim();

    let publishedAtIso = form.publishedAt.trim();
    if (publishedAtIso) {
      const asDate = new Date(publishedAtIso);
      publishedAtIso = asDate.toISOString();
    } else {
      publishedAtIso = new Date().toISOString();
    }

    const tags = parseTags(form.tags);
    const heroTrim = form.heroImage.trim();
    const avatarTrim = form.authorAvatar.trim();
    const postSnapshot = editingSnapshot;

    setBusy(true);
    setFormError(null);

    try {
      if (postSnapshot) {
        const sections = mergeExcerptIntoSections(
          postSnapshot.sections,
          excerpt,
        );
        const payload: BlogPost = {
          ...postSnapshot,
          slug,
          category,
          title,
          excerpt,
          publishedAt: publishedAtIso,
          heroImage: heroTrim || undefined,
          author: {
            name: authorName,
            avatar: avatarTrim || undefined,
          },
          sections,
          status: "published",
          tags,
          visible: postSnapshot.visible !== false,
        };
        const next = await updateCollectionItem(
          token,
          moduleKey,
          COLLECTION,
          postSnapshot.id,
          moduleData.version,
          payload,
        );
        const mod = await ensureModuleAfterMutation(token, moduleKey, next);
        onModuleUpdated(mod);
      } else {
        const id = newId("blog");
        const sections = defaultSections(excerpt);
        const payload: BlogPost = {
          id,
          slug,
          category,
          title,
          excerpt,
          publishedAt: publishedAtIso,
          heroImage: heroTrim || undefined,
          author: {
            name: authorName,
            avatar: avatarTrim || undefined,
          },
          sections,
          status: "published",
          tags,
          visible: true,
        };
        const next = await createCollectionItem(
          token,
          moduleKey,
          COLLECTION,
          moduleData.version,
          payload,
        );
        const mod = await ensureModuleAfterMutation(token, moduleKey, next);
        onModuleUpdated(mod);
      }
      closeModal();
    } catch (e) {
      if (e instanceof ConflictError) {
        await reloadModule();
        setFormError(
          `${e.message} Latest version was loaded — review the form and try Save again.`,
        );
      } else {
        setFormError(
          e instanceof Error
            ? e.message
            : postSnapshot
              ? "Could not update post."
              : "Could not create post.",
        );
      }
    } finally {
      setBusy(false);
    }
  }, [
    closeModal,
    editingSnapshot,
    form,
    moduleData.version,
    moduleKey,
    onModuleUpdated,
    reloadModule,
    token,
  ]);

  const confirmDelete = useCallback(async () => {
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
        onError(e instanceof Error ? e.message : "Could not delete post");
      }
    } finally {
      setBusy(false);
    }
  }, [
    deleteTarget,
    moduleData.version,
    moduleKey,
    onError,
    onModuleUpdated,
    reloadModule,
    token,
  ]);

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex justify-start">
        <ToolbarButton variant="primary" onClick={openCreate} disabled={busy}>
          Add blog post
        </ToolbarButton>
      </div>

      {tableRows.length === 0 ? (
        <div className="neu-panel rounded-[var(--radius-panel)] border border-solid [border-color:var(--divider-soft)] px-5 py-12 text-center text-[15px] leading-[1.65] text-[var(--foreground-secondary)] shadow-[var(--shadow-button)] sm:py-14">
          No published posts yet. Add a post (status will be saved as published)
          — it will show here after the blogs module is published on the site.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3">
          {tableRows.map((row) => (
            <ModuleItemCard
              key={row.id}
              label={(row.category ?? "").trim() || "Uncategorized"}
              title={row.title}
              onView={() => setBlogPreview(row)}
              onPrimaryClick={() => setBlogPreview(row)}
              onEdit={() => openEdit(row)}
              onDelete={() => setDeleteTarget(row)}
              busy={busy}
              viewAriaLabel={`Preview blog post ${row.title}`}
              editAriaLabel={`Edit ${row.title ?? "post"}`}
              deleteAriaLabel={`Delete ${row.title ?? "post"}`}>
              <p className="font-mono text-[11px] text-[var(--text-muted)]">
                /{row.slug}
              </p>
              <p className="mt-2 line-clamp-3 text-[13px]">
                {row.excerpt?.trim() || "—"}
              </p>
              <p className="mt-3 text-[12px] text-[var(--foreground-secondary)]">
                {row.author?.name?.trim() || "—"}
                {row.publishedAt
                  ? ` · ${new Date(row.publishedAt).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}`
                  : ""}
              </p>
            </ModuleItemCard>
          ))}
        </div>
      )}

      <Modal
        open={!!blogPreview}
        title="Blog post preview"
        size="xl"
        layout="plain"
        onClose={() => setBlogPreview(null)}>
        {blogPreview ? <BlogPostMarketingPreview post={blogPreview} /> : null}
      </Modal>

      <Modal
        open={modalOpen}
        title={editingSnapshot ? "Edit blog post" : "New blog post"}
        onClose={() => !busy && closeModal()}>
        <div className="space-y-5">
          <FormAlert message={formError} />
          <Field label="Slug *" error={fieldErrors.slug}>
            <input
              className={inputClass(!!fieldErrors.slug)}
              value={form.slug}
              aria-invalid={!!fieldErrors.slug}
              onChange={(e) => {
                setForm({ ...form, slug: e.target.value });
                setFieldErrors((f) => ({ ...f, slug: undefined }));
              }}
              placeholder="ai-in-healthcare"
              required
            />
          </Field>
          <Field label="Title *" error={fieldErrors.title}>
            <input
              className={inputClass(!!fieldErrors.title)}
              value={form.title}
              aria-invalid={!!fieldErrors.title}
              onChange={(e) => {
                setForm({ ...form, title: e.target.value });
                setFieldErrors((f) => ({ ...f, title: undefined }));
              }}
              placeholder="AI in Healthcare"
              required
            />
          </Field>
          <Field label="Category *" error={fieldErrors.category}>
            <input
              className={inputClass(!!fieldErrors.category)}
              value={form.category}
              aria-invalid={!!fieldErrors.category}
              onChange={(e) => {
                setForm({ ...form, category: e.target.value });
                setFieldErrors((f) => ({ ...f, category: undefined }));
              }}
              placeholder="AI"
              required
            />
          </Field>
          <Field label="Excerpt *" error={fieldErrors.excerpt}>
            <textarea
              className={`${inputClass(!!fieldErrors.excerpt)} min-h-[80px]`}
              value={form.excerpt}
              aria-invalid={!!fieldErrors.excerpt}
              onChange={(e) => {
                setForm({ ...form, excerpt: e.target.value });
                setFieldErrors((f) => ({ ...f, excerpt: undefined }));
              }}
              placeholder="Short summary"
              required
            />
          </Field>
          <Field label="Published at *" error={fieldErrors.publishedAt}>
            <input
              type="datetime-local"
              className={inputClass(!!fieldErrors.publishedAt)}
              value={form.publishedAt}
              aria-invalid={!!fieldErrors.publishedAt}
              onChange={(e) => {
                setForm({ ...form, publishedAt: e.target.value });
                setFieldErrors((f) => ({ ...f, publishedAt: undefined }));
              }}
            />
          </Field>
          <Field label="Hero image URL">
            <input
              className={inputClass()}
              value={form.heroImage}
              onChange={(e) => setForm({ ...form, heroImage: e.target.value })}
              placeholder="https://…"
            />
          </Field>
          <Field label="Author name *" error={fieldErrors.authorName}>
            <input
              className={inputClass(!!fieldErrors.authorName)}
              value={form.authorName}
              aria-invalid={!!fieldErrors.authorName}
              onChange={(e) => {
                setForm({ ...form, authorName: e.target.value });
                setFieldErrors((f) => ({ ...f, authorName: undefined }));
              }}
              placeholder="Nyra Team"
              required
            />
          </Field>
          <Field label="Author avatar URL">
            <input
              className={inputClass()}
              value={form.authorAvatar}
              onChange={(e) =>
                setForm({ ...form, authorAvatar: e.target.value })
              }
              placeholder="https://…"
            />
          </Field>
          <Field label="Tags (comma-separated)">
            <input
              className={inputClass()}
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              placeholder="ai, healthcare"
            />
          </Field>
          <div className="flex flex-wrap justify-end gap-3 pt-4">
            <ToolbarButton onClick={closeModal} disabled={busy}>
              Cancel
            </ToolbarButton>
            <ToolbarButton
              variant="primary"
              onClick={() => void save()}
              disabled={busy}>
              {busy ? "Saving…" : "Save"}
            </ToolbarButton>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete this post?"
        message={
          deleteTarget
            ? `Remove “${deleteTarget.title ?? deleteTarget.slug}” from the blog? This cannot be undone.`
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
