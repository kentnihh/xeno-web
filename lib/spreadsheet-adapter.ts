import type { SheetData, SheetColumn, SheetRow } from "@/types/database";
import type { Sheet } from "@fortune-sheet/core";

import { INITIAL_EVENT_SHEETS } from "./constants/event-sheets";

/**
 * Safely extracts text content from any cell representation (plain value, rich cell object, or inlineStr).
 */
export function extractCellText(cell: any): string {
  if (cell === null || cell === undefined) return "";
  if (typeof cell !== "object") return String(cell);
  if (cell.m !== undefined && cell.m !== null) return String(cell.m);
  if (cell.v !== undefined && cell.v !== null) return String(cell.v);
  if (cell.ct?.t === "inlineStr" && Array.isArray(cell.ct.s)) {
    return cell.ct.s.map((item: any) => item?.v ?? "").join("");
  }
  return "";
}

/**
 * Normalizes a cell object for FortuneSheet, ensuring multiline strings (\n or \r\n)
 * are configured with inlineStr and text wrap (tb: "2") so they display visual line breaks
 * and never lose data across serialization/deserialization cycles.
 */
export function normalizeCellForFortuneSheet(cell: any): any {
  if (cell === null || cell === undefined) return null;
  if (typeof cell !== "object") {
    const str = String(cell);
    return { v: cell, m: str };
  }

  const clone: Record<string, any> = { ...cell };
  const text = extractCellText(clone);

  // If text contains newline characters (\n or \r\n), ensure FortuneSheet inlineStr & text-wrap
  if (typeof text === "string" && (text.includes("\n") || text.includes("\r"))) {
    // FortuneSheet uses \r\n internally for inline string rendering
    const normalizedText = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\n/g, "\r\n");
    clone.v = normalizedText;
    clone.m = normalizedText;
    clone.tb = "2"; // wrap text
    if (!clone.ct || clone.ct.t !== "inlineStr") {
      clone.ct = {
        t: "inlineStr",
        fa: "General",
        s: [{ v: normalizedText, fs: clone.fs || 11 }],
      };
    } else if (Array.isArray(clone.ct.s)) {
      if (clone.ct.s.length === 0) {
        clone.ct.s = [{ v: normalizedText, fs: clone.fs || 11 }];
      } else {
        // Ensure child strings preserve normalized text
        clone.ct.s = clone.ct.s.map((s: any) => ({
          ...s,
          v: typeof s?.v === "string" ? s.v.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\n/g, "\r\n") : s?.v,
        }));
      }
    }
  } else if (clone.ct?.t === "inlineStr" && Array.isArray(clone.ct.s)) {
    // Ensure v and m are populated when inlineStr exists
    if (clone.v === undefined || clone.v === null) {
      clone.v = text;
      clone.m = text;
    }
  }

  return clone;
}

/**
 * Safely parses any sheet data payload if passed as a JSON string,
 * with fallback repair for unescaped control characters (such as literal newlines).
 */
export function parseSheetData(input: unknown): any {
  if (!input) return null;
  if (typeof input === "string") {
    try {
      return JSON.parse(input);
    } catch {
      try {
        // Repair literal unescaped control characters in JSON string literals
        const repaired = input
          .replace(/(?<!\\)\r\n/g, "\\r\\n")
          .replace(/(?<!\\)\n/g, "\\n")
          .replace(/(?<!\\)\r/g, "\\r")
          .replace(/(?<!\\)\t/g, "\\t");
        return JSON.parse(repaired);
      } catch (err2) {
        console.warn("[parseSheetData] Failed to parse sheet JSON string:", err2);
        return null;
      }
    }
  }
  return input;
}

/**
 * Sanitizes and prepares a sheet payload for safe JSON serialization and persistence.
 * Guarantees that multiline cell strings and rich formatting are preserved and round-trippable.
 */
export function sanitizeSheetData(sheetData: SheetData | unknown): SheetData {
  const parsed = parseSheetData(sheetData);
  if (!parsed || typeof parsed !== "object") {
    return (sheetData as SheetData) || ({ columns: [], rows: [] } as any);
  }

  const obj = JSON.parse(JSON.stringify(parsed));

  // Sanitize 2D matrix if present
  if (Array.isArray(obj.data) && obj.data.length > 0) {
    for (let r = 0; r < obj.data.length; r++) {
      if (Array.isArray(obj.data[r])) {
        for (let c = 0; c < obj.data[r].length; c++) {
          if (obj.data[r][c]) {
            obj.data[r][c] = normalizeCellForFortuneSheet(obj.data[r][c]);
          }
        }
      }
    }
    // Synchronize celldata from 2D matrix
    obj.celldata = matrixToCelldata(obj.data);
  } else if (Array.isArray(obj.celldata) && obj.celldata.length > 0) {
    obj.celldata = obj.celldata.map((item: any) => ({
      r: item.r,
      c: item.c,
      v: normalizeCellForFortuneSheet(item.v),
    }));
  }

  return obj as SheetData;
}

/**
 * Converts a 2D cell matrix (data[r][c]) into FortuneSheet's celldata array format.
 * FortuneSheet's initSheetData REQUIRES celldata to initialize its canvas cells.
 */
export function matrixToCelldata(
  data: any[][]
): { r: number; c: number; v: any }[] {
  const celldata: { r: number; c: number; v: any }[] = [];
  if (!Array.isArray(data)) return celldata;

  for (let r = 0; r < data.length; r++) {
    const row = data[r];
    if (!Array.isArray(row)) continue;
    for (let c = 0; c < row.length; c++) {
      const cell = row[c];
      if (cell !== null && cell !== undefined) {
        if (typeof cell !== "object") {
          const str = String(cell);
          celldata.push({ r, c, v: normalizeCellForFortuneSheet({ v: cell, m: str }) });
        } else {
          const text = extractCellText(cell);
          const hasV = cell.v !== undefined && cell.v !== null && cell.v !== "";
          const hasM = cell.m !== undefined && cell.m !== null && cell.m !== "";
          const isInline = cell.ct?.t === "inlineStr" && Array.isArray(cell.ct.s) && cell.ct.s.length > 0;
          const hasContent = hasV || hasM || isInline || text !== "";
          const hasFormatting = cell.bg || cell.bl || cell.fc || cell.it || cell.fs || cell.ht || cell.mc || cell.f;

          if (hasContent || hasFormatting) {
            celldata.push({ r, c, v: normalizeCellForFortuneSheet(cell) });
          }
        }
      }
    }
  }
  return celldata;
}

/**
 * Checks whether the incoming data is already in FortuneSheet format.
 */
export function isFortuneSheet(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  return Boolean(
    Array.isArray(d.celldata) ||
    Array.isArray(d.data) ||
    (d.config && typeof d.config === "object")
  );
}

/**
 * Normalizes any spreadsheet payload (legacy {columns, rows} or rich FortuneSheet)
 * into a valid FortuneSheet Sheet object ready for the Workbook component.
 */
export function convertToFortuneSheet(
  rawInput: SheetData | unknown,
  sheetName = "Sheet 1",
  showGridLines?: boolean
): Sheet {
  const input = parseSheetData(rawInput);
  if (!input) {
    const defaultTpl = INITIAL_EVENT_SHEETS.find(
      (t) => t.name.trim().toLowerCase() === sheetName.trim().toLowerCase()
    );
    if (defaultTpl) {
      return convertToFortuneSheet(defaultTpl.data, sheetName, showGridLines);
    }
    return createEmptyFortuneSheet(sheetName, showGridLines !== undefined ? showGridLines : true);
  }

  // If passed an array of sheets, take the first one
  if (Array.isArray(input)) {
    return input[0]
      ? convertToFortuneSheet(input[0], sheetName, showGridLines)
      : createEmptyFortuneSheet(sheetName, showGridLines !== undefined ? showGridLines : true);
  }

  const obj = input as Record<string, unknown>;

  // Already FortuneSheet format
  if (isFortuneSheet(obj)) {
    const defaultRows = Math.max(Number(obj.row) || 30, 30);
    const defaultCols = Math.max(Number(obj.column) || 18, 18);

    // CRITICAL: FortuneSheet's internal initSheetData populates canvas cells ONLY from `celldata`.
    // If celldata is missing (e.g. after getAllSheets() returns only `data: Matrix`),
    // FortuneSheet will overwrite all cells with nulls! Reconstruct celldata from matrix if needed:
    let celldata: { r: number; c: number; v: any }[] = [];
    if (Array.isArray(obj.data) && obj.data.length > 0) {
      celldata = matrixToCelldata(obj.data as any[][]);
    } else if (Array.isArray(obj.celldata) && obj.celldata.length > 0) {
      celldata = (obj.celldata as any[]).map((item) => ({
        r: item.r,
        c: item.c,
        v: normalizeCellForFortuneSheet(item.v),
      }));
    }

    // If completely empty (0 cells) and matches a known template, fallback to default template
    if (celldata.length === 0) {
      const defaultTpl = INITIAL_EVENT_SHEETS.find(
        (t) => t.name.trim().toLowerCase() === sheetName.trim().toLowerCase()
      );
      if (defaultTpl) {
        return convertToFortuneSheet(defaultTpl.data, sheetName, showGridLines);
      }
    }

    const gridLines =
      showGridLines !== undefined
        ? showGridLines
        : obj.showGridLines !== undefined
        ? Boolean(obj.showGridLines)
        : true;

    return {
      name: (obj.name as string) || sheetName,
      id: (obj.id as string) || `sheet_${sheetName.replace(/[^a-zA-Z0-9]/g, "_")}`,
      status: 1,
      order: typeof obj.order === "number" ? obj.order : 0,
      row: defaultRows,
      column: defaultCols,
      celldata,
      data: Array.isArray(obj.data) ? (obj.data as any[][]) : undefined,
      config: obj.config ? JSON.parse(JSON.stringify(obj.config)) : {},
      showGridLines: gridLines,
    };
  }

  // Legacy { columns, rows } format
  if (Array.isArray(obj.columns) && Array.isArray(obj.rows)) {
    const columns = (obj.columns as SheetColumn[]) || [];
    const rows = (obj.rows as SheetRow[]) || [];
    const celldata: { r: number; c: number; v: any }[] = [];

    // Row 0: Column headers with bold styling and subtle background
    columns.forEach((col, cIdx) => {
      celldata.push({
        r: 0,
        c: cIdx,
        v: {
          v: col.name || `Kolom ${cIdx + 1}`,
          m: col.name || `Kolom ${cIdx + 1}`,
          bl: 1, // bold
          bg: "#f4f4f6", // soft slate header background
          ht: 0, // center aligned
          vt: 0, // center aligned
          fs: 11,
        },
      });
    });

    // Rows 1..N: Data rows
    rows.forEach((row, rIdx) => {
      columns.forEach((col, cIdx) => {
        const val = row[col.id] !== undefined && row[col.id] !== null ? String(row[col.id]) : "";
        if (val !== "") {
          celldata.push({
            r: rIdx + 1,
            c: cIdx,
            v: {
              v: val,
              m: val,
              fs: 11,
            },
          });
        }
      });
    });

    const rowCount = Math.max(rows.length + 15, 30);
    const colCount = Math.max(columns.length + 6, 18);
    const gridLines = showGridLines !== undefined ? showGridLines : true;

    return {
      name: sheetName,
      id: `sheet_${sheetName.replace(/[^a-zA-Z0-9]/g, "_")}`,
      status: 1,
      order: 0,
      row: rowCount,
      column: colCount,
      celldata,
      config: {
        merge: {},
        rowlen: { "0": 32 },
        columnlen: {},
      },
      showGridLines: gridLines,
    };
  }

  // Fallback to default template if name matches
  const defaultTpl = INITIAL_EVENT_SHEETS.find(
    (t) => t.name.trim().toLowerCase() === sheetName.trim().toLowerCase()
  );
  if (defaultTpl) {
    return convertToFortuneSheet(defaultTpl.data, sheetName, showGridLines);
  }

  return createEmptyFortuneSheet(sheetName, showGridLines !== undefined ? showGridLines : true);
}

/**
 * Creates a blank FortuneSheet with sensible defaults.
 */
function createEmptyFortuneSheet(name: string, showGridLines = true): Sheet {
  return {
    name,
    id: `sheet_${Date.now()}`,
    status: 1,
    order: 0,
    row: 30,
    column: 18,
    celldata: [],
    config: {
      merge: {},
      rowlen: {},
      columnlen: {},
    },
    showGridLines,
  };
}

/**
 * Converts any sheet payload (rich FortuneSheet or legacy grid) into an array of arrays (AOA),
 * merged ranges, and column widths suitable for XLSX generation.
 */
export function sheetToAoaAndMerges(sheetPayload: SheetData | unknown): {
  aoa: (string | number)[][];
  merges: { s: { r: number; c: number }; e: { r: number; c: number } }[];
  colWidths: { wch: number }[];
} {
  const sheetObj = convertToFortuneSheet(sheetPayload);
  const merges: { s: { r: number; c: number }; e: { r: number; c: number } }[] = [];

  // Extract merged cells
  if (sheetObj.config?.merge) {
    for (const key of Object.keys(sheetObj.config.merge)) {
      const m = sheetObj.config.merge[key];
      if (m && typeof m.r === "number" && typeof m.c === "number") {
        merges.push({
          s: { r: m.r, c: m.c },
          e: {
            r: m.r + (m.rs || 1) - 1,
            c: m.c + (m.cs || 1) - 1,
          },
        });
      }
    }
  }

  // 1. If 2D matrix data is available
  if (Array.isArray(sheetObj.data) && sheetObj.data.length > 0) {
    // Find effective bounds so we don't output 1000 empty rows
    let maxR = 0;
    let maxC = 0;

    sheetObj.data.forEach((row, r) => {
      if (Array.isArray(row)) {
        row.forEach((cell, c) => {
          const text = extractCellText(cell);
          if (cell && (text !== "" || cell.bg || cell.bl)) {
            if (r > maxR) maxR = r;
            if (c > maxC) maxC = c;
          }
        });
      }
    });

    const aoa: (string | number)[][] = [];
    for (let r = 0; r <= maxR; r++) {
      const rowArr: (string | number)[] = [];
      const sourceRow = sheetObj.data[r] || [];
      for (let c = 0; c <= maxC; c++) {
        const cell = sourceRow[c];
        const val = extractCellText(cell);
        rowArr.push(val);
      }
      aoa.push(rowArr);
    }

    const colWidths = computeColWidths(aoa);
    return { aoa: aoa.length > 0 ? aoa : [[""]], merges, colWidths };
  }

  // 2. If celldata is available
  if (Array.isArray(sheetObj.celldata) && sheetObj.celldata.length > 0) {
    let maxR = 0;
    let maxC = 0;

    sheetObj.celldata.forEach((item) => {
      if (item && typeof item.r === "number" && typeof item.c === "number") {
        if (item.r > maxR) maxR = item.r;
        if (item.c > maxC) maxC = item.c;
      }
    });

    const aoa: (string | number)[][] = Array.from({ length: maxR + 1 }, () =>
      Array(maxC + 1).fill("")
    );

    sheetObj.celldata.forEach((item) => {
      if (item && typeof item.r === "number" && typeof item.c === "number") {
        const val = extractCellText(item.v);
        if (aoa[item.r]) {
          aoa[item.r][item.c] = val;
        }
      }
    });

    const colWidths = computeColWidths(aoa);
    return { aoa: aoa.length > 0 ? aoa : [[""]], merges, colWidths };
  }

  return { aoa: [[""]], merges, colWidths: [{ wch: 15 }] };
}

function computeColWidths(aoa: (string | number)[][]): { wch: number }[] {
  if (aoa.length === 0) return [];
  const colCount = Math.max(...aoa.map((r) => r.length));
  const widths: { wch: number }[] = [];

  for (let c = 0; c < colCount; c++) {
    let maxLen = 8;
    for (let r = 0; r < aoa.length; r++) {
      const val = aoa[r][c];
      const strLen = val !== undefined && val !== null ? String(val).length : 0;
      if (strLen > maxLen) maxLen = strLen;
    }
    widths.push({ wch: Math.min(Math.max(maxLen + 4, 12), 50) });
  }

  return widths;
}
