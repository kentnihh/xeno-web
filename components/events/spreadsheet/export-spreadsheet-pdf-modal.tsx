"use client";

import { useState, useEffect, useTransition } from "react";
import { createPortal } from "react-dom";
import {
  FileText,
  Loader2,
  X,
  Check,
  CheckSquare,
  Square,
  FileSpreadsheet,
  Columns,
  Rows,
} from "lucide-react";
import type { EventSheet } from "@/types/database";

export interface ExportSpreadsheetPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventTitle: string;
  sheets: EventSheet[];
  onSuccess?: (message: string) => void;
}

export function ExportSpreadsheetPdfModal({
  isOpen,
  onClose,
  eventTitle,
  sheets,
  onSuccess,
}: ExportSpreadsheetPdfModalProps) {
  const [selectedSheetNames, setSelectedSheetNames] = useState<string[]>([]);
  const [orientation, setOrientation] = useState<"landscape" | "portrait">("landscape");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // When modal opens, default all sheets to selected
  useEffect(() => {
    if (isOpen) {
      setSelectedSheetNames(sheets.map((s) => s.sheet_name));
      setError(null);
    }
  }, [isOpen, sheets]);

  // Handle ESC key and backdrop body scroll lock
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isGenerating) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, isGenerating, onClose]);

  if (!isOpen) return null;

  const allSelected =
    sheets.length > 0 && selectedSheetNames.length === sheets.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedSheetNames([]);
    } else {
      setSelectedSheetNames(sheets.map((s) => s.sheet_name));
    }
  };

  const toggleSheet = (sheetName: string) => {
    setSelectedSheetNames((prev) =>
      prev.includes(sheetName)
        ? prev.filter((name) => name !== sheetName)
        : [...prev, sheetName]
    );
  };

  const handleDownload = async () => {
    if (selectedSheetNames.length === 0 || isGenerating) return;

    setIsGenerating(true);
    setError(null);

    try {
      const selectedSheets = sheets.filter((s) =>
        selectedSheetNames.includes(s.sheet_name)
      );

      const { downloadSpreadsheetPdf } = await import("@/lib/pdf/spreadsheet-pdf");

      const { fileName } = await downloadSpreadsheetPdf({
        eventTitle,
        sheets: selectedSheets,
        orientation,
      });

      onSuccess?.(`Dokumen "${fileName}" berhasil diunduh!`);
      onClose();
    } catch (err: unknown) {
      console.error("[ExportPdf] Failed to build spreadsheet PDF:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Gagal memproses pembuatan PDF. Silakan coba kembali."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const modalContent = (
    <div className="export-pdf-modal-root">
      {/* 1. Backdrop Overlay */}
      <div
        className="fixed inset-0 z-50 bg-black/50 dark:bg-black/70 backdrop-blur-sm animate-in fade-in duration-150"
        onClick={isGenerating ? undefined : onClose}
        aria-hidden="true"
      />

      {/* 2. Centered Modal Container */}
      <div
        className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] z-50 w-[calc(100%-2rem)] max-w-lg rounded-2xl bg-card border border-border shadow-2xl p-6 text-foreground transform animate-in zoom-in-95 duration-150 focus:outline-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-pdf-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="export-pdf-modal-title"
                className="text-base font-bold text-foreground tracking-tight"
              >
                Ekspor Lembar Kerja ke PDF
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Pilih lembar kerja yang ingin dimasukkan ke dalam dokumen PDF.
              </p>
            </div>
          </div>
          <button
            type="button"
            id="close-export-pdf-modal-btn"
            onClick={onClose}
            disabled={isGenerating}
            className="w-7 h-7 rounded-full bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Tutup modal"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto scrollbar-thin">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Select All Toggle Bar */}
          <div className="flex items-center justify-between px-1">
            <button
              type="button"
              id="select-all-sheets-btn"
              onClick={toggleSelectAll}
              className="inline-flex items-center gap-2 text-xs font-semibold text-foreground hover:text-[#007aff] transition-colors cursor-pointer"
            >
              {allSelected ? (
                <CheckSquare className="w-4 h-4 text-[#007aff]" />
              ) : (
                <Square className="w-4 h-4 text-muted-foreground" />
              )}
              <span>{allSelected ? "Batalkan Semua Pilihan" : "Pilih Semua Sheet"}</span>
            </button>
            <span className="text-[11px] text-muted-foreground font-medium">
              {selectedSheetNames.length} dari {sheets.length} dipilih
            </span>
          </div>

          {/* Sheet Checklist Items */}
          <div className="space-y-2">
            {sheets.map((sheet) => {
              const isChecked = selectedSheetNames.includes(sheet.sheet_name);
              const dataRows = Array.isArray(sheet.data?.rows)
                ? sheet.data.rows.length
                : Array.isArray(sheet.data?.celldata)
                ? sheet.data.celldata.length
                : 0;

              const safeId = sheet.sheet_name.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();

              return (
                <div
                  key={sheet.sheet_name}
                  id={`sheet-item-${safeId}`}
                  onClick={() => toggleSheet(sheet.sheet_name)}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer select-none ${
                    isChecked
                      ? "bg-[#007aff]/5 dark:bg-[#007aff]/10 border-[#007aff]/40 text-foreground shadow-2xs"
                      : "bg-muted/30 border-border/80 hover:bg-muted/60 text-muted-foreground"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors border ${
                        isChecked
                          ? "bg-[#007aff] border-[#007aff] text-white"
                          : "border-muted-foreground/40 bg-card"
                      }`}
                    >
                      {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>

                    <div className="flex items-center gap-2">
                      <FileSpreadsheet
                        className={`w-4 h-4 ${
                          isChecked ? "text-[#007aff]" : "text-muted-foreground"
                        }`}
                      />
                      <span className="text-xs font-bold text-foreground">
                        {sheet.sheet_name}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="px-2 py-0.5 rounded-full bg-card border border-border text-muted-foreground font-medium">
                      {dataRows > 0 ? `${dataRows} data` : "Format Master"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Page Orientation Selector */}
          <div className="pt-2 border-t border-border">
            <label className="text-xs font-bold text-foreground block mb-2">
              Orientasi Halaman PDF:
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                id="orientation-landscape-btn"
                onClick={() => setOrientation("landscape")}
                className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  orientation === "landscape"
                    ? "bg-[#007aff]/10 border-[#007aff] text-foreground ring-1 ring-[#007aff]"
                    : "bg-muted/30 border-border hover:bg-muted/60 text-muted-foreground"
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <Columns className="w-3.5 h-3.5 text-[#007aff]" />
                  <span>Landscape (Mendatar)</span>
                </div>
                <span className="text-[11px] text-muted-foreground mt-1">
                  Direkomendasikan untuk tabel lebar banyak kolom.
                </span>
              </button>

              <button
                type="button"
                id="orientation-portrait-btn"
                onClick={() => setOrientation("portrait")}
                className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  orientation === "portrait"
                    ? "bg-[#007aff]/10 border-[#007aff] text-foreground ring-1 ring-[#007aff]"
                    : "bg-muted/30 border-border hover:bg-muted/60 text-muted-foreground"
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <Rows className="w-3.5 h-3.5 text-[#007aff]" />
                  <span>Portrait (Tegak)</span>
                </div>
                <span className="text-[11px] text-muted-foreground mt-1">
                  Format dokumen standar A4 vertikal.
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border">
          <button
            type="button"
            id="cancel-export-pdf-btn"
            onClick={onClose}
            disabled={isGenerating}
            className="px-5 py-2 rounded-xl bg-muted/80 hover:bg-muted text-foreground text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            id="download-spreadsheet-pdf-btn"
            onClick={handleDownload}
            disabled={selectedSheetNames.length === 0 || isGenerating}
            className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-semibold shadow-xs transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileText className="w-3.5 h-3.5" />
            )}
            <span>
              {isGenerating
                ? "Menyiapkan PDF..."
                : `Download PDF (${selectedSheetNames.length})`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );

  // In SSR environments, render content directly
  if (typeof document === "undefined" || !mounted) {
    return modalContent;
  }

  // Client-side portal to document.body
  return createPortal(modalContent, document.body);
}
