"use client";

import { useState, useEffect, useRef } from "react";
import { FileText, CheckCircle2, X } from "lucide-react";
import { ExportSpreadsheetPdfModal } from "./export-spreadsheet-pdf-modal";
import type { EventSheet, EventPublicForm } from "@/types/database";

interface ExportSpreadsheetPdfButtonProps {
  eventId?: string;
  eventTitle: string;
  event?: any;
  sheets: EventSheet[];
  publicForm?: EventPublicForm | null;
  className?: string;
}

export function ExportSpreadsheetPdfButton({
  eventId,
  eventTitle,
  event,
  sheets: initialSheets,
  publicForm,
  className = "",
}: ExportSpreadsheetPdfButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [liveSheets, setLiveSheets] = useState<EventSheet[] | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const sheets = liveSheets ?? initialSheets;

  // Sync with live spreadsheet edits from EventSpreadsheetTabs
  useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent<EventSheet[]>;
      if (custom.detail) setLiveSheets(custom.detail);
    };
    window.addEventListener("xeno_sheets_updated", handler);
    return () => window.removeEventListener("xeno_sheets_updated", handler);
  }, []);

  const showToast = (message: string) => {
    setToastMessage(message);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  return (
    <>
      <button
        type="button"
        id="export-spreadsheet-pdf-btn"
        onClick={() => setIsModalOpen(true)}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer active:scale-[0.98] ${className}`}
        title="Ekspor tab lembar kerja yang dipilih ke file PDF"
      >
        <FileText className="w-3.5 h-3.5" />
        <span>Export PDF</span>
      </button>

      <ExportSpreadsheetPdfModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        eventTitle={eventTitle}
        event={event}
        sheets={sheets}
        eventId={eventId}
        publicForm={publicForm}
        onSuccess={showToast}
      />

      {/* Floating Success Toast Notification */}
      {toastMessage && (
        <div
          id="spreadsheet-pdf-toast"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-2xl border border-border animate-in slide-in-from-bottom-5 duration-200"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span className="text-xs font-semibold">{toastMessage}</span>
          <button
            type="button"
            id="dismiss-pdf-toast-btn"
            onClick={() => setToastMessage(null)}
            className="ml-2 p-1 rounded-full hover:bg-white/10 dark:hover:bg-black/10 transition-colors cursor-pointer"
            aria-label="Tutup notifikasi"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </>
  );
}
