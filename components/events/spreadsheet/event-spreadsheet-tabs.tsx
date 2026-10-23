"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
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
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Pencil,
  Copy,
  X,
} from "lucide-react";
import dynamic from "next/dynamic";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import type { DynamicSheetGridHandle } from "./dynamic-sheet-grid";
import {
  triggerFortuneSheetNativeZoom,
  setFortuneSheetZoomLevel,
  ZOOM_PRESETS,
} from "@/lib/spreadsheet-zoom";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

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
  canManageFamily?: boolean;
  canManageSheets?: boolean;
  onSheetsChange?: (sheets: EventSheet[]) => void;
  publicForm?: EventPublicForm | null;
}

export function EventSpreadsheetTabs({
  eventId,
  initialSheets,
  canManage = true,
  canManageFamily,
  canManageSheets,
  onSheetsChange,
  publicForm = null,
}: EventSpreadsheetTabsProps) {
  const router = useRouter();
  const isSheetsManageable = canManageSheets ?? canManage;

  const [sheets, setSheets] = useState<EventSheet[]>(initialSheets);
  const [activeTabName, setActiveTabName] = useState<string>(
    initialSheets[0]?.sheet_name || "CHECKLIST"
  );
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "saving" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [deletingSheet, setDeletingSheet] = useState<EventSheet | null>(null);
  const [resettingSheetName, setResettingSheetName] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [gridRevision, setGridRevision] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [showGridLines, setShowGridLines] = useState<boolean>(true);
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [zoomRatio, setZoomRatio] = useState<number>(1.0);
  const [isZoomMenuOpen, setIsZoomMenuOpen] = useState<boolean>(false);
  const [, startTransition] = useTransition();

  const zoomMenuRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<DynamicSheetGridHandle | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Sync sheets order and tabs when initialSheets prop updates from server revalidation
  useEffect(() => {
    if (initialSheets && initialSheets.length > 0) {
      setSheets((prev) => {
        return initialSheets.map((is) => {
          const current = prev.find((p) => p.sheet_name === is.sheet_name);
          return current ? { ...is, data: current.data } : is;
        });
      });
    }
  }, [initialSheets]);

  // Handle Escape key to exit fullscreen & lock body scroll
  useEffect(() => {
    if (!isFullscreen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsFullscreen(false);
      }
    };
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isFullscreen]);

  // Click outside to close zoom presets dropdown
  useEffect(() => {
    if (!isZoomMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (zoomMenuRef.current && !zoomMenuRef.current.contains(e.target as Node)) {
        setIsZoomMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isZoomMenuOpen]);

  const handleZoomIn = () => {
    setZoomRatio((prev) => Math.min(2.0, parseFloat((prev + 0.1).toFixed(1))));
    triggerFortuneSheetNativeZoom("+");
  };

  const handleZoomOut = () => {
    setZoomRatio((prev) => Math.max(0.5, parseFloat((prev - 0.1).toFixed(1))));
    triggerFortuneSheetNativeZoom("-");
  };

  const handleSelectZoomPreset = async (target: number) => {
    setIsZoomMenuOpen(false);
    const current = zoomRatio;
    setZoomRatio(target);
    await setFortuneSheetZoomLevel(current, target);
  };

  useEffect(() => {
    onSheetsChange?.(sheets);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("xeno_sheets_updated", { detail: sheets }));
    }
  }, [sheets, onSheetsChange]);

  const activeSheet = sheets.find((s) => s.sheet_name === activeTabName) || sheets[0];

  const handleTabClick = (nextSheetName: string) => {
    if (nextSheetName === activeTabName) return;
    setStatusMessage("");
    setSaveStatus("idle");
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
          setTimeout(() => {
            setSaveStatus("idle");
            setStatusMessage("");
          }, 2000);
        } else {
          setSaveStatus("error");
          setStatusMessage(res.error || "Gagal menyimpan urutan tab");
          setTimeout(() => {
            setSaveStatus("idle");
            setStatusMessage("");
          }, 3000);
        }
      } catch (err: unknown) {
        console.error("[EventSpreadsheetTabs] Gagal reorder tabs:", err);
        setSaveStatus("error");
        setStatusMessage("Gagal menyimpan urutan tab");
        setTimeout(() => {
          setSaveStatus("idle");
          setStatusMessage("");
        }, 3000);
      }
    });
  };

  // Manual save: reads the current spreadsheet state from the ref and persists it ONCE.
  // This is the ONLY path that triggers a network request for sheet data.
  const handleManualSave = async () => {
    if (!activeSheet) return;

    // 1. Force blur active cell input to trigger FortuneSheet internal blur/change commit
    if (typeof window !== "undefined" && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    // Invoke explicit exitEditMode if exposed on ref
    gridRef.current?.exitEditMode?.();

    // 2. Allow event loop / React state to flush internal cell value
    await new Promise((resolve) => setTimeout(resolve, 50));

    setStatusMessage("");
    setSaveStatus("saving");

    // 3. Now safely retrieve the latest committed sheet data
    const rawData = gridRef.current?.getData() || activeSheet.data;
    // Intercept data and sanitize newline characters & formatting for safe JSON payload serialization
    const currentData = sanitizeSheetData(rawData);

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
          setStatusMessage("Perubahan berhasil disimpan");
          setToast("Lembar kerja berhasil disimpan.");
          if (typeof window !== "undefined") {
            const merged = sheets.map((s) =>
              s.sheet_name === activeSheet.sheet_name ? { ...s, data: currentData } : s
            );
            window.dispatchEvent(new CustomEvent("xeno_sheets_updated", { detail: merged }));
          }
          setTimeout(() => {
            setSaveStatus("idle");
            setStatusMessage("");
          }, 2500);
        } else {
          setSaveStatus("error");
          setStatusMessage(res.error || "Gagal menyimpan");
          setTimeout(() => {
            setSaveStatus("idle");
            setStatusMessage("");
          }, 3500);
        }
      } catch {
        setSaveStatus("error");
        setStatusMessage("Gagal menghubungi server");
        setTimeout(() => {
          setSaveStatus("idle");
          setStatusMessage("");
        }, 3500);
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

  const handleRenameSheet = (sheetOrName: EventSheet | string) => {
    const sheet = typeof sheetOrName === "string" ? sheets.find((s) => s.sheet_name === sheetOrName) : sheetOrName;
    if (!sheet) return;
    const oldName = sheet.sheet_name;
    const nextName = prompt("Ubah nama lembar kerja:", oldName)?.trim();
    if (!nextName || nextName === oldName) return;

    if (sheets.some((s) => s.sheet_name.toLowerCase() === nextName.toLowerCase())) {
      alert(`Lembar kerja "${nextName}" sudah ada. Silakan gunakan nama lain.`);
      return;
    }

    const nextSheets = sheets.map((s) => (s.sheet_name === oldName ? { ...s, sheet_name: nextName } : s));
    setSheets(nextSheets);
    if (activeTabName === oldName) setActiveTabName(nextName);
    onSheetsChange?.(nextSheets);

    startTransition(async () => {
      await deleteEventSheet(eventId, oldName);
      await saveEventSheet(eventId, nextName, sheet.data, sheet.order_index);
      setToast("Nama sheet berhasil diubah.");
      router.refresh();
    });
  };

  const handleDuplicateSheet = (sheetOrName: EventSheet | string) => {
    const sheet = typeof sheetOrName === "string" ? sheets.find((s) => s.sheet_name === sheetOrName) : sheetOrName;
    if (!sheet) return;

    const baseName = `${sheet.sheet_name} (Salinan)`;
    let copyName = baseName;
    let counter = 1;
    while (sheets.some((s) => s.sheet_name.toLowerCase() === copyName.toLowerCase())) {
      counter++;
      copyName = `${sheet.sheet_name} (Salinan ${counter})`;
    }

    const nextOrder = sheets.length;
    const duplicatedSheet: EventSheet = {
      id: `sheet-${Date.now()}`,
      event_id: eventId,
      sheet_name: copyName,
      order_index: nextOrder,
      sort_order: nextOrder,
      data: JSON.parse(JSON.stringify(sheet.data)),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const nextSheets = [...sheets, duplicatedSheet];
    setSheets(nextSheets);
    setActiveTabName(copyName);
    onSheetsChange?.(nextSheets);

    startTransition(async () => {
      const res = await saveEventSheet(eventId, copyName, duplicatedSheet.data, nextOrder);
      if (res.success) {
        setToast(`Sheet "${copyName}" berhasil diduplikasi.`);
        router.refresh();
      }
    });
  };

  const openDeleteConfirm = (sheetOrName: EventSheet | string) => {
    if (sheets.length <= 1) {
      alert("Event minimal harus memiliki satu lembar kerja.");
      return;
    }
    const sheet = typeof sheetOrName === "string" ? sheets.find((s) => s.sheet_name === sheetOrName) : sheetOrName;
    if (!sheet) return;
    setDeletingSheet(sheet);
  };

  const confirmDeleteSheet = async () => {
    if (!deletingSheet || sheets.length <= 1) return;
    const target = deletingSheet;
    const next = sheets.filter((s) => (target.id ? s.id !== target.id : s.sheet_name !== target.sheet_name));
    setSheets(next);
    if (activeTabName === target.sheet_name) {
      setActiveTabName(next[0]?.sheet_name || "");
    }
    onSheetsChange?.(next);
    setDeletingSheet(null);

    try {
      const isUuid = target.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(target.id);
      const res = isUuid
        ? await deleteEventSheet(target.id)
        : await deleteEventSheet(eventId, target.sheet_name);
      if (res.success) {
        setToast("Sheet berhasil dihapus.");
        router.refresh();
      } else {
        alert(res.error || "Gagal menghapus lembar kerja.");
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Gagal menghapus lembar kerja.");
    }
  };

  const handleResetSheet = (sheetName: string) => {
    // Check if the sheet is a duplicated or custom sheet without a linked master template
    const isLinked = INITIAL_EVENT_SHEETS.some(
      (t) => t.name.toLowerCase() === sheetName.toLowerCase()
    );
    const isDuplicateOrCustom =
      sheetName.toLowerCase().includes("(salinan") ||
      sheetName.toLowerCase().includes("(copy") ||
      !isLinked;

    if (isDuplicateOrCustom) {
      setToast("Sheet ini tidak terhubung dengan master template.");
      return;
    }

    setStatusMessage("");
    setResettingSheetName(sheetName);
  };

  const confirmResetSheet = async () => {
    if (!resettingSheetName) return;
    const sheetName = resettingSheetName;
    setResettingSheetName(null);
    setStatusMessage("");
    setSaveStatus("saving");

    try {
      const res = await resetSheetToMaster(eventId, sheetName);
      if (res.success && res.data) {
        setSheets((prev) =>
          prev.map((s) => (s.sheet_name === sheetName ? { ...s, data: res.data! } : s))
        );
        setGridRevision((v) => v + 1);
        setSaveStatus("saved");
        setStatusMessage("Lembar kerja berhasil direset");
        setToast("Lembar kerja berhasil direset ke template.");
        setTimeout(() => {
          setSaveStatus("idle");
          setStatusMessage("");
        }, 2500);
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
          setStatusMessage("Lembar kerja berhasil direset");
          setToast("Lembar kerja berhasil direset.");
          setTimeout(() => {
            setSaveStatus("idle");
            setStatusMessage("");
          }, 2500);
        } else {
          setSaveStatus("idle");
          setStatusMessage("");
          setToast(res.error || "Sheet ini tidak terhubung dengan master template.");
        }
      }
    } catch {
      setSaveStatus("idle");
      setStatusMessage("");
      setToast("Sheet ini tidak terhubung dengan master template.");
    }
  };

  const handleRefresh = () => {
    if (isRefreshing || saveStatus === "saving") return;
    setIsRefreshing(true);
    setStatusMessage("");
    setSaveStatus("idle");

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
          setToast("Data lembar kerja berhasil disegarkan.");
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("xeno_sheets_updated", { detail: freshSheets })
            );
          }
          setTimeout(() => {
            setSaveStatus("idle");
            setStatusMessage("");
          }, 2000);
        }
      } catch (err: unknown) {
        console.error("[EventSpreadsheetTabs] Gagal menyegarkan data:", err);
        setSaveStatus("error");
        setStatusMessage("Gagal menyegarkan data");
        setTimeout(() => {
          setSaveStatus("idle");
          setStatusMessage("");
        }, 3000);
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
    <div
      className={
        isFullscreen
          ? "fixed inset-0 z-[100] bg-background w-full h-screen p-4 flex flex-col gap-3 overflow-hidden"
          : "space-y-4"
      }
    >
      {/* Tab Bar with pinned controls */}
      <div className="flex items-center justify-between border-y border-border bg-muted/40 dark:bg-zinc-900/40 shrink-0">
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

                              {isSheetsManageable && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button
                                      type="button"
                                      onClick={(e) => e.stopPropagation()}
                                      className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition cursor-pointer"
                                      title="Opsi Lembar Kerja"
                                    >
                                      <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="start" className="z-50 w-48 shadow-lg">
                                    <DropdownMenuItem onClick={() => handleRenameSheet(sheet)}>
                                      <Pencil className="w-4 h-4 mr-2" /> Ganti Nama
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleDuplicateSheet(sheet)}>
                                      <Copy className="w-4 h-4 mr-2" /> Duplikat Sheet
                                    </DropdownMenuItem>
                                    {INITIAL_EVENT_SHEETS.some((t) => t.name.toLowerCase() === sheet.sheet_name.toLowerCase()) &&
                                    !sheet.sheet_name.toLowerCase().includes("(salinan") &&
                                    !sheet.sheet_name.toLowerCase().includes("(copy") ? (
                                      <DropdownMenuItem onClick={() => handleResetSheet(sheet.sheet_name)}>
                                        <RotateCcw className="w-4 h-4 mr-2 text-amber-500" /> Reset ke Master
                                      </DropdownMenuItem>
                                    ) : (
                                      <DropdownMenuItem
                                        onClick={() => handleResetSheet(sheet.sheet_name)}
                                        className="opacity-60 cursor-pointer"
                                        title="Sheet ini tidak terhubung dengan master template"
                                      >
                                        <RotateCcw className="w-4 h-4 mr-2 text-slate-400" /> Reset ke Master
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => openDeleteConfirm(sheet)}
                                      disabled={sheets.length <= 1}
                                      className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/30 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      <Trash2 className="w-4 h-4 mr-2" /> Hapus Sheet
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </div>
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

        {/* Pinned Action Controls: Gridlines, Zoom, Fullscreen, Refresh, Save & Status */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 px-3 py-1 border-l border-border/80 bg-background/50">
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

          {/* 2. Zoom Controls: Zoom Out, Percentage Dropdown, Zoom In */}
          <div className="relative flex items-center bg-card border border-border rounded-lg shadow-2xs" ref={zoomMenuRef}>
            <button
              type="button"
              onClick={handleZoomOut}
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-l-lg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              title="Perkecil (Zoom Out)"
              disabled={zoomRatio <= 0.5}
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setIsZoomMenuOpen((v) => !v)}
              className="px-2 py-1 text-[11px] font-semibold text-foreground hover:bg-muted/80 transition-colors flex items-center gap-1 cursor-pointer border-x border-border/60"
              title="Pilih tingkat zoom"
            >
              <span>{Math.round(zoomRatio * 100)}%</span>
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            </button>

            <button
              type="button"
              onClick={handleZoomIn}
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-r-lg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              title="Perbesar (Zoom In)"
              disabled={zoomRatio >= 2.0}
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>

            {/* Zoom Presets Menu */}
            {isZoomMenuOpen && (
              <div className="absolute top-full mt-1.5 left-1/2 -translate-x-1/2 z-[110] w-28 bg-card border border-border rounded-xl shadow-lg py-1 text-xs">
                {ZOOM_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => handleSelectZoomPreset(preset.value)}
                    className={`w-full text-left px-3 py-1.5 text-[11px] font-medium transition-colors hover:bg-muted cursor-pointer flex items-center justify-between ${
                      Math.abs(zoomRatio - preset.value) < 0.01
                        ? "text-[#007aff] font-bold bg-[#007aff]/5"
                        : "text-foreground"
                    }`}
                  >
                    <span>{preset.label}</span>
                    {Math.abs(zoomRatio - preset.value) < 0.01 && (
                      <Check className="w-3 h-3 text-[#007aff]" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 3. Fullscreen Toggle Button */}
          <button
            type="button"
            onClick={() => setIsFullscreen((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer border shadow-2xs ${
              isFullscreen
                ? "bg-[#007aff]/10 text-[#007aff] border-[#007aff]/30 hover:bg-[#007aff]/20"
                : "bg-card hover:bg-muted text-foreground border-border hover:border-border/80"
            }`}
            title={isFullscreen ? "Keluar dari Layar Penuh (Esc)" : "Mode Layar Penuh (Fullscreen)"}
          >
            {isFullscreen ? (
              <Minimize2 className="w-3.5 h-3.5 text-[#007aff]" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
            <span className="hidden md:inline">
              {isFullscreen ? "Layar Normal" : "Layar Penuh"}
            </span>
          </button>

          {/* 4. Dedicated Refresh Button */}
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

          {/* 5. Pinned Manual Save Button */}
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
              <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              <span>{statusMessage || "Perubahan berhasil disimpan"}</span>
            </span>
          )}
          {saveStatus === "error" && (
            <span className="inline-flex items-center gap-1 text-[11px] text-rose-500 font-medium" title={statusMessage}>
              <AlertCircle className="w-3 h-3 text-rose-500" />
              <span>{statusMessage || "Gagal menyimpan"}</span>
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
          isFullscreen={isFullscreen}
          zoomRatio={zoomRatio}
        />
      )}

      {/* Append Family Data directly below the FortuneSheet container (only in normal mode) */}
      {!isFullscreen && (
        <div className="pt-6 border-t border-border mt-8">
          <EventFamilyDataSection
            eventId={eventId}
            initialForm={publicForm}
            canManage={canManageFamily ?? canManage}
            variant="embedded"
          />
        </div>
      )}

      <ConfirmModal
        isOpen={Boolean(deletingSheet)}
        title="Konfirmasi Hapus Lembar Kerja"
        itemName={deletingSheet?.sheet_name}
        message="Apakah Anda yakin ingin menghapus lembar kerja ini? Data di dalam sheet ini akan hilang."
        confirmLabel="Hapus"
        onConfirm={confirmDeleteSheet}
        onClose={() => setDeletingSheet(null)}
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

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 px-4 py-2.5 rounded-xl shadow-xl text-xs font-medium animate-in fade-in slide-in-from-bottom-2"
        >
          <span>{toast}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="ml-2 hover:opacity-70 p-0.5 cursor-pointer rounded"
            aria-label="Tutup notifikasi"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
