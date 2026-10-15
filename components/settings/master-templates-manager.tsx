"use client";

import { useState, useRef, useTransition, useMemo } from "react";
import {
  FileSpreadsheet,
  Plus,
  Trash2,
  Edit2,
  Save,
  RotateCcw,
  Check,
  Loader2,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import {
  DynamicSheetGrid,
  type DynamicSheetGridHandle,
} from "@/components/events/spreadsheet/dynamic-sheet-grid";
import {
  saveMasterTemplate,
  createMasterTemplate,
  deleteMasterTemplate,
  resetAllMasterTemplates,
} from "@/app/(dashboard)/settings/templates/actions";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import type { MasterTemplate, SheetData } from "@/types/database";

interface MasterTemplatesManagerProps {
  initialTemplates: MasterTemplate[];
}

export function MasterTemplatesManager({ initialTemplates }: MasterTemplatesManagerProps) {
  const [templates, setTemplates] = useState<MasterTemplate[]>(initialTemplates);
  const [activeTemplateId, setActiveTemplateId] = useState<string>(
    initialTemplates[0]?.id || ""
  );
  const [isPending, startTransition] = useTransition();
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [gridRevision, setGridRevision] = useState<number>(0);

  const gridRef = useRef<DynamicSheetGridHandle | null>(null);

  const activeTemplate = useMemo(
    () => templates.find((t) => t.id === activeTemplateId) || templates[0],
    [templates, activeTemplateId]
  );

  const handleSelectTemplate = (nextId: string) => {
    if (nextId === activeTemplateId) return;
    // Commit any pending (unsaved) grid data into in-memory templates before switching tabs
    if (activeTemplate && gridRef.current) {
      const pendingData = gridRef.current.getData();
      setTemplates((prev) =>
        prev.map((t) => (t.id === activeTemplate.id ? { ...t, jsonb_structure: pendingData } : t))
      );
    }
    setActiveTemplateId(nextId);
  };

  // Manual save: reads the current spreadsheet state from the ref and persists it ONCE.
  // This is the ONLY path that triggers a network request for template data.
  const handleManualSave = () => {
    if (!activeTemplate) return;
    const currentData = gridRef.current?.getData() || activeTemplate.jsonb_structure;

    setSaveStatus("saving");
    startTransition(async () => {
      const res = await saveMasterTemplate(
        activeTemplate.id,
        activeTemplate.sheet_name,
        currentData,
        activeTemplate.order_index
      );
      if (res.success) {
        setTemplates((prev) =>
          prev.map((t) =>
            t.id === activeTemplate.id ? { ...t, jsonb_structure: currentData } : t
          )
        );
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2500);
      } else {
        setSaveStatus("error");
        setStatusMessage(res.error || "Gagal menyimpan template");
      }
    });
  };

  const handleAddNewTemplate = () => {
    const name = prompt("Nama Master Template baru (misal: 'Protokoler VIP'):")?.trim();
    if (!name) return;

    if (templates.some((t) => t.sheet_name.toLowerCase() === name.toLowerCase())) {
      alert("Template dengan nama ini sudah ada.");
      return;
    }

    const initialStructure: SheetData = {
      columns: [
        { id: "col_1", name: "No" },
        { id: "col_2", name: "Item / Nama" },
        { id: "col_3", name: "Kategori" },
        { id: "col_4", name: "Status" },
      ],
      rows: [{ id: "row_1", col_1: "1", col_2: "", col_3: "", col_4: "" }],
    };

    setSaveStatus("saving");
    startTransition(async () => {
      const res = await createMasterTemplate(name, initialStructure, templates.length);
      if (res.success && res.data) {
        setTemplates([...templates, res.data]);
        setActiveTemplateId(res.data.id);
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2500);
      } else {
        setSaveStatus("error");
        setStatusMessage(res.error || "Gagal membuat template baru");
      }
    });
  };
  const handleRenameTemplate = () => {
    if (!activeTemplate) return;
    const nextName = prompt("Ubah nama master template:", activeTemplate.sheet_name)?.trim();
    if (!nextName || nextName === activeTemplate.sheet_name) return;

    const nextTemplates = templates.map((t) =>
      t.id === activeTemplate.id ? { ...t, sheet_name: nextName } : t
    );
    setTemplates(nextTemplates);
    setSaveStatus("saving");

    startTransition(async () => {
      const res = await saveMasterTemplate(
        activeTemplate.id,
        nextName,
        activeTemplate.jsonb_structure,
        activeTemplate.order_index
      );
      if (res.success) {
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2500);
      } else {
        setSaveStatus("error");
        setStatusMessage(res.error || "Gagal mengubah nama");
      }
    });
  };

  const handleDeleteTemplate = () => {
    if (!activeTemplate) return;
    if (templates.length <= 1) {
      alert("Minimal harus ada 1 master template dalam sistem.");
      return;
    }
    setShowDeleteConfirm(true);
  };

  const confirmDeleteTemplate = async () => {
    if (!activeTemplate || templates.length <= 1) return;

    setSaveStatus("saving");
    const res = await deleteMasterTemplate(activeTemplate.id);
    if (res.success) {
      const remaining = templates.filter((t) => t.id !== activeTemplate.id);
      setTemplates(remaining);
      setActiveTemplateId(remaining[0]?.id || "");
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2500);
    } else {
      setSaveStatus("error");
      setStatusMessage(res.error || "Gagal menghapus template");
      throw new Error(res.error || "Gagal menghapus template");
    }
  };

  const handleResetAll = () => {
    setShowResetConfirm(true);
  };

  const confirmResetAll = async () => {
    setSaveStatus("saving");
    const res = await resetAllMasterTemplates();
    if (res.success) {
      window.location.reload();
    } else {
      setSaveStatus("error");
      setStatusMessage(res.error || "Gagal mereset master templates");
      throw new Error(res.error || "Gagal mereset master templates");
    }
  };
  return (
    <div className="space-y-6">
      {/* Information Banner */}
      <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-xs text-foreground flex items-start gap-3">
        <HelpCircle className="w-4 h-4 text-[#007aff] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-foreground">
            Konfigurasi Blueprint Master Spreadsheet
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Perubahan kolom, nama kolom, baris default, dan isi teks di bawah ini akan tersimpan permanen di database Supabase dan secara otomatis menjadi cetak biru (blueprint) saat membuat <strong>Event Baru</strong>.
          </p>
        </div>
      </div>

      {/* Template Tab Navigation */}
      <div className="apple-card rounded-2xl border border-border p-2 bg-card">
        <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-border text-xs px-2">
          <div className="flex items-center gap-2 font-semibold text-muted-foreground">
            <FileSpreadsheet className="w-4 h-4 text-[#007aff]" />
            <span>Daftar Master Template ({templates.length})</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAddNewTemplate}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#007aff] hover:bg-[#0071eb] text-white font-medium text-xs cursor-pointer shadow-xs transition-colors disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Template</span>
            </button>
            <button
              type="button"
              onClick={handleResetAll}
              disabled={isPending}
              title="Kembalikan 10 preset asli"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted text-xs font-medium cursor-pointer transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span className="hidden sm:inline">Reset Preset</span>
            </button>
          </div>
        </div>

        {/* Scrollable Horizontal Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1 px-1">
          {templates.map((tpl) => {
            const isActive = tpl.id === activeTemplate?.id;
            return (
              <button
                key={tpl.id}
                type="button"
                onClick={() => handleSelectTemplate(tpl.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer shrink-0 ${
                  isActive
                    ? "bg-[#007aff] text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
                }`}
              >
                {tpl.sheet_name}
              </button>
            );
          })}
        </div>
      </div>
      {/* Active Template Editor Header & Sheet */}
      {activeTemplate && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl border border-border bg-card">
            <div className="flex items-center gap-3">
              <span className="text-xs uppercase tracking-wider font-bold text-muted-foreground">
                Mengedit Template:
              </span>
              <span className="text-sm font-bold text-foreground">
                {activeTemplate.sheet_name}
              </span>
              <button
                type="button"
                onClick={handleRenameTemplate}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                title="Ubah nama template"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-3">
              {saveStatus === "saving" && (
                <div className="flex items-center gap-1.5 text-xs text-amber-500 font-medium">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Menyimpan...</span>
                </div>
              )}
              {saveStatus === "saved" && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-500 font-medium animate-in fade-in">
                  <Check className="w-3.5 h-3.5" />
                  <span>Tersimpan</span>
                </div>
              )}
              {saveStatus === "error" && (
                <div className="flex items-center gap-1.5 text-xs text-rose-500 font-medium">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{statusMessage}</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleManualSave}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs cursor-pointer shadow-xs transition-colors disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Simpan Template</span>
              </button>

              <button
                type="button"
                onClick={handleDeleteTemplate}
                disabled={isPending || templates.length <= 1}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-rose-500/20 text-rose-500 hover:bg-rose-500/10 text-xs font-medium cursor-pointer transition-colors disabled:opacity-30"
                title="Hapus template ini"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Hapus</span>
              </button>
            </div>
          </div>

          {/* Grid Editor for Master Template — NO onChange prop, manual save only */}
          <DynamicSheetGrid
            ref={gridRef}
            key={`${activeTemplate.id}_${activeTemplate.sheet_name}_rev${gridRevision}`}
            sheetName={activeTemplate.sheet_name}
            data={activeTemplate.jsonb_structure}
          />
        </div>
      )}

      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="Konfirmasi Hapus Master Template"
        itemName={activeTemplate?.sheet_name}
        message={activeTemplate ? `Hapus master template "${activeTemplate.sheet_name}"? Template ini tidak akan disalin lagi ke event baru berikutnya.` : undefined}
        onConfirm={confirmDeleteTemplate}
        onClose={() => setShowDeleteConfirm(false)}
      />

      <ConfirmModal
        isOpen={showResetConfirm}
        title="Konfirmasi Reset Semua Master Template"
        message="Peringatan: Reset semua template master ke 10 preset awal bawaan sistem? Template custom akan ditimpa."
        confirmLabel="Reset Semua"
        onConfirm={confirmResetAll}
        onClose={() => setShowResetConfirm(false)}
      />
    </div>
  );
}


