"use client";

import { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import type {
  Event,
  EventCrew,
  EventTask,
  EventExpense,
  EventStatus,
} from "@/types/database";

interface ExportPdfButtonProps {
  event:
    | Event
    | {
        id: string;
        title: string;
        venue: string;
        start_date: string;
        end_date?: string;
        status: EventStatus;
        pic?: string | null;
        budget?: number | null;
        client?: {
          name: string;
          company?: string | null;
          email?: string | null;
          phone?: string | null;
        } | null;
      };
  crew: EventCrew[];
  tasks: EventTask[];
  expenses?: EventExpense[];
  className?: string;
}

export function ExportPdfButton({
  event,
  crew,
  tasks,
  expenses,
  className = "",
}: ExportPdfButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (isExporting) return;
    try {
      setIsExporting(true);
      const { downloadEventSummaryPdf } = await import("@/lib/pdf/event-summary-pdf");
      await downloadEventSummaryPdf({
        event,
        crew,
        tasks,
        expenses,
      });
    } catch (err) {
      console.error("Failed to generate and download event PDF summary:", err);
      alert("Gagal mengekspor PDF ringkasan acara. Silakan coba kembali.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={isExporting}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card hover:bg-muted text-foreground text-xs font-semibold border border-border transition-all cursor-pointer shadow-xs active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      title="Ekspor ringkasan acara dan rundown operasional ke PDF"
    >
      {isExporting ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#007aff]" />
      ) : (
        <FileDown className="w-3.5 h-3.5 text-[#007aff]" />
      )}
      <span>{isExporting ? "Membuat PDF..." : "Export Event Summary"}</span>
    </button>
  );
}

