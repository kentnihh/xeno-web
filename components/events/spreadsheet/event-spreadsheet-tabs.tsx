"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { ChevronDown, Plus, Check, Loader2, AlertCircle, RotateCcw, Trash2, Edit2 } from "lucide-react";
import { DynamicSheetGrid } from "./dynamic-sheet-grid";
import { saveEventSheet, deleteEventSheet, resetSheetToMaster } from "@/app/(dashboard)/events/sheet-actions";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { INITIAL_EVENT_SHEETS } from "@/lib/constants/event-sheets";
import type { EventSheet, SheetData } from "@/types/database";

interface EventSpreadsheetTabsProps {
  eventId: string;
  initialSheets: EventSheet[];
  canManage?: boolean;
  onSheetsChange?: (sheets: EventSheet[]) => void;
}

export function EventSpreadsheetTabs({
  eventId,
  initialSheets,
  canManage = true,
  onSheetsChange,
}: EventSpreadsheetTabsProps) {
  const [sheets, setSheets] = useState<EventSheet[]>(initialSheets);
  const [activeTabName, setActiveTabName] = useState<string>(
    initialSheets[0]?.sheet_name || "CHECKLIST"
  );
  const [openMenuSheet, setOpenMenuSheet] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "error">("saved");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [deletingSheetName, setDeletingSheetName] = useState<string | null>(null);
  const [resettingSheetName, setResettingSheetName] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

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

  const handleSheetDataChange = (updatedData: SheetData) => {
    if (!activeSheet) return;
    const nextSheets = sheets.map((s) =>
      s.sheet_name === activeSheet.sheet_name ? { ...s, data: updatedData } : s
    );
    setSheets(nextSheets);
    setSaveStatus("saving");

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(() => {
      startTransition(async () => {
        try {
          const res = await saveEventSheet(
            eventId,
            activeSheet.sheet_name,
            updatedData,
            activeSheet.order_index
          );
          if (res.success) setSaveStatus("saved");
          else {
            setSaveStatus("error");
            setStatusMessage(res.error || "Gagal menyimpan");
          }
        } catch {
          setSaveStatus("error");
          setStatusMessage("Gagal menghubungi server");
        }
      });
    }, 600);
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
      setSaveStatus("saved");
    } else {
      // Fallback to static template
      const tpl = INITIAL_EVENT_SHEETS.find((t) => t.name.toLowerCase() === sheetName.toLowerCase());
      if (tpl) {
        setSheets((prev) =>
          prev.map((s) => (s.sheet_name === sheetName ? { ...s, data: tpl.data } : s))
        );
        await saveEventSheet(eventId, sheetName, tpl.data);
        setSaveStatus("saved");
      } else {
        setSaveStatus("error");
        setStatusMessage(res.error || "Gagal mereset");
        throw new Error(res.error || "Gagal mereset");
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Horizontally scrollable Tab Bar matching reference image */}
      <div className="relative border-y border-border bg-muted/40 dark:bg-zinc-900/40">
        <div className="flex items-center overflow-x-auto scrollbar-none py-1 px-1">
          {sheets.map((sheet) => {
            const isActive = sheet.sheet_name === activeTabName;
            const isMenuOpen = openMenuSheet === sheet.sheet_name;

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
                    onClick={() => setActiveTabName(sheet.sheet_name)}
                    className="cursor-pointer tracking-tight whitespace-nowrap text-left"
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
            );
          })}

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

          {/* Autosave Status Indicator */}
          <div className="ml-auto pl-3 pr-2 flex items-center gap-1.5 text-[11px] shrink-0">
            {saveStatus === "saving" && (
              <span className="inline-flex items-center gap-1 text-muted-foreground font-medium">
                <Loader2 className="w-3 h-3 animate-spin text-[#007aff]" />
                <span>Menyimpan...</span>
              </span>
            )}
            {saveStatus === "saved" && (
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                <Check className="w-3 h-3" />
                <span>Tersimpan</span>
              </span>
            )}
            {saveStatus === "error" && (
              <span className="inline-flex items-center gap-1 text-rose-500 font-medium" title={statusMessage}>
                <AlertCircle className="w-3 h-3" />
                <span>Gagal simpan</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Dynamic Spreadsheet Data Grid */}
      {activeSheet && (
        <DynamicSheetGrid
          key={activeSheet.sheet_name}
          data={activeSheet.data}
          onChange={handleSheetDataChange}
          readOnly={!canManage}
        />
      )}

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
