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
import { convertToFortuneSheet, matrixToCelldata } from "@/lib/spreadsheet-adapter";
import type { SheetData } from "@/types/database";
import type { WorkbookInstance } from "@fortune-sheet/react";
import type { Sheet } from "@fortune-sheet/core";
import "@fortune-sheet/react/dist/index.css";

// Dynamic import with ssr: false ensures canvas/DOM APIs only initialize on client
const Workbook = dynamic(
  () => import("@fortune-sheet/react").then((mod) => mod.Workbook),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[620px] sm:h-[680px] flex flex-col items-center justify-center bg-card border border-border rounded-2xl text-muted-foreground gap-3">
        <Loader2 className="w-7 h-7 animate-spin text-[#007aff]" />
        <span className="text-xs font-semibold tracking-tight">Memuat Lembar Kerja Excel...</span>
      </div>
    ),
  }
);

export interface DynamicSheetGridHandle {
  getData: () => SheetData;
  getAllSheets: () => Sheet[];
}

export interface DynamicSheetGridProps {
  data: SheetData;
  readOnly?: boolean;
  sheetName?: string;
}

export const DynamicSheetGrid = forwardRef<DynamicSheetGridHandle, DynamicSheetGridProps>(
  function DynamicSheetGrid(
    { data, readOnly = false, sheetName = "Sheet 1" },
    ref
  ) {
    const [mounted, setMounted] = useState(false);
    const workbookRef = useRef<WorkbookInstance | null>(null);

    // Initialize initialSheets ONCE on mount for this sheet key.
    // FortuneSheet operates as an uncontrolled component managing its internal canvas state.
    const [initialSheets] = useState<Sheet[]>(() => [
      convertToFortuneSheet(data, sheetName),
    ]);

    const latestSheetRef = useRef<Sheet>(initialSheets[0]);

    useEffect(() => {
      setMounted(true);
    }, []);

    // Expose imperative handle so parents can grab fresh data on-demand
    useImperativeHandle(
      ref,
      () => ({
        getData: () => {
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

          // Ensure celldata is attached for safe re-hydration
          if (
            (!sheetClone.celldata || sheetClone.celldata.length === 0) &&
            Array.isArray(sheetClone.data)
          ) {
            sheetClone.celldata = matrixToCelldata(sheetClone.data as any[][]);
          }
          return sheetClone as unknown as SheetData;
        },
        getAllSheets: () => {
          if (workbookRef.current?.getAllSheets) {
            const all = workbookRef.current.getAllSheets();
            return all.map((s) => {
              const clone: Sheet = JSON.parse(JSON.stringify(s));
              if (
                (!clone.celldata || clone.celldata.length === 0) &&
                Array.isArray(clone.data)
              ) {
                clone.celldata = matrixToCelldata(clone.data as any[][]);
              }
              return clone;
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
        <div className="w-full h-[620px] sm:h-[680px] flex flex-col items-center justify-center bg-card border border-border rounded-2xl text-muted-foreground gap-3">
          <Loader2 className="w-7 h-7 animate-spin text-[#007aff]" />
          <span className="text-xs font-semibold tracking-tight">Memuat Lembar Kerja Excel...</span>
        </div>
      );
    }

    return (
      <div className="w-full space-y-2">
        {/* Helper Tips & Instructions */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground px-1">
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
        <div className="w-full h-[620px] sm:h-[680px] rounded-2xl border border-border bg-card shadow-xs overflow-hidden relative fortune-sheet-wrapper">
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
