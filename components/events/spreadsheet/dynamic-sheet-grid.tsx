"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import {
  convertToFortuneSheet,
  matrixToCelldata,
  sanitizeSheetData,
} from "@/lib/spreadsheet-adapter";
import { registerMontserratInFortuneSheet } from "@/lib/fortune-sheet-fonts";
import type { SheetData } from "@/types/database";
import type { WorkbookInstance } from "@fortune-sheet/react";
import type { Sheet } from "@fortune-sheet/core";
import "@fortune-sheet/react/dist/index.css";

// Dynamic import with ssr: false ensures canvas/DOM APIs only initialize on client
const Workbook = dynamic(
  () =>
    import("@fortune-sheet/react").then(async (mod) => {
      await registerMontserratInFortuneSheet();
      return mod.Workbook;
    }),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[60vh] sm:h-[620px] md:h-[680px] lg:h-[720px] flex flex-col items-center justify-center bg-card border border-border rounded-2xl text-muted-foreground gap-3">
        <Loader2 className="w-7 h-7 animate-spin text-[#007aff]" />
        <span className="text-xs font-semibold tracking-tight">Memuat Lembar Kerja Excel...</span>
      </div>
    ),
  }
);

export interface DynamicSheetGridHandle {
  getData: () => SheetData;
  getAllSheets: () => Sheet[];
  exitEditMode?: () => void;
  flushActiveCell?: () => void;
}

export interface DynamicSheetGridProps {
  data: SheetData;
  readOnly?: boolean;
  sheetName?: string;
  showGridLines?: boolean;
  isFullscreen?: boolean;
  zoomRatio?: number;
}

export const DynamicSheetGrid = forwardRef<DynamicSheetGridHandle, DynamicSheetGridProps>(
  function DynamicSheetGrid(
    {
      data,
      readOnly = false,
      sheetName = "Sheet 1",
      showGridLines = true,
      isFullscreen = false,
      zoomRatio,
    },
    ref
  ) {
    const [mounted, setMounted] = useState(false);
    const workbookRef = useRef<WorkbookInstance | null>(null);

    // Initialize initialSheets ONCE on mount for this sheet key.
    // FortuneSheet operates as an uncontrolled component managing its internal canvas state.
    const [initialSheets] = useState<Sheet[]>(() => {
      const sheet = convertToFortuneSheet(data, sheetName, showGridLines);
      // Deep clone before mutating so we never mutate read-only / frozen objects from React props/state
      const newSheet: Sheet =
        typeof structuredClone === "function"
          ? structuredClone(sheet)
          : (JSON.parse(JSON.stringify(sheet)) as Sheet);

      if (showGridLines !== undefined) {
        newSheet.showGridLines = showGridLines;
        if (!newSheet.config) {
          newSheet.config = {};
        } else {
          newSheet.config = { ...newSheet.config };
        }
        (newSheet.config as any).showGridLines = showGridLines ? 1 : 0;
      }
      if (zoomRatio !== undefined) {
        newSheet.zoomRatio = zoomRatio;
      }
      return [newSheet];
    });

    const latestSheetRef = useRef<Sheet>(initialSheets[0]);

    useEffect(() => {
      registerMontserratInFortuneSheet().then(() => {
        setMounted(true);
      });
    }, []);

    // Trigger window resize event so FortuneSheet recalculates canvas layout when toggling fullscreen
    useEffect(() => {
      const timer1 = setTimeout(() => {
        window.dispatchEvent(new Event("resize"));
      }, 50);
      const timer2 = setTimeout(() => {
        window.dispatchEvent(new Event("resize"));
      }, 200);
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }, [isFullscreen]);

    // Expose imperative handle so parents can grab fresh data on-demand
    useImperativeHandle(
      ref,
      () => ({
        exitEditMode: () => {
          if (typeof window !== "undefined" && document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
          }
        },
        flushActiveCell: () => {
          if (typeof window !== "undefined" && document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
          }
        },
        getData: () => {
          // Force blur active cell input if still focused inside FortuneSheet editor
          if (typeof window !== "undefined" && document.activeElement instanceof HTMLElement) {
            const tag = document.activeElement.tagName.toLowerCase();
            const isInput =
              tag === "input" ||
              tag === "textarea" ||
              document.activeElement.getAttribute("contenteditable") === "true";
            if (isInput) {
              document.activeElement.blur();
            }
          }
          let sheet: Sheet | null = null;
          if (workbookRef.current?.getAllSheets) {
            const all = workbookRef.current.getAllSheets();
            if (all && all.length > 0) {
              sheet = all[0];
            }
          }
          if (!sheet) {
            sheet = latestSheetRef.current;
          }
          if (!sheet) return convertToFortuneSheet(data, sheetName) as unknown as SheetData;

          // Clone to prevent mutating internal FortuneSheet objects
          const sheetClone: Sheet = JSON.parse(JSON.stringify(sheet));
          if (showGridLines !== undefined) {
            sheetClone.showGridLines = showGridLines;
          }

          // Always synchronize celldata from the live 2D canvas matrix for safe re-hydration & multiline preservation
          if (Array.isArray(sheetClone.data) && sheetClone.data.length > 0) {
            sheetClone.celldata = matrixToCelldata(sheetClone.data as any[][]);
          }

          return sanitizeSheetData(sheetClone);
        },
        getAllSheets: () => {
          if (workbookRef.current?.getAllSheets) {
            const all = workbookRef.current.getAllSheets();
            return all.map((s) => {
              const clone: Sheet = JSON.parse(JSON.stringify(s));
              if (Array.isArray(clone.data) && clone.data.length > 0) {
                clone.celldata = matrixToCelldata(clone.data as any[][]);
              }
              return sanitizeSheetData(clone) as unknown as Sheet;
            });
          }
          return [latestSheetRef.current];
        },
      }),
      [data, sheetName]
    );

    // Silent ref-only tracker: FortuneSheet fires onChange on init, scroll, selection,
    // and internal canvas ops — NOT only on user edits. We NEVER call back to the
    // parent from here. Data is read on-demand via the imperative handle above.
    const handleWorkbookChange = useCallback(
      (newSheets: Sheet[]) => {
        if (!newSheets || newSheets.length === 0) return;
        latestSheetRef.current = newSheets[0];
      },
      []
    );

    if (!mounted) {
      return (
        <div
          className={`w-full flex flex-col items-center justify-center bg-card border border-border text-muted-foreground gap-3 ${
            isFullscreen
              ? "flex-1 min-h-[350px] rounded-xl"
              : "h-[60vh] sm:h-[620px] md:h-[680px] lg:h-[720px] rounded-2xl"
          }`}
        >
          <Loader2 className="w-7 h-7 animate-spin text-[#007aff]" />
          <span className="text-xs font-semibold tracking-tight">Memuat Lembar Kerja Excel...</span>
        </div>
      );
    }

    return (
      <div className={`w-full space-y-2 ${isFullscreen ? "flex-1 flex flex-col min-h-0" : ""}`}>
        {/* Helper Tips & Instructions */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground px-1 shrink-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 font-semibold text-foreground">
              <span className="w-2 h-2 rounded-full bg-[#30d158] animate-pulse" />
              Mode Excel Aktif
            </span>
            <span>•</span>
            <span>Klik ganda untuk mengedit sel</span>
            <span className="hidden sm:inline">•</span>
            <span className="hidden sm:inline">
              Pilih sel lalu gunakan toolbar untuk <b>Tebal (Bold)</b>, <b>Warna Sel</b>, <b>Ukuran Font</b>, dan <b>Merge Cells</b>
            </span>
          </div>
          <div className="text-[10px] font-mono text-muted-foreground/80 hidden md:block">
            Klik kanan untuk menu Baris &amp; Kolom
          </div>
        </div>

        {/* Rich FortuneSheet Canvas Container */}
        <div
          className={`w-full rounded-2xl border border-border bg-card shadow-xs overflow-hidden relative fortune-sheet-wrapper ${
            isFullscreen
              ? "flex-1 min-h-0 h-full"
              : "h-[60vh] sm:h-[620px] md:h-[680px] lg:h-[720px]"
          }`}
        >
          <Workbook
            key={initialSheets[0]?.id || sheetName}
            ref={workbookRef}
            data={initialSheets}
            onChange={handleWorkbookChange}
            allowEdit={!readOnly}
            showSheetTabs={false}
            showToolbar={true}
            showFormulaBar={true}
            lang="en"
          />
        </div>
      </div>
    );
  }
);
