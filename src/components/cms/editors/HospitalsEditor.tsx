"use client";

import {
  ConflictError,
  createCollectionItem,
  createHospitalDoctor,
  deleteCollectionItem,
  deleteHospitalDoctor,
  normalizeDoctorItemForApi,
  updateCollectionItem,
  updateHospitalDoctor,
  uploadItemMedia,
} from "@/lib/content-api";
import { ensureModuleAfterMutation } from "@/lib/cms-refresh";
import {
  hospitalCategories,
  hospitals,
  newId,
  type Doctor,
  type Hospital,
  type HospitalCategory,
} from "@/lib/content-types";
import { RowDeleteButton, RowEditButton } from "@/components/cms/RowActionIcons";
import {
  Field,
  FormAlert,
  Modal,
  ConfirmDialog,
  ToolbarButton,
  inputClass,
} from "../shared";
import type { EditorProps } from "../editor-types";
import { useCallback, useMemo, useState } from "react";

const CAT = "categories";
const HOSP = "hospitals";

function emptyCategory(): HospitalCategory {
  return {
    id: newId("cat"),
    label: "",
    icon: "",
    description: "",
    visible: true,
  };
}

function emptyHospital(categories: HospitalCategory[]): Hospital {
  const firstCat = categories[0]?.id ?? "";
  return {
    id: newId("hospital"),
    slug: "",
    name: "",
    category: firstCat,
    tagline: "",
    image: "",
    location: { address: "", city: "", state: "", pincode: "" },
    contact: { phone: "", email: "", website: "" },
    meta: { rating: 0, reviewCount: 0, emergency: false },
    workingHours: {},
    facilities: [],
    doctors: [],
    visible: true,
  };
}

function emptyDoctor(): Doctor {
  return {
    id: newId("doctor"),
    name: "",
    specialty: "",
    qualification: "",
    experience: "",
    image: "",
    bio: "",
    languages: [],
    social: { linkedin: "" },
    visible: true,
  };
}

function facilitiesToString(f: string[] | undefined): string {
  return (f ?? []).join(", ");
}

function parseFacilities(s: string): string[] {
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function languagesToString(l: string[] | undefined): string {
  return (l ?? []).join(", ");
}

function parseLanguages(s: string): string[] {
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

export function HospitalsEditor({
  token,
  moduleKey,
  moduleData,
  onModuleUpdated,
  reloadModule,
  onError,
}: EditorProps) {
  const categories = hospitalCategories(moduleData);
  const hospList = hospitals(moduleData);

  const [tab, setTab] = useState<"categories" | "hospitals">("categories");

  const [catModal, setCatModal] = useState(false);
  const [catEdit, setCatEdit] = useState<HospitalCategory | null>(null);
  const [catDeleteTarget, setCatDeleteTarget] = useState<HospitalCategory | null>(
    null,
  );

  const [hospModal, setHospModal] = useState(false);
  const [hospEdit, setHospEdit] = useState<Hospital | null>(null);
  const [facStr, setFacStr] = useState("");
  const [hospDeleteTarget, setHospDeleteTarget] = useState<Hospital | null>(null);
  const [hospUploadBusy, setHospUploadBusy] = useState(false);

  const [docModal, setDocModal] = useState(false);
  const [docHospitalId, setDocHospitalId] = useState<string | null>(null);
  const [docEdit, setDocEdit] = useState<Doctor | null>(null);
  const [langStr, setLangStr] = useState("");
  const [docDelete, setDocDelete] = useState<{
    hospitalId: string;
    doctorId: string;
  } | null>(null);

  const [busy, setBusy] = useState(false);

  const [catFieldErrors, setCatFieldErrors] = useState<{ label?: string }>({});
  const [catFormError, setCatFormError] = useState<string | null>(null);
  const [hospFieldErrors, setHospFieldErrors] = useState<{
    slug?: string;
    name?: string;
    category?: string;
  }>({});
  const [hospFormError, setHospFormError] = useState<string | null>(null);
  const [docFieldErrors, setDocFieldErrors] = useState<{ name?: string }>({});
  const [docFormError, setDocFormError] = useState<string | null>(null);

  const closeCatModal = () => {
    setCatModal(false);
    setCatEdit(null);
    setCatFieldErrors({});
    setCatFormError(null);
  };

  const closeHospModal = () => {
    setHospModal(false);
    setHospEdit(null);
    setFacStr("");
    setHospFieldErrors({});
    setHospFormError(null);
  };

  const closeDocModal = () => {
    setDocModal(false);
    setDocEdit(null);
    setDocHospitalId(null);
    setLangStr("");
    setDocFieldErrors({});
    setDocFormError(null);
  };

  const catExists = useCallback(
    (id: string) => categories.some((c) => c.id === id),
    [categories],
  );

  const hospExists = useCallback(
    (id: string) => hospList.some((h) => h.id === id),
    [hospList],
  );

  const categoryOptions = useMemo(
    () =>
      categories.map((c) => (
        <option key={c.id} value={c.id}>
          {c.label ?? c.id}
        </option>
      )),
    [categories],
  );

  const saveCategory = async () => {
    if (!catEdit) return;
    const label = (catEdit.label ?? "").trim();
    if (!label) {
      setCatFieldErrors({ label: "Label is required." });
      setCatFormError(null);
      return;
    }
    const row = { ...catEdit, label };
    setCatFieldErrors({});
    setBusy(true);
    setCatFormError(null);
    try {
      const v = moduleData.version;
      const next = catExists(row.id)
        ? await updateCollectionItem(
            token,
            moduleKey,
            CAT,
            row.id,
            v,
            row,
          )
        : await createCollectionItem(
            token,
            moduleKey,
            CAT,
            v,
            row,
          );
      const mod = await ensureModuleAfterMutation(token, moduleKey, next);
      onModuleUpdated(mod);
      closeCatModal();
    } catch (e) {
      if (e instanceof ConflictError) {
        await reloadModule();
        setCatFormError(
          `${e.message} Latest version was loaded — review the form and try Save again.`,
        );
      } else {
        setCatFormError(e instanceof Error ? e.message : "Save failed.");
      }
    } finally {
      setBusy(false);
    }
  };

  const deleteCategory = async () => {
    if (!catDeleteTarget) return;
    setBusy(true);
    try {
      const next = await deleteCollectionItem(
        token,
        moduleKey,
        CAT,
        catDeleteTarget.id,
        moduleData.version,
      );
      const mod = await ensureModuleAfterMutation(token, moduleKey, next);
      onModuleUpdated(mod);
      setCatDeleteTarget(null);
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

  const saveHospital = async () => {
    if (!hospEdit) return;
    const slug = (hospEdit.slug ?? "").trim();
    const name = (hospEdit.name ?? "").trim();
    const category = (hospEdit.category ?? "").trim();
    const errs: typeof hospFieldErrors = {};
    if (!slug) errs.slug = "Slug is required.";
    if (!name) errs.name = "Name is required.";
    if (!category) errs.category = "Choose a category.";
    if (Object.keys(errs).length > 0) {
      setHospFieldErrors(errs);
      setHospFormError(null);
      return;
    }
    const facilitiesSnapshot = facStr;
    const payload: Hospital = {
      ...hospEdit,
      slug,
      name,
      category,
      facilities: parseFacilities(facilitiesSnapshot),
    };
    setHospFieldErrors({});
    setBusy(true);
    setHospFormError(null);
    try {
      const v = moduleData.version;
      const next = hospExists(payload.id)
        ? await updateCollectionItem(
            token,
            moduleKey,
            HOSP,
            payload.id,
            v,
            payload,
          )
        : await createCollectionItem(
            token,
            moduleKey,
            HOSP,
            v,
            payload,
          );
      const mod = await ensureModuleAfterMutation(token, moduleKey, next);
      onModuleUpdated(mod);
      closeHospModal();
    } catch (e) {
      if (e instanceof ConflictError) {
        await reloadModule();
        setHospFormError(
          `${e.message} Latest version was loaded — review the form and try Save again.`,
        );
      } else {
        setHospFormError(e instanceof Error ? e.message : "Save failed.");
      }
    } finally {
      setBusy(false);
    }
  };

  const deleteHospital = async () => {
    if (!hospDeleteTarget) return;
    setBusy(true);
    try {
      const next = await deleteCollectionItem(
        token,
        moduleKey,
        HOSP,
        hospDeleteTarget.id,
        moduleData.version,
      );
      const mod = await ensureModuleAfterMutation(token, moduleKey, next);
      onModuleUpdated(mod);
      setHospDeleteTarget(null);
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

  const onHospitalImageFile = async (file: File | null) => {
    if (!file || !hospEdit) return;
    setHospUploadBusy(true);
    setHospFormError(null);
    try {
      const next = await uploadItemMedia(
        token,
        moduleKey,
        HOSP,
        hospEdit.id,
        moduleData.version,
        file,
        "image",
      );
      const mod = await ensureModuleAfterMutation(token, moduleKey, next.module);
      onModuleUpdated(mod);
      if (next.url) {
        setHospEdit((prev) => (prev ? { ...prev, image: next.url } : null));
      }
    } catch (e) {
      if (e instanceof ConflictError) {
        await reloadModule();
        setHospFormError(
          `${e.message} Latest version was loaded — try uploading again.`,
        );
      } else {
        setHospFormError(e instanceof Error ? e.message : "Upload failed.");
      }
    } finally {
      setHospUploadBusy(false);
    }
  };

  const doctorsFor = useCallback(
    (hospitalId: string): Doctor[] => {
      const h = hospList.find((x) => x.id === hospitalId);
      return Array.isArray(h?.doctors) ? h!.doctors! : [];
    },
    [hospList],
  );

  const saveDoctor = async () => {
    if (!docEdit || !docHospitalId) return;
    const docName = (docEdit.name ?? "").trim();
    if (!docName) {
      setDocFieldErrors({ name: "Name is required." });
      setDocFormError(null);
      return;
    }
    const hospitalIdSnapshot = docHospitalId;
    const langSnapshot = langStr;
    const merged: Doctor = {
      ...docEdit,
      name: docName,
      languages: parseLanguages(langSnapshot),
    };
    const payload = normalizeDoctorItemForApi(merged);
    setDocFieldErrors({});
    setBusy(true);
    setDocFormError(null);
    try {
      const v = moduleData.version;
      const doctorId = String(payload.id ?? "");
      const existing = doctorsFor(hospitalIdSnapshot).some(
        (d) => d.id === doctorId,
      );
      const next = existing
        ? await updateHospitalDoctor(
            token,
            hospitalIdSnapshot,
            doctorId,
            v,
            payload,
          )
        : await createHospitalDoctor(token, hospitalIdSnapshot, v, payload);
      const mod = await ensureModuleAfterMutation(token, moduleKey, next);
      onModuleUpdated(mod);
      closeDocModal();
    } catch (e) {
      if (e instanceof ConflictError) {
        await reloadModule();
        setDocFormError(
          `${e.message} Latest version was loaded — review the form and try Save again.`,
        );
      } else {
        setDocFormError(e instanceof Error ? e.message : "Save failed.");
      }
    } finally {
      setBusy(false);
    }
  };

  const confirmDeleteDoctor = async () => {
    if (!docDelete) return;
    setBusy(true);
    try {
      const next = await deleteHospitalDoctor(
        token,
        docDelete.hospitalId,
        docDelete.doctorId,
        moduleData.version,
      );
      const mod = await ensureModuleAfterMutation(token, moduleKey, next);
      onModuleUpdated(mod);
      setDocDelete(null);
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
        <button
          type="button"
          onClick={() => setTab("categories")}
          className={`rounded-full px-4 py-2 text-[12px] font-semibold transition ${
            tab === "categories"
              ? "neu-btn-primary"
              : "neu-btn-default text-[var(--foreground-secondary)]"
          }`}>
          Categories
        </button>
        <button
          type="button"
          onClick={() => setTab("hospitals")}
          className={`rounded-full px-4 py-2 text-[12px] font-semibold transition ${
            tab === "hospitals"
              ? "neu-btn-primary"
              : "neu-btn-default text-[var(--foreground-secondary)]"
          }`}>
          Hospitals
        </button>
      </div>

      {tab === "categories" && (
        <>
          <ToolbarButton
            variant="primary"
            onClick={() => {
              setCatEdit(emptyCategory());
              setCatFieldErrors({});
              setCatFormError(null);
              setCatModal(true);
            }}
            disabled={busy}>
            Add category
          </ToolbarButton>
          <div className="neu-panel overflow-hidden p-0">
            <table className="w-full min-w-[400px] text-left text-[13px]">
              <thead>
                <tr className="text-[11px] font-semibold text-[var(--foreground-secondary)]">
                  <th className="neu-surface-inset-deep px-4 py-3">Label</th>
                  <th className="neu-surface-inset-deep px-2 py-3 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {categories.length === 0 ? (
                  <tr>
                    <td
                      colSpan={2}
                      className="px-4 py-8 text-center text-[var(--foreground-secondary)]">
                      No categories. Create one before hospitals.
                    </td>
                  </tr>
                ) : (
                  categories.map((row) => (
                    <tr key={row.id}>
                      <td className="px-4 py-3">{row.label ?? row.id}</td>
                      <td className="whitespace-nowrap px-2 py-3 text-right">
                        <RowEditButton
                          onClick={() => {
                            setCatEdit({ ...row });
                            setCatFieldErrors({});
                            setCatFormError(null);
                            setCatModal(true);
                          }}
                          disabled={busy}
                          ariaLabel={`Edit category ${row.label ?? row.id}`}
                        />
                        <RowDeleteButton
                          onClick={() => setCatDeleteTarget(row)}
                          disabled={busy}
                          ariaLabel={`Delete category ${row.label ?? row.id}`}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "hospitals" && (
        <>
          <ToolbarButton
            variant="primary"
            onClick={() => {
              setHospEdit(emptyHospital(categories));
              setFacStr("");
              setHospFieldErrors({});
              setHospFormError(null);
              setHospModal(true);
            }}
            disabled={busy || categories.length === 0}>
            Add hospital
          </ToolbarButton>
          {categories.length === 0 && (
            <p className="text-[13px] text-[var(--foreground-secondary)]">
              Add at least one category first.
            </p>
          )}
          <div className="neu-panel overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-[13px]">
                <thead>
                  <tr className="text-[11px] font-semibold text-[var(--foreground-secondary)]">
                    <th className="neu-surface-inset-deep px-4 py-3">Name</th>
                    <th className="neu-surface-inset-deep px-2 py-3">Slug</th>
                    <th className="neu-surface-inset-deep px-2 py-3 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {hospList.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-4 py-8 text-center text-[var(--foreground-secondary)]">
                        No hospitals yet.
                      </td>
                    </tr>
                  ) : (
                    hospList.map((row) => (
                      <tr key={row.id}>
                        <td className="px-4 py-3 font-medium">
                          {row.name ?? row.id}
                        </td>
                        <td className="max-w-[200px] truncate px-2 py-3 font-mono text-[12px]">
                          {row.slug ?? "—"}
                        </td>
                        <td className="px-2 py-3 text-right">
                          <div className="flex flex-wrap items-center justify-end gap-1">
                            <ToolbarButton
                              onClick={() => {
                                setDocHospitalId(row.id);
                                setDocEdit(emptyDoctor());
                                setLangStr("");
                                setDocFieldErrors({});
                                setDocFormError(null);
                                setDocModal(true);
                              }}
                              disabled={busy}>
                              Add doctor
                            </ToolbarButton>
                            <ToolbarButton
                              onClick={() => {
                                setDocHospitalId(row.id);
                                setDocEdit(null);
                                setDocFieldErrors({});
                                setDocFormError(null);
                                setDocModal(true);
                              }}
                              disabled={busy}>
                              Doctors
                            </ToolbarButton>
                            <RowEditButton
                              onClick={() => {
                                setHospEdit({ ...row });
                                setFacStr(facilitiesToString(row.facilities));
                                setHospFieldErrors({});
                                setHospFormError(null);
                                setHospModal(true);
                              }}
                              disabled={busy}
                              ariaLabel={`Edit hospital ${row.name ?? row.id}`}
                            />
                            <RowDeleteButton
                              onClick={() => setHospDeleteTarget(row)}
                              disabled={busy}
                              ariaLabel={`Delete hospital ${row.name ?? row.id}`}
                            />
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <Modal
        open={catModal}
        title={catEdit && catExists(catEdit.id) ? "Edit category" : "New category"}
        onClose={() => !busy && closeCatModal()}>
        {catEdit && (
          <div className="space-y-3">
            <FormAlert message={catFormError} />
            <Field label="Label *" error={catFieldErrors.label}>
              <input
                className={inputClass(!!catFieldErrors.label)}
                value={catEdit.label ?? ""}
                aria-invalid={!!catFieldErrors.label}
                onChange={(e) => {
                  setCatEdit({ ...catEdit, label: e.target.value });
                  setCatFieldErrors((f) => ({ ...f, label: undefined }));
                }}
              />
            </Field>
            <Field label="Icon key">
              <input
                className={inputClass()}
                value={catEdit.icon ?? ""}
                onChange={(e) =>
                  setCatEdit({ ...catEdit, icon: e.target.value })
                }
              />
            </Field>
            <Field label="Description">
              <textarea
                className={`${inputClass()} min-h-[72px]`}
                value={catEdit.description ?? ""}
                onChange={(e) =>
                  setCatEdit({ ...catEdit, description: e.target.value })
                }
              />
            </Field>
            <label className="flex items-center gap-2 text-[13px]">
              <input
                type="checkbox"
                checked={catEdit.visible !== false}
                onChange={(e) =>
                  setCatEdit({ ...catEdit, visible: e.target.checked })
                }
              />
              Visible
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <ToolbarButton onClick={closeCatModal} disabled={busy}>
                Cancel
              </ToolbarButton>
              <ToolbarButton
                variant="primary"
                onClick={() => void saveCategory()}
                disabled={busy}>
                {busy ? "Saving…" : "Save"}
              </ToolbarButton>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={hospModal}
        title={
          hospEdit && hospExists(hospEdit.id) ? "Edit hospital" : "New hospital"
        }
        onClose={() =>
          !busy && !hospUploadBusy && closeHospModal()
        }>
        {hospEdit && (
          <div className="space-y-3">
            <FormAlert message={hospFormError} />
            <Field label="Slug *" error={hospFieldErrors.slug}>
              <input
                className={inputClass(!!hospFieldErrors.slug)}
                value={hospEdit.slug ?? ""}
                aria-invalid={!!hospFieldErrors.slug}
                onChange={(e) => {
                  setHospEdit({ ...hospEdit, slug: e.target.value });
                  setHospFieldErrors((f) => ({ ...f, slug: undefined }));
                }}
              />
            </Field>
            <Field label="Name *" error={hospFieldErrors.name}>
              <input
                className={inputClass(!!hospFieldErrors.name)}
                value={hospEdit.name ?? ""}
                aria-invalid={!!hospFieldErrors.name}
                onChange={(e) => {
                  setHospEdit({ ...hospEdit, name: e.target.value });
                  setHospFieldErrors((f) => ({ ...f, name: undefined }));
                }}
              />
            </Field>
            <Field label="Category *" error={hospFieldErrors.category}>
              <select
                className={inputClass(!!hospFieldErrors.category)}
                value={hospEdit.category ?? ""}
                aria-invalid={!!hospFieldErrors.category}
                onChange={(e) => {
                  setHospEdit({ ...hospEdit, category: e.target.value });
                  setHospFieldErrors((f) => ({ ...f, category: undefined }));
                }}>
                <option value="">—</option>
                {categoryOptions}
              </select>
            </Field>
            <Field label="Tagline">
              <input
                className={inputClass()}
                value={hospEdit.tagline ?? ""}
                onChange={(e) =>
                  setHospEdit({ ...hospEdit, tagline: e.target.value })
                }
              />
            </Field>
            <Field label="Image URL">
              <input
                className={inputClass()}
                value={hospEdit.image ?? ""}
                onChange={(e) =>
                  setHospEdit({ ...hospEdit, image: e.target.value })
                }
              />
            </Field>
            <div>
              <span className="mb-1.5 block text-[12px] font-medium text-[var(--foreground-secondary)]">
                Upload hospital image
              </span>
              <input
                type="file"
                accept="image/*"
                disabled={hospUploadBusy || busy}
                onChange={(e) =>
                  void onHospitalImageFile(e.target.files?.[0] ?? null)
                }
              />
              {hospUploadBusy && (
                <p className="mt-1 text-[12px] text-[var(--foreground-secondary)]">
                  Uploading…
                </p>
              )}
            </div>
            <p className="text-[11px] text-[var(--foreground-secondary)]">
              Save the hospital once before upload if it is new.
            </p>
            <Field label="Address">
              <input
                className={inputClass()}
                value={hospEdit.location?.address ?? ""}
                onChange={(e) =>
                  setHospEdit({
                    ...hospEdit,
                    location: {
                      ...hospEdit.location,
                      address: e.target.value,
                    },
                  })
                }
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="City">
                <input
                  className={inputClass()}
                  value={hospEdit.location?.city ?? ""}
                  onChange={(e) =>
                    setHospEdit({
                      ...hospEdit,
                      location: {
                        ...hospEdit.location,
                        city: e.target.value,
                      },
                    })
                  }
                />
              </Field>
              <Field label="State">
                <input
                  className={inputClass()}
                  value={hospEdit.location?.state ?? ""}
                  onChange={(e) =>
                    setHospEdit({
                      ...hospEdit,
                      location: {
                        ...hospEdit.location,
                        state: e.target.value,
                      },
                    })
                  }
                />
              </Field>
              <Field label="Pincode">
                <input
                  className={inputClass()}
                  value={hospEdit.location?.pincode ?? ""}
                  onChange={(e) =>
                    setHospEdit({
                      ...hospEdit,
                      location: {
                        ...hospEdit.location,
                        pincode: e.target.value,
                      },
                    })
                  }
                />
              </Field>
            </div>
            <Field label="Phone">
              <input
                className={inputClass()}
                value={hospEdit.contact?.phone ?? ""}
                onChange={(e) =>
                  setHospEdit({
                    ...hospEdit,
                    contact: {
                      ...hospEdit.contact,
                      phone: e.target.value,
                    },
                  })
                }
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                className={inputClass()}
                value={hospEdit.contact?.email ?? ""}
                onChange={(e) =>
                  setHospEdit({
                    ...hospEdit,
                    contact: {
                      ...hospEdit.contact,
                      email: e.target.value,
                    },
                  })
                }
              />
            </Field>
            <Field label="Website">
              <input
                className={inputClass()}
                value={hospEdit.contact?.website ?? ""}
                onChange={(e) =>
                  setHospEdit({
                    ...hospEdit,
                    contact: {
                      ...hospEdit.contact,
                      website: e.target.value,
                    },
                  })
                }
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Rating">
                <input
                  type="number"
                  step="0.1"
                  className={inputClass()}
                  value={hospEdit.meta?.rating ?? ""}
                  onChange={(e) =>
                    setHospEdit({
                      ...hospEdit,
                      meta: {
                        ...hospEdit.meta,
                        rating: Number(e.target.value),
                      },
                    })
                  }
                />
              </Field>
              <Field label="Review count">
                <input
                  type="number"
                  className={inputClass()}
                  value={hospEdit.meta?.reviewCount ?? ""}
                  onChange={(e) =>
                    setHospEdit({
                      ...hospEdit,
                      meta: {
                        ...hospEdit.meta,
                        reviewCount: Number(e.target.value),
                      },
                    })
                  }
                />
              </Field>
              <label className="flex items-end gap-2 pb-2 text-[13px]">
                <input
                  type="checkbox"
                  checked={!!hospEdit.meta?.emergency}
                  onChange={(e) =>
                    setHospEdit({
                      ...hospEdit,
                      meta: {
                        ...hospEdit.meta,
                        emergency: e.target.checked,
                      },
                    })
                  }
                />
                Emergency
              </label>
            </div>
            <Field label="Facilities (comma-separated)">
              <input
                className={inputClass()}
                value={facStr}
                onChange={(e) => setFacStr(e.target.value)}
              />
            </Field>
            <label className="flex items-center gap-2 text-[13px]">
              <input
                type="checkbox"
                checked={hospEdit.visible !== false}
                onChange={(e) =>
                  setHospEdit({ ...hospEdit, visible: e.target.checked })
                }
              />
              Visible
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <ToolbarButton
                onClick={closeHospModal}
                disabled={busy || hospUploadBusy}>
                Cancel
              </ToolbarButton>
              <ToolbarButton
                variant="primary"
                onClick={() => void saveHospital()}
                disabled={busy || hospUploadBusy}>
                {busy ? "Saving…" : "Save"}
              </ToolbarButton>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={docModal && !!docHospitalId}
        title={(() => {
          const hospitalName =
            hospList.find((h) => h.id === docHospitalId)?.name ?? docHospitalId;
          const editingExisting =
            !!docEdit &&
            !!docHospitalId &&
            doctorsFor(docHospitalId).some((d) => d.id === docEdit!.id);
          if (docEdit && editingExisting) return "Edit doctor";
          if (docEdit) return "New doctor";
          return `Doctors — ${hospitalName}`;
        })()}
        onClose={() => !busy && closeDocModal()}>
        {docHospitalId && (
          <div className="space-y-4">
            {!docEdit && (
              <ul className="space-y-2">
                {doctorsFor(docHospitalId).length === 0 ? (
                  <li className="text-[13px] text-[var(--foreground-secondary)]">
                    No doctors. Click Add doctor from the list.
                  </li>
                ) : (
                  doctorsFor(docHospitalId).map((d) => (
                    <li
                      key={d.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--border)] px-3 py-2">
                      <span className="text-[13px]">{d.name ?? d.id}</span>
                      <span className="flex shrink-0 items-center gap-0.5">
                        <RowEditButton
                          onClick={() => {
                            setDocEdit({ ...d });
                            setLangStr(languagesToString(d.languages));
                            setDocFieldErrors({});
                            setDocFormError(null);
                          }}
                          disabled={busy}
                          ariaLabel={`Edit doctor ${d.name ?? d.id}`}
                        />
                        <RowDeleteButton
                          onClick={() =>
                            setDocDelete({
                              hospitalId: docHospitalId,
                              doctorId: d.id,
                            })
                          }
                          disabled={busy}
                          ariaLabel={`Delete doctor ${d.name ?? d.id}`}
                        />
                      </span>
                    </li>
                  ))
                )}
              </ul>
            )}
            {docEdit && (
              <>
                <FormAlert message={docFormError} />
                <Field label="Name *" error={docFieldErrors.name}>
                  <input
                    className={inputClass(!!docFieldErrors.name)}
                    value={docEdit.name ?? ""}
                    aria-invalid={!!docFieldErrors.name}
                    onChange={(e) => {
                      setDocEdit({ ...docEdit, name: e.target.value });
                      setDocFieldErrors((f) => ({ ...f, name: undefined }));
                    }}
                  />
                </Field>
                <Field label="Specialty">
                  <input
                    className={inputClass()}
                    value={docEdit.specialty ?? ""}
                    onChange={(e) =>
                      setDocEdit({ ...docEdit, specialty: e.target.value })
                    }
                  />
                </Field>
                <Field label="Qualification">
                  <input
                    className={inputClass()}
                    value={docEdit.qualification ?? ""}
                    onChange={(e) =>
                      setDocEdit({ ...docEdit, qualification: e.target.value })
                    }
                  />
                </Field>
                <Field label="Experience">
                  <input
                    className={inputClass()}
                    value={docEdit.experience ?? ""}
                    onChange={(e) =>
                      setDocEdit({ ...docEdit, experience: e.target.value })
                    }
                  />
                </Field>
                <Field label="Image URL">
                  <input
                    className={inputClass()}
                    value={docEdit.image ?? ""}
                    onChange={(e) =>
                      setDocEdit({ ...docEdit, image: e.target.value })
                    }
                  />
                </Field>
                <Field label="Bio">
                  <textarea
                    className={`${inputClass()} min-h-[80px]`}
                    value={docEdit.bio ?? ""}
                    onChange={(e) =>
                      setDocEdit({ ...docEdit, bio: e.target.value })
                    }
                  />
                </Field>
                <Field label="Languages (comma-separated)">
                  <input
                    className={inputClass()}
                    value={langStr}
                    onChange={(e) => setLangStr(e.target.value)}
                  />
                </Field>
                <Field label="LinkedIn URL">
                  <input
                    className={inputClass()}
                    value={docEdit.social?.linkedin ?? ""}
                    onChange={(e) =>
                      setDocEdit({
                        ...docEdit,
                        social: {
                          ...docEdit.social,
                          linkedin: e.target.value,
                        },
                      })
                    }
                  />
                </Field>
                <label className="flex items-center gap-2 text-[13px]">
                  <input
                    type="checkbox"
                    checked={docEdit.visible !== false}
                    onChange={(e) =>
                      setDocEdit({ ...docEdit, visible: e.target.checked })
                    }
                  />
                  Visible
                </label>
                <div className="flex justify-end gap-2 pt-2">
                  <ToolbarButton
                    onClick={() => {
                      setDocEdit(null);
                      setDocFieldErrors({});
                      setDocFormError(null);
                    }}
                    disabled={busy}>
                    {doctorsFor(docHospitalId).length ? "Back to list" : "Cancel"}
                  </ToolbarButton>
                  <ToolbarButton
                    variant="primary"
                    onClick={() => void saveDoctor()}
                    disabled={busy}>
                    {busy ? "Saving…" : "Save doctor"}
                  </ToolbarButton>
                </div>
              </>
            )}
            {!docEdit && (
              <ToolbarButton onClick={closeDocModal}>Close</ToolbarButton>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!catDeleteTarget}
        title="Delete category?"
        message={
          catDeleteTarget
            ? `Remove “${catDeleteTarget.label ?? catDeleteTarget.id}”? Hospitals using this category may need updates.`
            : ""
        }
        confirmLabel="Delete"
        busy={busy}
        onCancel={() => setCatDeleteTarget(null)}
        onConfirm={() => void deleteCategory()}
      />
      <ConfirmDialog
        open={!!hospDeleteTarget}
        title="Delete hospital?"
        message={
          hospDeleteTarget
            ? `Remove “${hospDeleteTarget.name ?? hospDeleteTarget.id}” and all nested doctor data? This cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        busy={busy}
        onCancel={() => setHospDeleteTarget(null)}
        onConfirm={() => void deleteHospital()}
      />
      <ConfirmDialog
        open={!!docDelete}
        title="Delete doctor?"
        message="This cannot be undone."
        busy={busy}
        onCancel={() => setDocDelete(null)}
        onConfirm={() => void confirmDeleteDoctor()}
      />
    </div>
  );
}
