"use client";

import { useState, useEffect } from "react";
import { FileSpreadsheet, Loader2 } from "lucide-react";
import type { EventSheet } from "@/types/database";

interface ExportExcelButtonProps {
  eventTitle: string;
  sheets: EventSheet[];
  className?: string;
}

export function ExportExcelButton({
  eventTitle,
  sheets: initialSheets,
  className = "",
}: ExportExcelButtonProps) {
  const [liveSheets, setLiveSheets] = useState<EventSheet[] | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const sheets = liveSheets ?? initialSheets;

  // Sync with live edits from EventSpreadsheetTabs
  useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent<EventSheet[]>;
      if (custom.detail) setLiveSheets(custom.detail);
    };
    window.addEventListener("xeno_sheets_updated", handler);
    return () => window.removeEventListener("xeno_sheets_updated", handler);
  }, []);

  const handleExport = async () => {
    if (isExporting) return;
    setIsExporting(true);

    try {
      // Lazy-load the ExcelJS-based export module
      const { exportSheetsToExcel } = await import("@/lib/excel-export");
      await exportSheetsToExcel(eventTitle, sheets);
    } catch (err) {
      console.error("[ExportExcel] Export failed:", err);
      alert("Gagal mengekspor lembar kerja ke Excel.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={isExporting}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
      title="Export semua tab lembar kerja ke file .xlsx"
    >
      {isExporting ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <FileSpreadsheet className="w-3.5 h-3.5" />
      )}
      <span>{isExporting ? "Mengekspor..." : "Export Excel"}</span>
    </button>
  );
}
