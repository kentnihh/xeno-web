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
    activeEl.isContentEditable ||
    activeEl.getAttribute("contenteditable") === "true" ||
    activeEl.id === "luckysheet-rich-text-editor" ||
    activeEl.id === "luckysheet-functionbox-cell" ||
    activeEl.classList.contains("luckysheet-cell-input") ||
    activeEl.classList.contains("fortune-rich-text-editor") ||
    activeEl.classList.contains("fortune-fx-input") ||
    activeEl.tagName === "TEXTAREA" ||
    (activeEl.tagName === "INPUT" && activeEl.getAttribute("type") !== "checkbox")
  ) {
    return true;
  }

  return false;
}

/**
 * Inserts a visual line break (<br>) at the current caret position of an active editor
 * with a single press of Ctrl+Enter (or Cmd+Enter).
 * For ContentEditable elements, inserts a <br> and a trailing placeholder <br> if at the end of the element
 * so the cursor immediately advances to the next line visually on the FIRST press.
 * Also dispatches an 'input' event so FortuneSheet synchronizes its internal state.
 */
export function insertNewlineAtCaret(targetElement?: HTMLElement | null): boolean {
  if (typeof window === "undefined") return false;
  const el = targetElement || (document.activeElement as HTMLElement | null);
  if (!el) return false;

  // Case 1: Standard textarea or input element
  const isInputOrTextarea =
    (typeof HTMLTextAreaElement !== "undefined" && el instanceof HTMLTextAreaElement) ||
    (typeof HTMLInputElement !== "undefined" && el instanceof HTMLInputElement) ||
    el.tagName === "TEXTAREA" ||
    (el.tagName === "INPUT" && el.getAttribute?.("type") !== "checkbox");

  if (isInputOrTextarea) {
    const inputEl = el as HTMLTextAreaElement | HTMLInputElement;
    const start = inputEl.selectionStart ?? (inputEl.value?.length || 0);
    const end = inputEl.selectionEnd ?? (inputEl.value?.length || 0);
    const value = inputEl.value || "";
    inputEl.value = value.slice(0, start) + "\n" + value.slice(end);
    inputEl.selectionStart = inputEl.selectionEnd = start + 1;
    inputEl.dispatchEvent(new Event("input", { bubbles: true }));
    return true;
  }

  // Case 2: ContentEditable div (FortuneSheet rich text editor / formula box)
  const isContentEditable =
    el.isContentEditable ||
    el.getAttribute("contenteditable") === "true" ||
    el.id === "luckysheet-rich-text-editor" ||
    el.id === "luckysheet-functionbox-cell" ||
    el.classList.contains("luckysheet-cell-input") ||
    el.classList.contains("fortune-rich-text-editor") ||
    el.classList.contains("fortune-fx-input");

  if (isContentEditable) {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();

      const br = document.createElement("br");
      range.insertNode(br);

      // If the <br> is at the very end of the contenteditable, browsers need a trailing <br>
      // so the new line is immediately visible on the FIRST press:
      const isAtEnd =
        !br.nextSibling ||
        (br.nextSibling.nodeType === Node.TEXT_NODE && (br.nextSibling.textContent || "").trim() === "");

      if (isAtEnd) {
        const extraBr = document.createElement("br");
        extraBr.setAttribute("data-fortune-placeholder", "true");
        br.parentNode?.insertBefore(extraBr, br.nextSibling);
      }

      range.setStartAfter(br);
      range.setEndAfter(br);
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      const br = document.createElement("br");
      el.appendChild(br);
      const extraBr = document.createElement("br");
      extraBr.setAttribute("data-fortune-placeholder", "true");
      el.appendChild(extraBr);
    }

    // Always dispatch input event so ContentEditable onChange fires and synchronizes state
    el.dispatchEvent(new Event("input", { bubbles: true }));
    return true;
  }

  return false;
}

/**
 * Cleans up any trailing layout placeholder <br> elements from the active cell editor
 * before FortuneSheet commits the cell value.
 */
export function cleanEditorOnCommit(targetElement?: HTMLElement | null): void {
  if (typeof window === "undefined") return;
  const activeEl = targetElement || (document.activeElement as HTMLElement | null);
  if (!activeEl) return;

  const isContentEditable =
    activeEl.isContentEditable ||
    activeEl.getAttribute("contenteditable") === "true" ||
    activeEl.id === "luckysheet-rich-text-editor" ||
    activeEl.id === "luckysheet-functionbox-cell" ||
    activeEl.classList.contains("luckysheet-cell-input") ||
    activeEl.classList.contains("fortune-rich-text-editor") ||
    activeEl.classList.contains("fortune-fx-input");

  if (!isContentEditable) return;

  // Remove explicit data-fortune-placeholder element if present
  try {
    const placeholders = activeEl.querySelectorAll('[data-fortune-placeholder="true"]');
    placeholders.forEach((p) => p.remove());

    // If the very last child is a duplicate trailing <br> following another <br>, remove it
    const children = Array.from(activeEl.childNodes);
    if (children.length >= 2) {
      const last = children[children.length - 1];
      const prev = children[children.length - 2];
      if (last.nodeName === "BR" && prev.nodeName === "BR") {
        last.remove();
      }
    }
  } catch (err) {
    console.warn("[cleanEditorOnCommit] Failed cleaning placeholder <br>:", err);
  }
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

/**
 * Detects whether an element or any of its parents is the toolbar Bold button ('B').
 */
export function isToolbarBoldButton(target: HTMLElement | null): boolean {
  if (!target) return false;
  const btn = target.closest<HTMLElement>(".fortune-toolbar-button, [role='button'], button");
  if (!btn) return false;

  const tips = (
    btn.getAttribute("data-tips") ||
    btn.getAttribute("aria-label") ||
    btn.getAttribute("title") ||
    ""
  ).toLowerCase();
  if (tips.includes("bold") || tips === "b" || tips === "tebal") return true;

  const svgUse = btn.querySelector("svg use");
  if (svgUse) {
    const href = (
      svgUse.getAttribute("href") ||
      svgUse.getAttribute("xlink:href") ||
      ""
    ).toLowerCase();
    if (href.includes("bold")) return true;
  }

  const svg = btn.querySelector("svg");
  if (svg?.classList.contains("fortune-icon-bold") || svg?.getAttribute("name") === "bold") {
    return true;
  }

  return false;
}

/**
 * Returns the currently active cell editor element in the DOM (e.g. .fortune-rich-text-editor).
 */
export function getActiveCellEditor(): HTMLElement | null {
  if (typeof window === "undefined") return null;
  const activeEl = document.activeElement as HTMLElement | null;
  if (!activeEl) return null;

  if (
    activeEl.isContentEditable ||
    activeEl.getAttribute("contenteditable") === "true" ||
    activeEl.id === "luckysheet-rich-text-editor" ||
    activeEl.id === "luckysheet-functionbox-cell" ||
    activeEl.classList.contains("luckysheet-cell-input") ||
    activeEl.classList.contains("fortune-rich-text-editor") ||
    activeEl.classList.contains("fortune-fx-input")
  ) {
    return activeEl;
  }

  const editor = document.querySelector<HTMLElement>(
    "#luckysheet-rich-text-editor, .fortune-rich-text-editor"
  );
  if (editor && (editor === activeEl || editor.contains(activeEl))) {
    return editor;
  }

  return null;
}

/**
 * Checks whether text is currently selected inside the active cell editor.
 */
export function hasActiveTextSelectionInEditor(editorElement?: HTMLElement | null): boolean {
  if (typeof window === "undefined") return false;
  const editor = editorElement || getActiveCellEditor();
  if (!editor) return false;

  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return false;
  const text = selection.toString();
  if (!text || text.length === 0) return false;

  const range = selection.getRangeAt(0);
  return editor.contains(range.commonAncestorContainer);
}

interface TextCharRecord {
  char: string;
  isBr: boolean;
  isPlaceholderBr?: boolean;
  bold: boolean;
  italic?: boolean;
  color?: string;
  fs?: number;
}

/**
 * Applies partial inline bold formatting to the active text selection inside a cell editor.
 * Reconstructs all text content as structured <span> elements so that FortuneSheet's
 * convertSpanToShareString accurately extracts cell.ct.s without flattening or dropping text.
 */
export function toggleInlineBoldOnSelection(editorElement?: HTMLElement | null): boolean {
  if (typeof window === "undefined") return false;
  const editor = editorElement || getActiveCellEditor();
  if (!editor) return false;

  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return false;
  const range = selection.getRangeAt(0);
  if (!editor.contains(range.commonAncestorContainer)) return false;

  const selectedText = selection.toString();
  if (!selectedText) return false;

  // Flatten the editor's DOM into an array of styled character records
  const chars: TextCharRecord[] = [];
  let selStart = -1;
  let selEnd = -1;

  function walk(node: Node) {
    if (node === range.startContainer && node.nodeType === Node.TEXT_NODE) {
      selStart = chars.length + range.startOffset;
    }
    if (node === range.endContainer && node.nodeType === Node.TEXT_NODE) {
      selEnd = chars.length + range.endOffset;
    }

    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || "";
      let cur = node.parentElement;
      let bold = false;
      let italic = false;
      let color: string | undefined;
      let fs: number | undefined;

      while (cur && cur !== editor) {
        const fw = (cur.style.fontWeight || "").toLowerCase();
        if (
          fw === "bold" ||
          fw === "700" ||
          fw === "800" ||
          fw === "900" ||
          cur.tagName === "B" ||
          cur.tagName === "STRONG"
        ) {
          bold = true;
        }
        const fstyle = (cur.style.fontStyle || "").toLowerCase();
        if (fstyle === "italic" || cur.tagName === "I" || cur.tagName === "EM") {
          italic = true;
        }
        if (cur.style.color) color = cur.style.color;
        if (cur.style.fontSize) {
          const parsedFs = parseInt(cur.style.fontSize, 10);
          if (!isNaN(parsedFs)) fs = parsedFs;
        }
        cur = cur.parentElement;
      }

      for (let i = 0; i < text.length; i++) {
        chars.push({ char: text[i], isBr: false, bold, italic, color, fs });
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      if (el.tagName === "BR") {
        const isPlaceholder = el.getAttribute("data-fortune-placeholder") === "true";
        chars.push({ char: "\n", isBr: true, isPlaceholderBr: isPlaceholder, bold: false });
      } else {
        const childList = Array.from(node.childNodes);
        for (let i = 0; i < childList.length; i++) {
          if (node === range.startContainer && i === range.startOffset) {
            selStart = chars.length;
          }
          if (node === range.endContainer && i === range.endOffset) {
            selEnd = chars.length;
          }
          walk(childList[i]);
        }
        if (node === range.startContainer && range.startOffset >= childList.length) {
          selStart = chars.length;
        }
        if (node === range.endContainer && range.endOffset >= childList.length) {
          selEnd = chars.length;
        }
      }
    }
  }

  walk(editor);

  // Fallback to substring matching if offsets could not be resolved from DOM range
  if (selStart === -1 || selEnd === -1 || selStart >= selEnd) {
    const fullText = chars.map((c) => c.char).join("");
    const idx = fullText.indexOf(selectedText);
    if (idx !== -1) {
      selStart = idx;
      selEnd = idx + selectedText.length;
    } else {
      return false;
    }
  }

  // Determine toggle target: if all selected non-br characters are bold, unbold them; else bold them
  const selectedSlice = chars.slice(selStart, selEnd).filter((c) => !c.isBr);
  const allAreBold = selectedSlice.length > 0 && selectedSlice.every((c) => c.bold);
  const targetBold = !allAreBold;

  for (let i = selStart; i < selEnd; i++) {
    if (!chars[i].isBr) {
      chars[i].bold = targetBold;
    }
  }

  // Group characters into contiguous runs with identical styling
  interface ContiguousRun {
    isBr: boolean;
    isPlaceholderBr?: boolean;
    text: string;
    bold: boolean;
    italic?: boolean;
    color?: string;
    fs?: number;
    charStart: number;
    charEnd: number;
  }

  const runs: ContiguousRun[] = [];
  let curRun: ContiguousRun | null = null;

  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    if (c.isBr) {
      if (curRun) {
        runs.push(curRun);
        curRun = null;
      }
      runs.push({
        isBr: true,
        isPlaceholderBr: c.isPlaceholderBr,
        text: "\n",
        bold: false,
        charStart: i,
        charEnd: i + 1,
      });
      continue;
    }

    if (
      !curRun ||
      curRun.bold !== c.bold ||
      curRun.italic !== c.italic ||
      curRun.color !== c.color ||
      curRun.fs !== c.fs
    ) {
      if (curRun) runs.push(curRun);
      curRun = {
        isBr: false,
        text: c.char,
        bold: c.bold,
        italic: c.italic,
        color: c.color,
        fs: c.fs,
        charStart: i,
        charEnd: i + 1,
      };
    } else {
      curRun.text += c.char;
      curRun.charEnd = i + 1;
    }
  }
  if (curRun) runs.push(curRun);

  // Clear editor and reconstruct DOM with <span> tags for FortuneSheet compatibility
  while (editor.firstChild) {
    editor.removeChild(editor.firstChild);
  }

  const createdNodes: { node: Node; run: ContiguousRun }[] = [];

  for (const r of runs) {
    if (r.isBr) {
      const br = document.createElement("br");
      if (r.isPlaceholderBr) {
        br.setAttribute("data-fortune-placeholder", "true");
      }
      editor.appendChild(br);
      createdNodes.push({ node: br, run: r });
    } else {
      const span = document.createElement("span");
      span.style.fontWeight = r.bold ? "bold" : "normal";
      if (r.italic) span.style.fontStyle = "italic";
      if (r.color) span.style.color = r.color;
      if (r.fs) span.style.fontSize = `${r.fs}pt`;
      span.textContent = r.text;
      editor.appendChild(span);
      createdNodes.push({ node: span, run: r });
    }
  }

  // Restore selection around the targeted substring
  try {
    let startNode: Node | null = null;
    let startOffsetInNode = 0;
    let endNode: Node | null = null;
    let endOffsetInNode = 0;

    for (const item of createdNodes) {
      const { node, run } = item;
      if (run.isBr) continue;
      const textNode = node.firstChild || node;

      if (!startNode && selStart >= run.charStart && selStart <= run.charEnd) {
        startNode = textNode;
        startOffsetInNode = Math.min(selStart - run.charStart, run.text.length);
      }
      if (!endNode && selEnd >= run.charStart && selEnd <= run.charEnd) {
        endNode = textNode;
        endOffsetInNode = Math.min(selEnd - run.charStart, run.text.length);
      }
    }

    if (startNode && endNode) {
      const newRange = document.createRange();
      newRange.setStart(startNode, startOffsetInNode);
      newRange.setEnd(endNode, endOffsetInNode);
      selection.removeAllRanges();
      selection.addRange(newRange);
    }
  } catch (err) {
    console.warn("[toggleInlineBoldOnSelection] Error restoring selection:", err);
  }

  // Dispatch input event so FortuneSheet and any listeners know the cell editor changed
  editor.dispatchEvent(new Event("input", { bubbles: true }));
  return true;
}
