"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  forwardRef,
  useImperativeHandle,
} from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import {
  convertToFortuneSheet,
  extractCellText,
  matrixToCelldata,
  sanitizeSheetData,
} from "@/lib/spreadsheet-adapter";
import { registerMontserratInFortuneSheet } from "@/lib/fortune-sheet-fonts";
import {
  MAX_SAFE_AUTOFILL_ROWS,
  MAX_SAFE_ROW_LIMIT,
  clampRowCount,
  calculateContiguousFillRange,
  isCellEditorActive,
  insertNewlineAtCaret,
  cleanEditorOnCommit,
  isToolbarBoldButton,
  getActiveCellEditor,
  hasActiveTextSelectionInEditor,
  toggleInlineBoldOnSelection,
  buildVisibleRowHeights,
  buildVisibleColWidths,
  getRowByCoordinate,
  getColByCoordinate,
  calculateMarqueeBounds,
  calculateCalibratedMouseCoordinates,
  type MarqueeBounds,
} from "@/lib/spreadsheet-autofill";
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
  onSaveShortcut?: () => void;
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
      onSaveShortcut,
    },
    ref
  ) {
    const [mounted, setMounted] = useState(false);
    const workbookRef = useRef<WorkbookInstance | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const onSaveShortcutRef = useRef(onSaveShortcut);

    useEffect(() => {
      onSaveShortcutRef.current = onSaveShortcut;
    }, [onSaveShortcut]);

    // Enhanced border submenu interaction: hover exit delay (~180ms), click-to-lock, and positioning
    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      let closeTimer: ReturnType<typeof setTimeout> | null = null;
      let activeOption: HTMLElement | null = null;
      let lockedOption: HTMLElement | null = null;

      const clearCloseTimer = () => {
        if (closeTimer) {
          clearTimeout(closeTimer);
          closeTimer = null;
        }
      };

      const openSubmenu = (option: HTMLElement, lock = false) => {
        clearCloseTimer();
        const submenu = option.querySelector<HTMLElement>(".fortune-border-select-menu");
        if (!submenu) return;

        if (activeOption && activeOption !== option && activeOption !== lockedOption) {
          activeOption.removeAttribute("data-open");
          const prevSub = activeOption.querySelector<HTMLElement>(".fortune-border-select-menu");
          if (prevSub) prevSub.style.display = "none";
        }

        option.setAttribute("data-open", "true");
        if (lock) {
          option.setAttribute("data-locked", "true");
          lockedOption = option;
        }
        activeOption = option;
        submenu.style.display = "block";

        const optionRect = option.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const submenuWidth = parseFloat(submenu.style.width || "166") || 166;

        if (containerRect.right - optionRect.right >= submenuWidth) {
          submenu.style.left = `${optionRect.width}px`;
        } else {
          submenu.style.left = `-${submenuWidth}px`;
        }
      };

      const scheduleClose = (option: HTMLElement) => {
        clearCloseTimer();
        if (option.getAttribute("data-locked") === "true") return;

        closeTimer = setTimeout(() => {
          if (option.matches(":hover")) return;
          const submenu = option.querySelector<HTMLElement>(".fortune-border-select-menu");
          if (submenu && submenu.matches(":hover")) return;

          option.removeAttribute("data-open");
          if (submenu) submenu.style.display = "none";
          if (activeOption === option) activeOption = null;
        }, 180);
      };

      const handleMouseOver = (e: MouseEvent) => {
        const target = e.target as HTMLElement | null;
        if (!target) return;

        const option = target.closest<HTMLElement>(".fortune-border-select-option");
        if (option && container.contains(option)) {
          openSubmenu(option);
          return;
        }

        const submenu = target.closest<HTMLElement>(".fortune-border-select-menu");
        if (submenu && container.contains(submenu)) {
          clearCloseTimer();
        }
      };

      const handleMouseOut = (e: MouseEvent) => {
        const target = e.target as HTMLElement | null;
        if (!target) return;

        const option = target.closest<HTMLElement>(".fortune-border-select-option");
        if (option && container.contains(option)) {
          const related = e.relatedTarget as HTMLElement | null;
          if (
            related &&
            (option.contains(related) ||
              option.querySelector(".fortune-border-select-menu")?.contains(related))
          ) {
            return;
          }
          scheduleClose(option);
          return;
        }

        const submenu = target.closest<HTMLElement>(".fortune-border-select-menu");
        if (submenu && container.contains(submenu)) {
          const related = e.relatedTarget as HTMLElement | null;
          if (related && submenu.contains(related)) return;
          const parentOption = submenu.closest<HTMLElement>(".fortune-border-select-option");
          if (parentOption) {
            if (related && parentOption.contains(related)) return;
            scheduleClose(parentOption);
          }
        }
      };

      const handleClick = (e: MouseEvent) => {
        const target = e.target as HTMLElement | null;
        if (!target) return;

        const option = target.closest<HTMLElement>(".fortune-border-select-option");
        const submenu = target.closest<HTMLElement>(".fortune-border-select-menu");

        // Clicked on the border color or style row itself (not inside the opened submenu)
        if (option && !submenu && container.contains(option)) {
          const isCurrentlyLocked = option.getAttribute("data-locked") === "true";
          if (isCurrentlyLocked) {
            option.removeAttribute("data-locked");
            option.removeAttribute("data-open");
            lockedOption = null;
            const sub = option.querySelector<HTMLElement>(".fortune-border-select-menu");
            if (sub) sub.style.display = "none";
          } else {
            openSubmenu(option, true);
          }
          return;
        }

        // Selection made inside submenu (color square, reset, or line style item)
        const isPickItem =
          target.closest(".fortune-toolbar-color-picker-item") ||
          target.closest(".fortune-border-style-picker-menu") ||
          target.closest(".color-reset") ||
          target.closest(".button-primary");

        if (isPickItem && activeOption) {
          activeOption.removeAttribute("data-locked");
          activeOption.removeAttribute("data-open");
          lockedOption = null;
          const sub = activeOption.querySelector<HTMLElement>(".fortune-border-select-menu");
          if (sub) sub.style.display = "none";
          activeOption = null;
          return;
        }

        // Click outside active/locked option
        if (lockedOption && !lockedOption.contains(target)) {
          lockedOption.removeAttribute("data-locked");
          lockedOption.removeAttribute("data-open");
          const sub = lockedOption.querySelector<HTMLElement>(".fortune-border-select-menu");
          if (sub) sub.style.display = "none";
          lockedOption = null;
          activeOption = null;
        }
      };

      container.addEventListener("mouseover", handleMouseOver);
      container.addEventListener("mouseout", handleMouseOut);
      container.addEventListener("click", handleClick);
      document.addEventListener("click", handleClick);

      return () => {
        clearCloseTimer();
        container.removeEventListener("mouseover", handleMouseOver);
        container.removeEventListener("mouseout", handleMouseOut);
        container.removeEventListener("click", handleClick);
        document.removeEventListener("click", handleClick);
      };
    }, []);

    // Keyboard shortcuts & Cell Editor line breaks & Partial Inline Bold:
    // 1. Ctrl+Enter / Cmd+Enter inside cell editor: single keypress line break (<br>) in capture phase
    // 2. Ctrl+Enter / Cmd+Enter outside cell editor: trigger manual save
    // 3. Ctrl+S / Cmd+S: prevent browser default save dialog and trigger manual save
    // 4. Ctrl+B / Cmd+B inside cell editor with active text selection: apply partial inline bold (inlineStr)
    // 5. Toolbar Bold button click / mousedown: prevent blur and apply partial inline bold to selection
    // 6. Enter (without Ctrl) or blur: clean trailing placeholder <br> before FortuneSheet commits
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        const isCmdOrCtrl = e.ctrlKey || e.metaKey;

        // Save shortcut (Ctrl+S or Cmd+S)
        if (isCmdOrCtrl && (e.key === "s" || e.key === "S")) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          onSaveShortcutRef.current?.();
          return;
        }

        // Partial inline bold shortcut (Ctrl+B or Cmd+B) when text is highlighted inside active cell editor
        if (isCmdOrCtrl && (e.key === "b" || e.key === "B")) {
          if (isCellEditorActive() && hasActiveTextSelectionInEditor()) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            toggleInlineBoldOnSelection();
            return;
          }
          // If not in cell editor with text selected, allow FortuneSheet to toggle cell-wide bolding normally
        }

        // Newline or Save shortcut (Ctrl+Enter or Cmd+Enter)
        if (isCmdOrCtrl && e.key === "Enter") {
          if (isCellEditorActive()) {
            e.preventDefault();
            e.stopImmediatePropagation();
            insertNewlineAtCaret();
            return;
          } else {
            e.preventDefault();
            e.stopImmediatePropagation();
            onSaveShortcutRef.current?.();
            return;
          }
        }

        // Enter without Ctrl inside active editor: clean trailing placeholder <br>
        if (!isCmdOrCtrl && e.key === "Enter") {
          if (isCellEditorActive()) {
            cleanEditorOnCommit();
          }
        }
      };

      const handleMouseDownCapture = (e: MouseEvent) => {
        const target = e.target as HTMLElement | null;
        if (isToolbarBoldButton(target)) {
          if (isCellEditorActive() && hasActiveTextSelectionInEditor()) {
            // Prevent toolbar button click from stealing focus and blurring the cell editor!
            e.preventDefault();
          }
        }
      };

      const handleClickCapture = (e: MouseEvent) => {
        const target = e.target as HTMLElement | null;
        if (isToolbarBoldButton(target)) {
          if (isCellEditorActive() && hasActiveTextSelectionInEditor()) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            toggleInlineBoldOnSelection();
          }
        }
      };

      const handleBlurCapture = (e: FocusEvent) => {
        const target = e.target as HTMLElement | null;
        if (target && (target.isContentEditable || target.getAttribute("contenteditable") === "true")) {
          cleanEditorOnCommit(target);
        }
      };

      const container = containerRef.current;
      if (container) {
        container.addEventListener("keydown", handleKeyDown, true);
        container.addEventListener("mousedown", handleMouseDownCapture, true);
        container.addEventListener("click", handleClickCapture, true);
        container.addEventListener("blur", handleBlurCapture, true);
      }
      window.addEventListener("keydown", handleKeyDown, true);

      return () => {
        if (container) {
          container.removeEventListener("keydown", handleKeyDown, true);
          container.removeEventListener("mousedown", handleMouseDownCapture, true);
          container.removeEventListener("click", handleClickCapture, true);
          container.removeEventListener("blur", handleBlurCapture, true);
        }
        window.removeEventListener("keydown", handleKeyDown, true);
      };
    }, []);

    // Autofill bounding, coordinate calibration & double-click fill handling
    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      let isDraggingFillHandle = false;
      let startSel: { row: number[]; column: number[] } | null = null;
      let visibleRows: number[] = [];
      let visibleCols: number[] = [];
      let lastMarqueeBounds: MarqueeBounds | null = null;

      // Handle double click on fill handle: bounded to contiguous data in adjacent column ONLY
      const handleDblClick = (e: MouseEvent) => {
        const target = e.target as HTMLElement | null;
        if (!target) return;
        const fillHandle = target.closest<HTMLElement>(".luckysheet-cs-fillhandle");
        if (!fillHandle || !container.contains(fillHandle)) return;

        e.preventDefault();
        e.stopPropagation();

        const selection = workbookRef.current?.getSelection();
        if (!selection || selection.length === 0) return;
        const sel = selection[0];
        const sheetData =
          workbookRef.current?.getAllSheets()?.[0]?.data ||
          (latestSheetRef.current?.data as any[][]);

        const fillResult = calculateContiguousFillRange(sheetData, sel, MAX_SAFE_AUTOFILL_ROWS);
        if (!fillResult) return;

        workbookRef.current?.autoFillCell(
          { row: sel.row, column: sel.column },
          fillResult.applyRange,
          "down"
        );
        workbookRef.current?.setSelection([
          {
            row: [sel.row[0], fillResult.targetRow],
            column: sel.column,
          },
        ]);
      };

      const handleMouseDown = (e: MouseEvent) => {
        const target = e.target as HTMLElement | null;
        if (!target) return;
        const fillHandle = target.closest<HTMLElement>(".luckysheet-cs-fillhandle");
        if (fillHandle && container.contains(fillHandle)) {
          isDraggingFillHandle = true;
          const selection = workbookRef.current?.getSelection();
          startSel = selection && selection.length > 0 ? selection[0] : null;

          // Build current visible row heights and column widths strictly from sheet config
          const sheet = workbookRef.current?.getAllSheets()?.[0] || latestSheetRef.current;
          const rowCount = Math.max(sheet?.data?.length || 84, 84);
          const colCount = Math.max(sheet?.data?.[0]?.length || 26, 26);
          visibleRows = buildVisibleRowHeights(rowCount, sheet?.config?.rowlen, sheet?.defaultRowHeight || 20);
          visibleCols = buildVisibleColWidths(colCount, sheet?.config?.columnlen, sheet?.defaultColWidth || 74);
          lastMarqueeBounds = null;
        }
      };

      const handleMouseMove = (e: MouseEvent) => {
        if (!isDraggingFillHandle || !startSel) return;

        // Prevent FortuneSheet's internal onDropCellSelect from applying erroneous offsets
        e.stopImmediatePropagation();

        const cellArea = container.querySelector<HTMLElement>(".fortune-cell-area");
        const cellRect = cellArea ? cellArea.getBoundingClientRect() : container.getBoundingClientRect();
        const scrollbarY = container.querySelector<HTMLElement>(".luckysheet-scrollbar-y");
        const scrollbarX = container.querySelector<HTMLElement>(".luckysheet-scrollbar-x");
        const scrollTop = scrollbarY ? scrollbarY.scrollTop : 0;
        const scrollLeft = scrollbarX ? scrollbarX.scrollLeft : 0;

        // Accurate coordinates relative to cell area
        const relativeY = e.clientY - cellRect.top + scrollTop;
        const relativeX = e.clientX - cellRect.left + scrollLeft;

        // Determine exact cell underneath cursor without adjacent column snapping
        const rawHoveredRow = getRowByCoordinate(relativeY, visibleRows);
        const rawHoveredCol = getColByCoordinate(relativeX, visibleCols);

        // Clamp to maximum safe range (MAX_SAFE_AUTOFILL_ROWS)
        const maxAllowedRow = Math.min(startSel.row[1] + MAX_SAFE_AUTOFILL_ROWS, visibleRows.length - 1);
        const currentHoveredRow = Math.min(rawHoveredRow, maxAllowedRow);
        const currentHoveredCol = Math.min(rawHoveredCol, visibleCols.length - 1);

        const bounds = calculateMarqueeBounds(
          startSel,
          currentHoveredRow,
          currentHoveredCol,
          visibleRows,
          visibleCols
        );
        lastMarqueeBounds = bounds;

        // Update the dashed preview marquee directly
        const selectedExtend = container.querySelector<HTMLElement>(".fortune-cell-selected-extend");
        if (selectedExtend) {
          selectedExtend.style.top = `${bounds.top}px`;
          selectedExtend.style.height = `${bounds.height}px`;
          selectedExtend.style.left = `${bounds.left}px`;
          selectedExtend.style.width = `${bounds.width}px`;
          selectedExtend.style.display = "block";
        }
      };

      const handleWindowMouseUp = (e: MouseEvent) => {
        if (!isDraggingFillHandle) return;
        isDraggingFillHandle = false;

        // If synthetic calibrated event, allow FortuneSheet to consume it
        if ((e as any).__isCalibratedAutofillMouseUp) return;

        e.stopImmediatePropagation();
        e.preventDefault();

        const selectedExtend = container.querySelector<HTMLElement>(".fortune-cell-selected-extend");
        if (selectedExtend) {
          selectedExtend.style.display = "none";
        }

        if (!startSel || !lastMarqueeBounds) return;

        const bounds = lastMarqueeBounds;
        const overlay = container.querySelector<HTMLElement>(".fortune-sheet-overlay") || container;
        const overlayRect = overlay.getBoundingClientRect();
        const scrollbarY = container.querySelector<HTMLElement>(".luckysheet-scrollbar-y");
        const scrollbarX = container.querySelector<HTMLElement>(".luckysheet-scrollbar-x");
        const scrollTop = scrollbarY ? scrollbarY.scrollTop : 0;
        const scrollLeft = scrollbarX ? scrollbarX.scrollLeft : 0;
        const colHeader = container.querySelector<HTMLElement>(".fortune-col-header-wrap");
        const rowHeader = container.querySelector<HTMLElement>(".fortune-row-header");
        const colHeaderHeight = colHeader ? colHeader.getBoundingClientRect().height : 20;
        const rowHeaderWidth = rowHeader ? rowHeader.getBoundingClientRect().width : 46;

        const { clientX, clientY } = calculateCalibratedMouseCoordinates(
          bounds.targetRow,
          bounds.targetCol,
          visibleRows,
          visibleCols,
          overlayRect,
          scrollTop,
          scrollLeft,
          window.scrollY,
          window.scrollX,
          colHeaderHeight,
          rowHeaderWidth
        );

        const syntheticEvent = new MouseEvent("mouseup", {
          bubbles: true,
          cancelable: true,
          clientX,
          clientY,
        });
        (syntheticEvent as any).__isCalibratedAutofillMouseUp = true;
        (e.target || overlay).dispatchEvent(syntheticEvent);
      };

      // Prevent bottom row addition controller from adding excessive rows
      const handleInput = (e: Event) => {
        const target = e.target as HTMLElement | null;
        if (!target) return;
        const bottomRowInput = target.closest<HTMLInputElement>("#luckysheet-bottom-controll-row input");
        if (bottomRowInput && container.contains(bottomRowInput)) {
          const val = parseInt(bottomRowInput.value, 10);
          if (!isNaN(val) && val > MAX_SAFE_ROW_LIMIT) {
            bottomRowInput.value = String(MAX_SAFE_ROW_LIMIT);
          }
        }
      };

      container.addEventListener("dblclick", handleDblClick, true);
      container.addEventListener("mousedown", handleMouseDown, true);
      window.addEventListener("mousemove", handleMouseMove, true);
      window.addEventListener("mouseup", handleWindowMouseUp, true);
      container.addEventListener("input", handleInput, true);

      return () => {
        container.removeEventListener("dblclick", handleDblClick, true);
        container.removeEventListener("mousedown", handleMouseDown, true);
        window.removeEventListener("mousemove", handleMouseMove, true);
        window.removeEventListener("mouseup", handleWindowMouseUp, true);
        container.removeEventListener("input", handleInput, true);
      };
    }, []);

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
          cleanEditorOnCommit();
          if (typeof window !== "undefined" && document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
          }
        },
        flushActiveCell: () => {
          cleanEditorOnCommit();
          if (typeof window !== "undefined" && document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
          }
        },
        getData: () => {
          cleanEditorOnCommit();
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

    const workbookHooks = useMemo(
      () => ({
        afterUpdateCell: (r: number, c: number) => {
          try {
            if (workbookRef.current) {
              const all = workbookRef.current.getAllSheets?.() || [];
              const sheet = all[0];
              if (sheet?.data?.[r]?.[c]) {
                const cell = sheet.data[r][c];
                const text = extractCellText(cell);
                if (typeof text === "string" && (text.includes("\n") || text.includes("\r"))) {
                  cell.tb = "2";
                }
              }
            }
          } catch (err) {
            console.warn("[afterUpdateCell] Failed to set wrap text tb: 2:", err);
          }
        },
      }),
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
            <span>Klik ganda untuk edit sel</span>
            <span className="hidden sm:inline">•</span>
            <span className="hidden sm:inline">
              <b>Ctrl+Enter</b>: Baris Baru
            </span>
            <span className="hidden sm:inline">•</span>
            <span className="hidden sm:inline">
              <b>Ctrl+S</b>: Simpan
            </span>
            <span className="hidden lg:inline">•</span>
            <span className="hidden lg:inline">
              Pilih sel lalu gunakan toolbar untuk <b>Tebal (Bold)</b>, <b>Warna Sel</b>, dan <b>Merge Cells</b>
            </span>
          </div>
          <div className="text-[10px] font-mono text-muted-foreground/80 hidden md:block">
            Klik kanan untuk menu Baris &amp; Kolom
          </div>
        </div>

        {/* Rich FortuneSheet Canvas Container */}
        <div
          ref={containerRef}
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
            hooks={workbookHooks}
          />
        </div>
      </div>
    );
  }
);
