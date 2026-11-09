/**
 * Spreadsheet Auto-Fill Bounding & Keyboard Shortcut Helpers
 * Provides safe bounded autofill calculation, double-click boundary detection,
 * and keyboard shortcut handling (Ctrl+Enter / Cmd+Enter for newline, Ctrl+S for save).
 */

export const MAX_SAFE_AUTOFILL_ROWS = 50;
export const MAX_SAFE_ROW_LIMIT = 50;

/**
 * Validates and clamps a requested row count to prevent over-inserting rows.
 */
export function clampRowCount(requestedCount: number, maxLimit = MAX_SAFE_ROW_LIMIT): number {
  if (typeof requestedCount !== "number" || isNaN(requestedCount) || requestedCount < 1) {
    return 1;
  }
  return Math.min(Math.floor(requestedCount), maxLimit);
}

/**
 * Checks if a cell object or value is non-empty.
 */
export function isCellPopulated(cell: any): boolean {
  if (cell === null || cell === undefined) return false;
  if (typeof cell !== "object") {
    return String(cell).trim() !== "";
  }
  const val = cell.v ?? cell.m;
  if (val !== undefined && val !== null) {
    return String(val).trim() !== "";
  }
  if (cell.ct?.t === "inlineStr" && Array.isArray(cell.ct?.s)) {
    return cell.ct.s.some((s: any) => s?.v !== undefined && s?.v !== null && String(s.v).trim() !== "");
  }
  return false;
}

export interface SheetRange {
  row: number[] | [number, number];
  column: number[] | [number, number];
}

export interface ContiguousFillResult {
  targetRow: number;
  applyRange: {
    row: [number, number];
    column: [number, number];
  };
}

/**
 * Calculates the contiguous autofill range for double-click or bounded fill handle.
 * Bounded strictly to contiguous non-empty cells in the adjacent (or current) column,
 * clamped by maxLimit (default 50).
 * Returns null if no contiguous adjacent data exists beyond the current selection.
 */
export function calculateContiguousFillRange(
  sheetData: any[][] | undefined,
  selection: SheetRange,
  maxLimit: number = MAX_SAFE_AUTOFILL_ROWS
): ContiguousFillResult | null {
  if (!selection || !selection.row || !selection.column) return null;
  const [rStart, rEnd] = selection.row;
  const [cStart, cEnd] = selection.column;

  if (!sheetData || !Array.isArray(sheetData) || sheetData.length === 0) {
    return null;
  }

  // Determine contiguous data boundary in adjacent column
  // Prefer left column (cStart - 1) if available, otherwise right column (cEnd + 1)
  let refCol = -1;
  if (cStart > 0) {
    if (isCellPopulated(sheetData[rStart]?.[cStart - 1]) || isCellPopulated(sheetData[rEnd]?.[cStart - 1])) {
      refCol = cStart - 1;
    }
  }
  if (refCol === -1) {
    if (isCellPopulated(sheetData[rStart]?.[cEnd + 1]) || isCellPopulated(sheetData[rEnd]?.[cEnd + 1])) {
      refCol = cEnd + 1;
    }
  }
  // If neither adjacent column has data at the selection rows, fall back to current column
  if (refCol === -1) {
    refCol = cStart;
  }

  // Scan downwards from rEnd + 1 while adjacent/reference column has non-empty cells
  let contiguousLastRow = rEnd;
  const maxScanRow = Math.min(sheetData.length - 1, rEnd + maxLimit);
  for (let r = rEnd + 1; r <= maxScanRow; r++) {
    if (isCellPopulated(sheetData[r]?.[refCol])) {
      contiguousLastRow = r;
    } else {
      break;
    }
  }

  // If no populated rows exist beyond rEnd, return null so we never autofill indefinitely
  if (contiguousLastRow <= rEnd) {
    return null;
  }

  const clampedTargetRow = Math.min(contiguousLastRow, rEnd + maxLimit);
  return {
    targetRow: clampedTargetRow,
    applyRange: {
      row: [rEnd + 1, clampedTargetRow],
      column: [cStart, cEnd],
    },
  };
}

/**
 * Checks whether the currently active element in the DOM is inside a cell editor or formula input.
 */
export function isCellEditorActive(): boolean {
  if (typeof window === "undefined" || !document.activeElement) return false;
  const activeEl = document.activeElement as HTMLElement;

  if (
    activeEl.id === "luckysheet-rich-text-editor" ||
    activeEl.id === "luckysheet-functionbox-cell" ||
    activeEl.classList.contains("luckysheet-cell-input") ||
    activeEl.classList.contains("fortune-fx-input") ||
    activeEl.getAttribute("contenteditable") === "true" ||
    activeEl.tagName === "TEXTAREA" ||
    (activeEl.tagName === "INPUT" && activeEl.getAttribute("type") !== "checkbox")
  ) {
    return true;
  }

  return false;
}

/**
 * Inserts a newline character (\n) at the current caret position of an active editor
 * and dispatches an 'input' event so FortuneSheet synchronizes its internal state.
 */
export function insertNewlineAtCaret(targetElement?: HTMLElement | null): boolean {
  if (typeof window === "undefined") return false;
  const el = targetElement || (document.activeElement as HTMLElement | null);
  if (!el) return false;

  // Case 1: Standard textarea or input element
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const value = el.value;
    el.value = value.slice(0, start) + "\n" + value.slice(end);
    el.selectionStart = el.selectionEnd = start + 1;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    return true;
  }

  // Case 2: ContentEditable div (FortuneSheet rich text editor / formula box)
  const isContentEditable =
    el.getAttribute("contenteditable") === "true" ||
    el.id === "luckysheet-rich-text-editor" ||
    el.id === "luckysheet-functionbox-cell" ||
    el.classList.contains("luckysheet-cell-input") ||
    el.classList.contains("fortune-fx-input");

  if (isContentEditable) {
    const sel = window.getSelection();
    let handled = false;
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      try {
        handled = document.execCommand("insertText", false, "\n");
      } catch {
        handled = false;
      }
      if (!handled) {
        const textNode = document.createTextNode("\n");
        range.insertNode(textNode);
        range.setStartAfter(textNode);
        range.setEndAfter(textNode);
        sel.removeAllRanges();
        sel.addRange(range);
        handled = true;
      }
    } else {
      // Fallback: append newline if no selection range
      el.textContent = (el.textContent || "") + "\n";
    }

    // Always dispatch input event so ContentEditable onChange fires and synchronizes state
    el.dispatchEvent(new Event("input", { bubbles: true }));
    return true;
  }

  return false;
}

/**
 * Builds cumulative visible row heights for coordinate-to-row mapping.
 */
export function buildVisibleRowHeights(
  rowCount: number,
  rowlen?: Record<string | number, number>,
  defaultRowHeight: number = 20
): number[] {
  const visibleRows: number[] = new Array(rowCount);
  let cumulative = 0;
  for (let r = 0; r < rowCount; r++) {
    const h = rowlen?.[r] ?? rowlen?.[String(r)] ?? defaultRowHeight;
    cumulative += h;
    visibleRows[r] = cumulative;
  }
  return visibleRows;
}

/**
 * Builds cumulative visible column widths for coordinate-to-col mapping.
 */
export function buildVisibleColWidths(
  colCount: number,
  columnlen?: Record<string | number, number>,
  defaultColWidth: number = 74
): number[] {
  const visibleCols: number[] = new Array(colCount);
  let cumulative = 0;
  for (let c = 0; c < colCount; c++) {
    const w = columnlen?.[c] ?? columnlen?.[String(c)] ?? defaultColWidth;
    cumulative += w;
    visibleCols[c] = cumulative;
  }
  return visibleCols;
}

/**
 * Derives target row index strictly from relative Y coordinate (pixels inside cell area).
 * Returns the exact row directly underneath the cursor.
 */
export function getRowByCoordinate(relativeY: number, visibleRows: number[]): number {
  if (relativeY <= 0) return 0;
  for (let r = 0; r < visibleRows.length; r++) {
    if (relativeY < visibleRows[r]) {
      return r;
    }
  }
  return Math.max(0, visibleRows.length - 1);
}

/**
 * Derives target column index strictly from relative X coordinate (pixels inside cell area).
 * Returns the exact column directly underneath the cursor.
 */
export function getColByCoordinate(relativeX: number, visibleCols: number[]): number {
  if (relativeX <= 0) return 0;
  for (let c = 0; c < visibleCols.length; c++) {
    if (relativeX < visibleCols[c]) {
      return c;
    }
  }
  return Math.max(0, visibleCols.length - 1);
}

export interface MarqueeBounds {
  top: number;
  height: number;
  left: number;
  width: number;
  targetRow: number;
  targetCol: number;
  direction: "down" | "up" | "right" | "left" | "none";
}

/**
 * Computes exact marquee bounding box dimensions strictly according to user cursor:
 * Top: always anchors to the start of the current selection.
 * Bottom: Math.max(selection.rowEnd, currentHoveredRow).
 * When cursor is on row 7, the dashed box MUST stop exactly at row 7.
 */
export function calculateMarqueeBounds(
  selection: SheetRange,
  currentHoveredRow: number,
  currentHoveredCol: number,
  visibleRows: number[],
  visibleCols: number[]
): MarqueeBounds {
  const rStart = selection.row[0];
  const rEnd = selection.row[1];
  const cStart = selection.column[0];
  const cEnd = selection.column[1];

  const selTop = rStart === 0 ? 0 : visibleRows[rStart - 1];
  const selBottom = visibleRows[rEnd];
  const selLeft = cStart === 0 ? 0 : visibleCols[cStart - 1];
  const selRight = visibleCols[cEnd];

  const rowDeltaDown = currentHoveredRow - rEnd;
  const rowDeltaUp = rStart - currentHoveredRow;
  const colDeltaRight = currentHoveredCol - cEnd;
  const colDeltaLeft = cStart - currentHoveredCol;

  const maxRowDelta = Math.max(rowDeltaDown, rowDeltaUp, 0);
  const maxColDelta = Math.max(colDeltaRight, colDeltaLeft, 0);

  if (maxRowDelta >= maxColDelta) {
    if (currentHoveredRow > rEnd) {
      // Dragging downward: anchor top to start of selection, bottom to currentHoveredRow
      const targetRow = Math.max(rEnd, currentHoveredRow);
      const targetBottom = visibleRows[targetRow];
      return {
        top: selTop,
        height: Math.max(0, targetBottom - selTop - 1),
        left: selLeft,
        width: Math.max(0, selRight - selLeft - 1),
        targetRow,
        targetCol: cEnd,
        direction: "down",
      };
    } else if (currentHoveredRow < rStart) {
      // Dragging upward: anchor top to currentHoveredRow, bottom to end of selection
      const targetRow = currentHoveredRow;
      const targetTop = targetRow === 0 ? 0 : visibleRows[targetRow - 1];
      return {
        top: targetTop,
        height: Math.max(0, selBottom - targetTop - 1),
        left: selLeft,
        width: Math.max(0, selRight - selLeft - 1),
        targetRow,
        targetCol: cEnd,
        direction: "up",
      };
    } else {
      return {
        top: selTop,
        height: Math.max(0, selBottom - selTop - 1),
        left: selLeft,
        width: Math.max(0, selRight - selLeft - 1),
        targetRow: rEnd,
        targetCol: cEnd,
        direction: "none",
      };
    }
  } else {
    if (currentHoveredCol > cEnd) {
      // Dragging rightward
      const targetCol = currentHoveredCol;
      const targetRight = visibleCols[targetCol];
      return {
        top: selTop,
        height: Math.max(0, selBottom - selTop - 1),
        left: selLeft,
        width: Math.max(0, targetRight - selLeft - 1),
        targetRow: rEnd,
        targetCol,
        direction: "right",
      };
    } else if (currentHoveredCol < cStart) {
      // Dragging leftward
      const targetCol = currentHoveredCol;
      const targetLeft = targetCol === 0 ? 0 : visibleCols[targetCol - 1];
      return {
        top: selTop,
        height: Math.max(0, selBottom - selTop - 1),
        left: targetLeft,
        width: Math.max(0, selRight - targetLeft - 1),
        targetRow: rEnd,
        targetCol,
        direction: "left",
      };
    } else {
      return {
        top: selTop,
        height: Math.max(0, selBottom - selTop - 1),
        left: selLeft,
        width: Math.max(0, selRight - selLeft - 1),
        targetRow: rEnd,
        targetCol: cEnd,
        direction: "none",
      };
    }
  }
}

/**
 * Calculates synthetic client coordinates so that FortuneSheet's internal onDropCellSelectEnd
 * maps precisely to targetRow and targetCol without window.scrollY or navbar offsets.
 */
export function calculateCalibratedMouseCoordinates(
  targetRow: number,
  targetCol: number,
  visibleRows: number[],
  visibleCols: number[],
  overlayRect: { top: number; left: number },
  scrollTop: number = 0,
  scrollLeft: number = 0,
  windowScrollY: number = 0,
  windowScrollX: number = 0,
  columnHeaderHeight: number = 20,
  rowHeaderWidth: number = 46
): { clientX: number; clientY: number } {
  const rowPre = targetRow === 0 ? 0 : visibleRows[targetRow - 1];
  const rowPost = visibleRows[targetRow];
  const midY = (rowPre + rowPost) / 2;

  const colPre = targetCol === 0 ? 0 : visibleCols[targetCol - 1];
  const colPost = visibleCols[targetCol];
  const midX = (colPre + colPost) / 2;

  // FortuneSheet computes: y = e.pageY - overlayRect.top - columnHeaderHeight + scrollTop
  // In browser: e.pageY = clientY + windowScrollY
  // Setting clientY = midY + overlayRect.top + columnHeaderHeight - scrollTop - windowScrollY
  // gives FortuneSheet: y === midY (strictly corresponding to targetRow).
  const clientY = midY + overlayRect.top + columnHeaderHeight - scrollTop - windowScrollY;
  const clientX = midX + overlayRect.left + rowHeaderWidth - scrollLeft - windowScrollX;

  return { clientX, clientY };
}
