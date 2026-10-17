"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import {
  ChevronDown,
  Plus,
  Check,
  Loader2,
  AlertCircle,
  RotateCcw,
  Trash2,
  Edit2,
  Save,
  RefreshCw,
  Grid3X3,
  GripVertical,
} from "lucide-react";
import dynamic from "next/dynamic";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import type { DynamicSheetGridHandle } from "./dynamic-sheet-grid";

const DynamicSheetGrid = dynamic(
  () => import("./dynamic-sheet-grid").then((m) => m.DynamicSheetGrid),
  { ssr: false }
);
import {
  saveEventSheet,
  deleteEventSheet,
  resetSheetToMaster,
  getEventSheets,
  reorderEventSheets,
} from "@/app/(dashboard)/events/sheet-actions";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { INITIAL_EVENT_SHEETS } from "@/lib/constants/event-sheets";
import { sanitizeSheetData } from "@/lib/spreadsheet-adapter";
import { EventFamilyDataSection } from "@/components/events/event-family-data-section";
import type { EventSheet, SheetData, EventPublicForm } from "@/types/database";

interface EventSpreadsheetTabsProps {
  eventId: string;
  initialSheets: EventSheet[];
  canManage?: boolean;
  onSheetsChange?: (sheets: EventSheet[]) => void;
  publicForm?: EventPublicForm | null;
}

export function EventSpreadsheetTabs({
  eventId,
  initialSheets,
  canManage = true,
  onSheetsChange,
  publicForm = null,
}: EventSpreadsheetTabsProps) {
  const [sheets, setSheets] = useState<EventSheet[]>(initialSheets);
  const [activeTabName, setActiveTabName] = useState<string>(
    initialSheets[0]?.sheet_name || "CHECKLIST"
  );
  const [openMenuSheet, setOpenMenuSheet] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "saving" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [deletingSheetName, setDeletingSheetName] = useState<string | null>(null);
  const [resettingSheetName, setResettingSheetName] = useState<string | null>(null);
  const [gridRevision, setGridRevision] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [showGridLines, setShowGridLines] = useState<boolean>(true);
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [, startTransition] = useTransition();

  const menuRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<DynamicSheetGridHandle | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    onSheetsChange?.(sheets);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("xeno_sheets_updated", { detail: sheets }));
    }
  }, [sheets, onSheetsChange]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuSheet(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeSheet = sheets.find((s) => s.sheet_name === activeTabName) || sheets[0];

  const handleTabClick = (nextSheetName: string) => {
    if (nextSheetName === activeTabName) return;
    // Commit any pending (unsaved) grid data into in-memory sheets before switching tabs
    if (activeSheet && gridRef.current) {
      const rawData = gridRef.current.getData();
      const pendingData = sanitizeSheetData(rawData);
      setSheets((prev) =>
        prev.map((s) =>
          s.sheet_name === activeSheet.sheet_name ? { ...s, data: pendingData } : s
        )
      );
    }
    setActiveTabName(nextSheetName);
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || !canManage) return;
    if (result.destination.index === result.source.index) return;

    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;

    const reordered = Array.from(sheets);
    const [moved] = reordered.splice(sourceIndex, 1);
    reordered.splice(destinationIndex, 0, moved);

    const updatedSheets = reordered.map((s, idx) => ({
      ...s,
      sort_order: idx,
      order_index: idx,
    }));

    // Update UI state immediately for a snappy feel
    setSheets(updatedSheets);
    setSaveStatus("saving");
    setStatusMessage("Menyimpan urutan tab...");

    // Dispatch Server Action to bulk-update sort_order in database
    startTransition(async () => {
      try {
        const orderedNames = updatedSheets.map((s) => s.sheet_name);
        const res = await reorderEventSheets(eventId, orderedNames);
        if (res.success) {
          setSaveStatus("saved");
          setStatusMessage("Urutan tab tersimpan");
          setTimeout(() => setSaveStatus("idle"), 2000);
        } else {
          setSaveStatus("error");
          setStatusMessage(res.error || "Gagal menyimpan urutan tab");
          setTimeout(() => setSaveStatus("idle"), 3000);
        }
      } catch (err: unknown) {
        console.error("[EventSpreadsheetTabs] Gagal reorder tabs:", err);
        setSaveStatus("error");
        setStatusMessage("Gagal menyimpan urutan tab");
        setTimeout(() => setSaveStatus("idle"), 3000);
      }
    });
  };

  // Manual save: reads the current spreadsheet state from the ref and persists it ONCE.
  // This is the ONLY path that triggers a network request for sheet data.
  const handleManualSave = () => {
    if (!activeSheet) return;
    const rawData = gridRef.current?.getData() || activeSheet.data;
    // Intercept data and sanitize newline characters & formatting for safe JSON payload serialization
    const currentData = sanitizeSheetData(rawData);

    setSaveStatus("saving");
    startTransition(async () => {
      try {
        const res = await saveEventSheet(
          eventId,
          activeSheet.sheet_name,
          currentData,
          activeSheet.order_index
        );
        if (res.success) {
          setSheets((prev) =>
            prev.map((s) =>
              s.sheet_name === activeSheet.sheet_name ? { ...s, data: currentData } : s
            )
          );
          setSaveStatus("saved");
          if (typeof window !== "undefined") {
            const merged = sheets.map((s) =>
              s.sheet_name === activeSheet.sheet_name ? { ...s, data: currentData } : s
            );
            window.dispatchEvent(new CustomEvent("xeno_sheets_updated", { detail: merged }));
          }
          setTimeout(() => setSaveStatus("idle"), 2500);
        } else {
          setSaveStatus("error");
          setStatusMessage(res.error || "Gagal menyimpan");
        }
      } catch {
        setSaveStatus("error");
        setStatusMessage("Gagal menghubungi server");
      }
    });
  };

  const handleAddNewSheet = () => {
    const name = prompt("Nama lembar kerja baru:")?.trim();
    if (!name || sheets.some((s) => s.sheet_name.toLowerCase() === name.toLowerCase())) return;

    const newSheet: EventSheet = {
      id: `sheet-${Date.now()}`,
      event_id: eventId,
      sheet_name: name,
      order_index: sheets.length,
      data: {
        columns: [
          { id: "col_1", name: "No" },
          { id: "col_2", name: "Item" },
          { id: "col_3", name: "Keterangan" },
          { id: "col_4", name: "Status" },
        ],
        rows: [{ id: `r_1`, col_1: "1", col_2: "", col_3: "", col_4: "" }],
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setSheets([...sheets, newSheet]);
    setActiveTabName(name);
    startTransition(async () => {
      await saveEventSheet(eventId, name, newSheet.data, newSheet.order_index);
    });
  };

  const handleRenameSheet = (oldName: string) => {
    const nextName = prompt("Ubah nama:", oldName)?.trim();
    if (!nextName || nextName === oldName) return;
    const target = sheets.find((s) => s.sheet_name === oldName);
    if (!target) return;

    setSheets(sheets.map((s) => (s.sheet_name === oldName ? { ...s, sheet_name: nextName } : s)));
    if (activeTabName === oldName) setActiveTabName(nextName);
    setOpenMenuSheet(null);

    startTransition(async () => {
      await deleteEventSheet(eventId, oldName);
      await saveEventSheet(eventId, nextName, target.data, target.order_index);
    });
  };

  const confirmDeleteSheet = async () => {
    if (!deletingSheetName || sheets.length <= 1) return;
    const sheetName = deletingSheetName;
    const next = sheets.filter((s) => s.sheet_name !== sheetName);
    setSheets(next);
    if (activeTabName === sheetName) setActiveTabName(next[0].sheet_name);
    await deleteEventSheet(eventId, sheetName);
  };

  const handleResetSheet = (sheetName: string) => {
    setOpenMenuSheet(null);
    setResettingSheetName(sheetName);
  };

  const confirmResetSheet = async () => {
    if (!resettingSheetName) return;
    const sheetName = resettingSheetName;
    setSaveStatus("saving");
    const res = await resetSheetToMaster(eventId, sheetName);
    if (res.success && res.data) {
      setSheets((prev) =>
        prev.map((s) => (s.sheet_name === sheetName ? { ...s, data: res.data! } : s))
      );
      setGridRevision((v) => v + 1);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2500);
    } else {
      // Fallback to static template
      const tpl = INITIAL_EVENT_SHEETS.find((t) => t.name.toLowerCase() === sheetName.toLowerCase());
      if (tpl) {
        setSheets((prev) =>
          prev.map((s) => (s.sheet_name === sheetName ? { ...s, data: tpl.data } : s))
        );
        setGridRevision((v) => v + 1);
        await saveEventSheet(eventId, sheetName, tpl.data);
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2500);
      } else {
        setSaveStatus("error");
        setStatusMessage(res.error || "Gagal mereset");
        throw new Error(res.error || "Gagal mereset");
      }
    }
  };

  const handleRefresh = () => {
    if (isRefreshing || saveStatus === "saving") return;
    setIsRefreshing(true);
    setStatusMessage("");

    startTransition(async () => {
      try {
        const freshSheets = await getEventSheets(eventId);
        if (freshSheets && freshSheets.length > 0) {
          setSheets(freshSheets);
          if (!freshSheets.some((s) => s.sheet_name === activeTabName)) {
            setActiveTabName(freshSheets[0].sheet_name);
          }
          // Increment gridRevision to trigger a clean re-mount of FortuneSheet
          setGridRevision((v) => v + 1);
          setSaveStatus("saved");
          setStatusMessage("Data berhasil disegarkan");
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("xeno_sheets_updated", { detail: freshSheets })
            );
          }
          setTimeout(() => setSaveStatus("idle"), 2000);
        }
      } catch (err: unknown) {
        console.error("[EventSpreadsheetTabs] Gagal menyegarkan data:", err);
        setSaveStatus("error");
        setStatusMessage("Gagal menyegarkan data");
        setTimeout(() => setSaveStatus("idle"), 3000);
      } finally {
        setIsRefreshing(false);
      }
    });
  };

  const handleToggleGridlines = () => {
    // Preserve any in-memory pending edits before re-mounting
    if (activeSheet && gridRef.current) {
      const rawData = gridRef.current.getData();
      const pendingData = sanitizeSheetData(rawData);
      setSheets((prev) =>
        prev.map((s) =>
          s.sheet_name === activeSheet.sheet_name ? { ...s, data: pendingData } : s
        )
      );
    }
    setShowGridLines((prev) => !prev);
    // Increment gridRevision to re-mount the grid with the new gridlines setting
    setGridRevision((v) => v + 1);
  };

  return (
    <div className="space-y-4">
      {/* Tab Bar with pinned controls */}
      <div className="flex items-center justify-between border-y border-border bg-muted/40 dark:bg-zinc-900/40">
        {/* Horizontally scrollable Sheet Tabs */}
        {!isMounted ? (
          <div className="flex items-center overflow-x-auto scrollbar-none py-1 px-1 min-w-0 flex-1">
            {sheets.map((sheet) => {
              const isActive = sheet.sheet_name === activeTabName;
              return (
                <div key={sheet.id || sheet.sheet_name} className="relative flex items-center shrink-0">
                  <div
                    className={`flex items-center gap-1.5 px-3.5 py-2 text-xs transition-colors rounded-lg cursor-pointer ${
                      isActive
                        ? "bg-card text-[#007aff] font-bold shadow-xs border border-border/80"
                        : "text-zinc-700 dark:text-zinc-300 font-medium hover:bg-black/5 dark:hover:bg-white/5"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleTabClick(sheet.sheet_name)}
                      className="cursor-pointer tracking-tight whitespace-nowrap text-left"
                    >
                      {sheet.sheet_name}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="event-sheets-tabs" direction="horizontal">
              {(droppableProvided) => (
                <div
                  ref={droppableProvided.innerRef}
                  {...droppableProvided.droppableProps}
                  className="flex items-center overflow-x-auto scrollbar-none py-1 px-1 min-w-0 flex-1"
                >
                  {sheets.map((sheet, index) => {
                    const isActive = sheet.sheet_name === activeTabName;
                    const isMenuOpen = openMenuSheet === sheet.sheet_name;

                    return (
                      <Draggable
                        key={sheet.sheet_name}
                        draggableId={sheet.sheet_name}
                        index={index}
                        isDragDisabled={!canManage}
                      >
                        {(draggableProvided, snapshot) => (
                          <div
                            ref={draggableProvided.innerRef}
                            {...draggableProvided.draggableProps}
                            className={`relative flex items-center shrink-0 mr-1 select-none transition-shadow ${
                              snapshot.isDragging
                                ? "opacity-90 z-50 shadow-lg ring-2 ring-[#007aff]/50 rounded-lg bg-card"
                                : ""
                            }`}
                            style={draggableProvided.draggableProps.style}
                          >
                            <div
                              className={`flex items-center gap-1 px-2.5 py-1.5 text-xs transition-colors rounded-lg cursor-pointer ${
                                isActive
                                  ? "bg-card text-[#007aff] font-bold shadow-xs border border-border/80"
                                  : "text-zinc-700 dark:text-zinc-300 font-medium hover:bg-black/5 dark:hover:bg-white/5 border border-transparent"
                              }`}
                            >
                              {canManage && (
                                <span
                                  {...draggableProvided.dragHandleProps}
                                  className="cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-foreground p-0.5 rounded transition-colors -ml-1"
                                  title="Geser untuk mengatur urutan lembar kerja"
                                >
                                  <GripVertical className="w-3.5 h-3.5" />
                                </span>
                              )}

                              <button
                                type="button"
                                onClick={() => handleTabClick(sheet.sheet_name)}
                                className="cursor-pointer tracking-tight whitespace-nowrap text-left px-1 py-0.5"
                              >
                                {sheet.sheet_name}
                              </button>

                              {canManage && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenMenuSheet(isMenuOpen ? null : sheet.sheet_name);
                                  }}
                                  className={`p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer ${
                                    isActive ? "text-[#007aff]" : "text-muted-foreground"
                                  }`}
                                  title="Opsi Lembar Kerja"
                                >
                                  <ChevronDown className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>

                            {/* Dropdown Menu for Tab */}
                            {isMenuOpen && (
                              <div
                                ref={menuRef}
                                className="absolute top-full left-0 mt-1 z-30 w-44 rounded-xl bg-card border border-border shadow-lg p-1 text-xs"
                              >
                                <button
                                  type="button"
                                  onClick={() => handleRenameSheet(sheet.sheet_name)}
                                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-foreground hover:bg-muted text-left"
                                >
                                  <Edit2 className="w-3 h-3 text-[#007aff]" />
                                  <span>Ubah Nama Sheet</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleResetSheet(sheet.sheet_name)}
                                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-foreground hover:bg-muted text-left"
                                >
                                  <RotateCcw className="w-3 h-3 text-amber-500" />
                                  <span>Reset ke Bawaan</span>
                                </button>
                                {sheets.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenMenuSheet(null);
                                      setDeletingSheetName(sheet.sheet_name);
                                    }}
                                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-rose-600 hover:bg-rose-500/10 text-left cursor-pointer"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                    <span>Hapus Sheet</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                  {droppableProvided.placeholder}

                  {canManage && (
                    <button
                      type="button"
                      onClick={handleAddNewSheet}
                      className="shrink-0 ml-1 p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors"
                      title="Tambah Lembar Kerja Baru"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}

        {/* Pinned Action Controls: Gridlines, Refresh, Save & Status */}
        <div className="flex items-center gap-2 shrink-0 px-3 py-1 border-l border-border/80 bg-background/50">
          {/* 1. Show/Hide Gridlines Toggle */}
          <button
            type="button"
            onClick={handleToggleGridlines}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer border ${
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
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-card hover:bg-muted text-foreground text-[11px] font-semibold border border-border transition-all cursor-pointer active:scale-[0.97] disabled:opacity-60 disabled:cursor-not-allowed shadow-2xs"
            title="Segarkan data lembar kerja dari database"
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

          {/* 3. Pinned Manual Save Button */}
          {canManage && (
            <button
              type="button"
              onClick={handleManualSave}
              disabled={saveStatus === "saving" || isRefreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#007aff] hover:bg-[#0066d6] text-white text-[11px] font-semibold transition-all cursor-pointer active:scale-[0.97] disabled:opacity-60 disabled:cursor-not-allowed shadow-xs"
            >
              {saveStatus === "saving" ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Save className="w-3 h-3" />
              )}
              <span>{saveStatus === "saving" ? "Menyimpan..." : "Simpan Perubahan"}</span>
            </button>
          )}
          {saveStatus === "saved" && (
            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              <Check className="w-3 h-3" />
              <span>{statusMessage || "Tersimpan"}</span>
            </span>
          )}
          {saveStatus === "error" && (
            <span className="inline-flex items-center gap-1 text-[11px] text-rose-500 font-medium" title={statusMessage}>
              <AlertCircle className="w-3 h-3" />
              <span>Gagal simpan</span>
            </span>
          )}
        </div>
      </div>

      {/* Dynamic Spreadsheet Data Grid — NO onChange prop, manual save only */}
      {activeSheet && (
        <DynamicSheetGrid
          ref={gridRef}
          key={`${activeSheet.sheet_name}_rev${gridRevision}_grid${showGridLines ? 1 : 0}`}
          sheetName={activeSheet.sheet_name}
          data={activeSheet.data}
          readOnly={!canManage}
          showGridLines={showGridLines}
        />
      )}

      {/* Append Family Data directly below the FortuneSheet container */}
      <div className="pt-6 border-t border-border mt-8">
        <EventFamilyDataSection
          eventId={eventId}
          initialForm={publicForm}
          canManage={canManage}
          variant="embedded"
        />
      </div>

      <ConfirmModal
        isOpen={!!deletingSheetName}
        title="Konfirmasi Hapus Lembar Kerja"
        itemName={deletingSheetName || undefined}
        onConfirm={confirmDeleteSheet}
        onClose={() => setDeletingSheetName(null)}
      />

      <ConfirmModal
        isOpen={!!resettingSheetName}
        title="Konfirmasi Reset Lembar Kerja"
        itemName={resettingSheetName || undefined}
        message={resettingSheetName ? `Apakah Anda yakin ingin mereset data "${resettingSheetName}" ke format master template? Data kustom akan ditimpa.` : undefined}
        confirmLabel="Reset"
        onConfirm={confirmResetSheet}
        onClose={() => setResettingSheetName(null)}
      />
    </div>
  );
}
