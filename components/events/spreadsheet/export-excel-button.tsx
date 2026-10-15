"use client";

import { useState, useEffect } from "react";
import { FileSpreadsheet, Loader2 } from "lucide-react";
import { sheetToAoaAndMerges } from "@/lib/spreadsheet-adapter";
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
      // Lazy load XLSX to minimize bundle size
      const XLSX = await import("xlsx");
      const workbook = XLSX.utils.book_new();

      const usedNames = new Set<string>();

      for (const sheet of sheets) {
        // Sanitize sheet name: max 31 chars, no invalid characters
        const safeName = sheet.sheet_name
          .replace(/[:\\/?*\[\]]/g, "_")
          .trim()
          .slice(0, 31) || "Sheet";

        // Avoid duplicate sheet names in Excel
        let counter = 1;
        let finalName = safeName;
        while (usedNames.has(finalName.toLowerCase())) {
          const suffix = `_${counter}`;
          finalName = `${safeName.slice(0, 31 - suffix.length)}${suffix}`;
          counter++;
        }
        usedNames.add(finalName.toLowerCase());

        const { aoa, merges, colWidths } = sheetToAoaAndMerges(sheet.data);
        const worksheet = XLSX.utils.aoa_to_sheet(aoa);

        if (merges.length > 0) {
          worksheet["!merges"] = merges;
        }
        if (colWidths.length > 0) {
          worksheet["!cols"] = colWidths;
        }

        XLSX.utils.book_append_sheet(workbook, worksheet, finalName);
      }

      // Download file
      const safeTitle = eventTitle.replace(/[^a-zA-Z0-9_\-\s]/g, "").trim().replace(/\s+/g, "_");
      const filename = `${safeTitle || "Event"}_Data_Sheets.xlsx`;
      XLSX.writeFile(workbook, filename);
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
