"use client";

import { useState, useTransition } from "react";
import {
  Users,
  Plus,
  Trash2,
  Save,
  RotateCcw,
  Check,
  Loader2,
  AlertCircle,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Info,
  Sparkles,
  Layers,
} from "lucide-react";
import {
  saveMasterFamilyTemplate,
  resetMasterFamilyTemplate,
} from "@/app/(dashboard)/settings/templates/actions";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import type {
  MasterFamilyTemplate,
  FormCategorySchema,
  FormFieldSchema,
} from "@/types/database";

interface MasterFamilyTemplatesManagerProps {
  initialTemplate: MasterFamilyTemplate;
}

/**
 * Derives safe snake_case identifier keys automatically from labels/titles
 */
function toSnakeCase(str: string): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
}

const COMMON_FIELD_PRESETS = [
  { id: "nama_lengkap", label: "Nama Lengkap", required: false },
  { id: "hubungan_peran", label: "Hubungan / Peran", required: false },
  { id: "no_whatsapp_hp", label: "No. WhatsApp / HP", required: false },
  { id: "alamat_lengkap", label: "Alamat Lengkap", required: false },
  { id: "catatan_khusus", label: "Catatan Khusus", required: false },
];

export function MasterFamilyTemplatesManager({
  initialTemplate,
}: MasterFamilyTemplatesManagerProps) {
  const [template, setTemplate] = useState<MasterFamilyTemplate>(initialTemplate);
  const [categories, setCategories] = useState<FormCategorySchema[]>(
    initialTemplate.categories && initialTemplate.categories.length > 0
      ? initialTemplate.categories
      : []
  );
  const [isPending, startTransition] = useTransition();
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Update Category field
  const updateCategory = (
    index: number,
    field: keyof FormCategorySchema,
    value: unknown
  ) => {
    setCategories((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Move Category Up / Down
  const moveCategory = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= categories.length) return;

    setCategories((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;
      return next;
    });
  };

  // Add new Category with auto-generated snake_case key
  const addCategory = () => {
    const title = "Kategori Baru";
    const baseSlug = toSnakeCase(title) || "kategori_baru";
    const existingIds = new Set(categories.map((c) => c.id));
    let uniqueId = baseSlug;
    let counter = 2;
    while (existingIds.has(uniqueId)) {
      uniqueId = `${baseSlug}_${counter}`;
      counter++;
    }

    const newCat: FormCategorySchema = {
      id: uniqueId,
      title: title,
      name: title,
      description: "Deskripsi singkat peruntukan kategori keluarga ini",
      fields: [
        { id: "nama_lengkap", label: "Nama Lengkap", required: false },
        { id: "hubungan_peran", label: "Hubungan / Peran", required: false },
        { id: "no_whatsapp_hp", label: "No. WhatsApp / HP", required: false },
        { id: "catatan_khusus", label: "Catatan Khusus", required: false },
      ],
    };
    setCategories((prev) => [...prev, newCat]);
  };

  // Remove Category
  const removeCategory = (index: number) => {
    setCategories((prev) => prev.filter((_, i) => i !== index));
  };

  // Add Field to Category with auto-generated snake_case key & required: false by default
  const addFieldToCategory = (catIndex: number, preset?: FormFieldSchema) => {
    setCategories((prev) => {
      const next = [...prev];
      const cat = next[catIndex];
      const existingFields = cat.fields || [];

      const label = preset ? preset.label : "Kolom Tambahan";
      const baseSlug = toSnakeCase(preset?.id || label) || `kolom_${existingFields.length + 1}`;

      const existingIds = new Set(existingFields.map((f) => f.id));
      let uniqueId = baseSlug;
      let counter = 2;
      while (existingIds.has(uniqueId)) {
        uniqueId = `${baseSlug}_${counter}`;
        counter++;
      }

      const newField: FormFieldSchema = {
        id: uniqueId,
        label,
        required: false, // Default to unchecked / false
      };

      next[catIndex] = {
        ...cat,
        fields: [...existingFields, newField],
      };
      return next;
    });
  };

  // Update Field inside Category
  const updateField = (
    catIndex: number,
    fieldIndex: number,
    fieldKey: keyof FormFieldSchema,
    val: unknown
  ) => {
    setCategories((prev) => {
      const next = [...prev];
      const cat = next[catIndex];
      const fields = [...(cat.fields || [])];
      fields[fieldIndex] = { ...fields[fieldIndex], [fieldKey]: val };
      next[catIndex] = { ...cat, fields };
      return next;
    });
  };

  // Remove Field from Category
  const removeFieldFromCategory = (catIndex: number, fieldIndex: number) => {
    setCategories((prev) => {
      const next = [...prev];
      const cat = next[catIndex];
      const fields = (cat.fields || []).filter((_, i) => i !== fieldIndex);
      next[catIndex] = { ...cat, fields };
      return next;
    });
  };

  // Save Blueprint with auto-generated safe snake_case identifier keys
  const handleSave = () => {
    setSaveStatus("saving");
    setStatusMessage("");

    startTransition(async () => {
      const sanitizedCategories: FormCategorySchema[] = categories.map((cat, catIdx) => {
        const catTitle = (cat.title || cat.name || `Kategori ${catIdx + 1}`).trim();
        const baseCatId = toSnakeCase(cat.id || catTitle) || `kategori_${catIdx + 1}`;

        const seenFieldKeys = new Set<string>();
        const fields = (cat.fields || []).map((fld, fldIdx) => {
          const label = (fld.label || `Kolom ${fldIdx + 1}`).trim();
          const baseFieldId = toSnakeCase(fld.id || label) || `kolom_${fldIdx + 1}`;
          let uniqueFieldId = baseFieldId;
          let counter = 2;
          while (seenFieldKeys.has(uniqueFieldId)) {
            uniqueFieldId = `${baseFieldId}_${counter}`;
            counter++;
          }
          seenFieldKeys.add(uniqueFieldId);

          return {
            id: uniqueFieldId,
            label,
            type: fld.type || "text",
            required: Boolean(fld.required),
          };
        });

        return {
          id: baseCatId,
          title: catTitle,
          name: catTitle,
          description: cat.description || "",
          fields,
        };
      });

      const res = await saveMasterFamilyTemplate(sanitizedCategories, template.name);
      if (res.success && res.data) {
        setTemplate(res.data);
        setCategories(res.data.categories);
        setSaveStatus("saved");
        setStatusMessage("Blueprint template master data keluarga berhasil disimpan!");
        setTimeout(() => setSaveStatus("idle"), 3000);
      } else {
        setSaveStatus("error");
        setStatusMessage(res.error || "Gagal menyimpan blueprint template keluarga.");
      }
    });
  };

  // Reset to Default Presets
  const handleReset = () => {
    setSaveStatus("saving");
    startTransition(async () => {
      const res = await resetMasterFamilyTemplate();
      if (res.success && res.data) {
        setTemplate(res.data);
        setCategories(res.data.categories);
        setSaveStatus("saved");
        setStatusMessage("Template master data keluarga berhasil direset ke preset bawaan!");
        setShowResetConfirm(false);
        setTimeout(() => setSaveStatus("idle"), 3000);
      } else {
        setSaveStatus("error");
        setStatusMessage(res.error || "Gagal mereset template master.");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Action Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-card border border-border shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">
              Blueprint Master Template Data Keluarga
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Kelola kategori & kolom default formulir publik untuk seluruh acara baru.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end">
          <button
            type="button"
            id="reset-family-template-btn"
            onClick={() => setShowResetConfirm(true)}
            disabled={isPending}
            className="apple-btn-secondary px-3 py-2 text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Reset ke struktur kategori bawaan"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Preset</span>
          </button>

          <button
            type="button"
            id="add-family-category-btn"
            onClick={addCategory}
            disabled={isPending}
            className="apple-btn-secondary px-3.5 py-2 text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            <span>Tambah Kategori</span>
          </button>

          <button
            type="button"
            id="save-family-template-btn"
            onClick={handleSave}
            disabled={isPending || saveStatus === "saving"}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer active:scale-[0.98] disabled:opacity-50"
          >
            {saveStatus === "saving" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : saveStatus === "saved" ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>
              {saveStatus === "saving"
                ? "Menyimpan..."
                : saveStatus === "saved"
                ? "Tersimpan"
                : "Simpan Blueprint"}
            </span>
          </button>
        </div>
      </div>

      {/* Status Messages */}
      {statusMessage && (
        <div
          className={`p-3.5 rounded-xl text-xs font-medium border flex items-center gap-2 animate-in fade-in duration-200 ${
            saveStatus === "saved"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
              : "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400"
          }`}
        >
          {saveStatus === "saved" ? (
            <Check className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Categories Blueprint List */}
      <div className="space-y-4">
        {categories.map((cat, catIdx) => {
          const fields = cat.fields || [];

          return (
            <div
              key={cat.id || catIdx}
              id={`family-category-card-${catIdx}`}
              className="apple-card p-5 border border-border/80 shadow-xs space-y-4 transition-all"
            >
              {/* Category Header Row */}
              <div className="flex items-start justify-between gap-3 border-b border-border/70 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-lg bg-muted text-muted-foreground font-bold text-xs flex items-center justify-center shrink-0">
                    {catIdx + 1}
                  </span>
                  <div>
                    <h3 className="text-xs font-bold text-foreground">
                      {cat.title || cat.name || "Kategori Tanpa Nama"}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveCategory(catIdx, "up")}
                    disabled={catIdx === 0}
                    className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer disabled:opacity-30"
                    title="Pindahkan ke atas"
                    aria-label="Pindahkan ke atas"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveCategory(catIdx, "down")}
                    disabled={catIdx === categories.length - 1}
                    className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer disabled:opacity-30"
                    title="Pindahkan ke bawah"
                    aria-label="Pindahkan ke bawah"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeCategory(catIdx)}
                    className="p-1 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-600 transition-colors cursor-pointer ml-1"
                    title="Hapus kategori ini"
                    aria-label="Hapus kategori ini"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Category Details Form Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-foreground mb-1">
                    Nama Kategori *
                  </label>
                  <input
                    type="text"
                    value={cat.title || cat.name || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      updateCategory(catIdx, "name", val);
                      updateCategory(catIdx, "title", val);
                      const autoKey = toSnakeCase(val);
                      if (autoKey) {
                        updateCategory(catIdx, "id", autoKey);
                      }
                    }}
                    placeholder="Contoh: Keluarga Groom (Mempelai Pria)"
                    className="apple-input w-full px-3 py-2 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-foreground mb-1">
                    Keterangan / Panduan Klien
                  </label>
                  <input
                    type="text"
                    value={cat.description || ""}
                    onChange={(e) => updateCategory(catIdx, "description", e.target.value)}
                    placeholder="Contoh: Keluarga inti & perwakilan keluarga besar dari pihak mempelai pria"
                    className="apple-input w-full px-3 py-2 text-xs"
                  />
                </div>
              </div>

              {/* Sub-section: Category Fields Blueprint */}
              <div className="pt-2 border-t border-border/70 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-rose-500" />
                    <span>Kolom Data Anggota ({fields.length} kolom)</span>
                  </label>

                  {/* Add Field Button */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => addFieldToCategory(catIdx)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-muted hover:bg-muted/80 text-foreground text-[11px] font-semibold transition-colors cursor-pointer"
                    >
                      <Plus className="w-3 h-3 text-[#007aff]" />
                      <span>Tambah Kolom</span>
                    </button>
                  </div>
                </div>

                {/* Field Presets Bar if few fields */}
                {fields.length < 5 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-muted-foreground mr-1">
                      Preset Kolom:
                    </span>
                    {COMMON_FIELD_PRESETS.filter(
                      (p) => !fields.some((f) => f.id === p.id)
                    ).map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => addFieldToCategory(catIdx, preset)}
                        className="px-2 py-0.5 rounded-md bg-muted/60 hover:bg-muted border border-border text-[10px] text-muted-foreground hover:text-foreground font-medium transition-colors cursor-pointer"
                      >
                        + {preset.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Fields Table / Grid */}
                <div className="space-y-2">
                  {fields.map((fld, fldIdx) => (
                    <div
                      key={fld.id || fldIdx}
                      className="flex items-center gap-2.5 p-2 rounded-xl bg-muted/30 border border-border/70 text-xs"
                    >
                      <GripVertical className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
                      
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <input
                          type="text"
                          value={fld.label}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateField(catIdx, fldIdx, "label", val);
                            const autoKey = toSnakeCase(val);
                            if (autoKey) {
                              updateField(catIdx, fldIdx, "id", autoKey);
                            }
                          }}
                          placeholder="Label Kolom (misal: Nama Lengkap)"
                          className="apple-input px-2.5 py-1.5 text-xs flex-1 min-w-[140px]"
                        />

                        <div className="flex items-center gap-3 shrink-0">
                          <label className="flex items-center gap-1.5 text-[11px] text-foreground cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={Boolean(fld.required)}
                              onChange={(e) =>
                                updateField(catIdx, fldIdx, "required", e.target.checked)
                              }
                              className="w-3.5 h-3.5 rounded border-border text-rose-600 focus:ring-rose-500 cursor-pointer"
                            />
                            <span>Wajib Diisi</span>
                          </label>

                          <button
                            type="button"
                            onClick={() => removeFieldFromCategory(catIdx, fldIdx)}
                            className="p-1 rounded-md hover:bg-rose-500/10 text-muted-foreground hover:text-rose-600 transition-colors cursor-pointer"
                            title="Hapus kolom ini"
                            aria-label="Hapus kolom ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}

        {categories.length === 0 && (
          <div className="p-8 text-center rounded-2xl bg-muted/20 border border-dashed border-border space-y-3">
            <Users className="w-8 h-8 text-muted-foreground mx-auto" />
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-foreground">
                Belum ada kategori dalam Blueprint Master
              </h4>
              <p className="text-[11px] text-muted-foreground">
                Klik tombol di bawah untuk menambahkan kategori baru atau reset ke preset awal.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={addCategory}
                className="apple-btn-primary px-3 py-1.5 text-xs"
              >
                + Tambah Kategori
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="apple-btn-secondary px-3 py-1.5 text-xs"
              >
                Reset Preset
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal for Reset */}
      <ConfirmModal
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={handleReset}
        title="Konfirmasi Reset Blueprint Master Data Keluarga"
        message="Apakah Anda yakin ingin mereset blueprint data keluarga ke preset bawaan sistem (Keluarga Groom, Keluarga Bride, Wakil Foto, dan VIP)? Seluruh kustomisasi kategori master saat ini akan ditimpa."
        confirmLabel="Ya, Reset ke Bawaan"
        cancelLabel="Batal"
      />
    </div>
  );
}
