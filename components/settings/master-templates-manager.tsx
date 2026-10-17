"use client";

import { useState, useEffect, useRef, useTransition, useMemo } from "react";
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
  RefreshCw,
  Grid3X3,
  GripVertical,
} from "lucide-react";
import dynamic from "next/dynamic";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import type { DynamicSheetGridHandle } from "@/components/events/spreadsheet/dynamic-sheet-grid";

const DynamicSheetGrid = dynamic(
  () =>
    import("@/components/events/spreadsheet/dynamic-sheet-grid").then(
      (m) => m.DynamicSheetGrid
    ),
  { ssr: false }
);
import {
  saveMasterTemplate,
  createMasterTemplate,
  deleteMasterTemplate,
  resetAllMasterTemplates,
  getMasterTemplates,
  reorderMasterTemplates,
} from "@/app/(dashboard)/settings/templates/actions";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { sanitizeSheetData } from "@/lib/spreadsheet-adapter";
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
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [showGridLines, setShowGridLines] = useState<boolean>(true);
  const [isMounted, setIsMounted] = useState<boolean>(false);

  const gridRef = useRef<DynamicSheetGridHandle | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const activeTemplate = useMemo(
    () => templates.find((t) => t.id === activeTemplateId) || templates[0],
    [templates, activeTemplateId]
  );

  const handleSelectTemplate = (nextId: string) => {
    if (nextId === activeTemplateId) return;
    // Commit any pending (unsaved) grid data into in-memory templates before switching tabs
    if (activeTemplate && gridRef.current) {
      const pendingData = sanitizeSheetData(gridRef.current.getData());
      setTemplates((prev) =>
        prev.map((t) => (t.id === activeTemplate.id ? { ...t, jsonb_structure: pendingData } : t))
      );
    }
    setActiveTemplateId(nextId);
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    if (result.destination.index === result.source.index) return;

    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;

    const reordered = Array.from(templates);
    const [moved] = reordered.splice(sourceIndex, 1);
    reordered.splice(destinationIndex, 0, moved);

    const updatedTemplates = reordered.map((t, idx) => ({
      ...t,
      sort_order: idx,
      order_index: idx,
    }));

    // Update UI state immediately for snappy feel
    setTemplates(updatedTemplates);
    setSaveStatus("saving");
    setStatusMessage("Menyimpan urutan template...");

    // Dispatch Server Action to bulk-update sort_order in database
    startTransition(async () => {
      try {
        const orderedNames = updatedTemplates.map((t) => t.sheet_name);
        const res = await reorderMasterTemplates(orderedNames);
        if (res.success) {
          setSaveStatus("saved");
          setStatusMessage("Urutan template tersimpan");
          setTimeout(() => setSaveStatus("idle"), 2000);
        } else {
          setSaveStatus("error");
          setStatusMessage(res.error || "Gagal menyimpan urutan template");
          setTimeout(() => setSaveStatus("idle"), 3000);
        }
      } catch (err: unknown) {
        console.error("[MasterTemplatesManager] Gagal menyimpan urutan template:", err);
        setSaveStatus("error");
        setStatusMessage("Gagal menyimpan urutan template");
        setTimeout(() => setSaveStatus("idle"), 3000);
      }
    });
  };

  const handleRefresh = () => {
    if (isRefreshing || saveStatus === "saving") return;
    setIsRefreshing(true);
    setStatusMessage("");

    startTransition(async () => {
      try {
        const freshTemplates = await getMasterTemplates();
        if (freshTemplates && freshTemplates.length > 0) {
          setTemplates(freshTemplates);
          if (!freshTemplates.some((t) => t.id === activeTemplateId)) {
            setActiveTemplateId(freshTemplates[0].id);
          }
          // Increment gridRevision to trigger a clean re-mount of FortuneSheet
          setGridRevision((v) => v + 1);
          setSaveStatus("saved");
          setStatusMessage("Template berhasil disegarkan");
          setTimeout(() => setSaveStatus("idle"), 2000);
        }
      } catch (err: unknown) {
        console.error("[MasterTemplatesManager] Gagal menyegarkan data:", err);
        setSaveStatus("error");
        setStatusMessage("Gagal menyegarkan template");
        setTimeout(() => setSaveStatus("idle"), 3000);
      } finally {
        setIsRefreshing(false);
      }
    });
  };

  const handleToggleGridlines = () => {
    // Preserve any in-memory pending edits before re-mounting
    if (activeTemplate && gridRef.current) {
      const rawData = gridRef.current.getData();
      const pendingData = sanitizeSheetData(rawData);
      setTemplates((prev) =>
        prev.map((t) =>
          t.id === activeTemplate.id ? { ...t, jsonb_structure: pendingData } : t
        )
      );
    }
    setShowGridLines((prev) => !prev);
    // Increment gridRevision to re-mount the grid with the new gridlines setting
    setGridRevision((v) => v + 1);
  };

  // Manual save: reads the current spreadsheet state from the ref and persists it ONCE.
  // This is the ONLY path that triggers a network request for template data.
  const handleManualSave = () => {
    if (!activeTemplate) return;
    const rawData = gridRef.current?.getData() || activeTemplate.jsonb_structure;
    const currentData = sanitizeSheetData(rawData);

    setSaveStatus("saving");
    startTransition(async () => {
      const res = await saveMasterTemplate(
        activeTemplate.id,
        activeTemplate.sheet_name,
        currentData,
        activeTemplate.sort_order ?? activeTemplate.order_index
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
        {!isMounted ? (
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
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="master-templates-tabs" direction="horizontal">
              {(droppableProvided) => (
                <div
                  ref={droppableProvided.innerRef}
                  {...droppableProvided.droppableProps}
                  className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1 px-1 min-w-0"
                >
                  {templates.map((tpl, index) => {
                    const isActive = tpl.id === activeTemplate?.id;
                    return (
                      <Draggable
                        key={tpl.id || tpl.sheet_name}
                        draggableId={tpl.id || tpl.sheet_name}
                        index={index}
                      >
                        {(draggableProvided, snapshot) => (
                          <div
                            ref={draggableProvided.innerRef}
                            {...draggableProvided.draggableProps}
                            className={`flex items-center rounded-lg select-none shrink-0 transition-all ${
                              isActive
                                ? "bg-[#007aff] text-white shadow-xs"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted/70 bg-muted/40"
                            } ${
                              snapshot.isDragging
                                ? "opacity-90 z-50 shadow-lg ring-2 ring-[#007aff]/50"
                                : ""
                            }`}
                            style={draggableProvided.draggableProps.style}
                          >
                            <span
                              {...draggableProvided.dragHandleProps}
                              className={`cursor-grab active:cursor-grabbing pl-2 pr-0.5 py-1.5 ${
                                isActive
                                  ? "text-white/70 hover:text-white"
                                  : "text-muted-foreground/60 hover:text-foreground"
                              }`}
                              title="Geser untuk mengatur urutan master template"
                            >
                              <GripVertical className="w-3.5 h-3.5" />
                            </span>
                            <button
                              type="button"
                              onClick={() => handleSelectTemplate(tpl.id)}
                              className={`pl-1 pr-3 py-1.5 text-xs font-semibold whitespace-nowrap cursor-pointer ${
                                isActive ? "text-white" : ""
                              }`}
                            >
                              {tpl.sheet_name}
                            </button>
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                  {droppableProvided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
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

            <div className="flex items-center gap-2">
              {saveStatus === "saving" && (
                <div className="flex items-center gap-1.5 text-xs text-amber-500 font-medium">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Menyimpan...</span>
                </div>
              )}
              {saveStatus === "saved" && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-500 font-medium animate-in fade-in">
                  <Check className="w-3.5 h-3.5" />
                  <span>{statusMessage || "Tersimpan"}</span>
                </div>
              )}
              {saveStatus === "error" && (
                <div className="flex items-center gap-1.5 text-xs text-rose-500 font-medium">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{statusMessage}</span>
                </div>
              )}

              {/* 1. Show/Hide Gridlines Toggle */}
              <button
                type="button"
                onClick={handleToggleGridlines}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                  showGridLines
                    ? "bg-[#007aff]/10 text-[#007aff] border-[#007aff]/30 hover:bg-[#007aff]/20"
                    : "bg-muted text-muted-foreground border-border hover:text-foreground hover:bg-muted/80"
                }`}
                title={showGridLines ? "Sembunyikan Garis Grid" : "Tampilkan Garis Grid"}
              >
                <Grid3X3 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">
                  {showGridLines ? "Garis Grid: On" : "Garis Grid: Off"}
                </span>
              </button>

              {/* 2. Dedicated Refresh Button */}
              <button
                type="button"
                onClick={handleRefresh}
                disabled={isRefreshing || saveStatus === "saving"}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-card hover:bg-muted text-foreground text-xs font-semibold border border-border transition-all cursor-pointer active:scale-[0.97] disabled:opacity-60 disabled:cursor-not-allowed shadow-2xs"
                title="Segarkan data template master dari database"
              >
                {isRefreshing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#007aff]" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5 text-[#007aff]" />
                )}
                <span className="hidden sm:inline">
                  {isRefreshing ? "Menyegarkan..." : "Segarkan"}
                </span>
              </button>

              <button
                type="button"
                onClick={handleManualSave}
                disabled={isPending || isRefreshing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs cursor-pointer shadow-xs transition-colors disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Simpan Template</span>
              </button>

              <button
                type="button"
                onClick={handleDeleteTemplate}
                disabled={isPending || templates.length <= 1 || isRefreshing}
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
            key={`${activeTemplate.id}_${activeTemplate.sheet_name}_rev${gridRevision}_grid${showGridLines ? 1 : 0}`}
            sheetName={activeTemplate.sheet_name}
            data={activeTemplate.jsonb_structure}
            showGridLines={showGridLines}
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


