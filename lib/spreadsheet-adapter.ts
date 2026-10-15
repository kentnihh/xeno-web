import type { SheetData, SheetColumn, SheetRow } from "@/types/database";
import type { Sheet } from "@fortune-sheet/core";

import { INITIAL_EVENT_SHEETS } from "./constants/event-sheets";

/**
 * Safely parses any sheet data payload if passed as a JSON string.
 */
export function parseSheetData(input: unknown): any {
  if (!input) return null;
  if (typeof input === "string") {
    try {
      return JSON.parse(input);
    } catch {
      return null;
    }
  }
  return input;
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
          celldata.push({ r, c, v: { v: cell, m: String(cell) } });
        } else if (cell.v !== undefined || cell.m !== undefined) {
          celldata.push({ r, c, v: cell });
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
  sheetName = "Sheet 1"
): Sheet {
  const input = parseSheetData(rawInput);
  if (!input) {
    const defaultTpl = INITIAL_EVENT_SHEETS.find(
      (t) => t.name.trim().toLowerCase() === sheetName.trim().toLowerCase()
    );
    if (defaultTpl) {
      return convertToFortuneSheet(defaultTpl.data, sheetName);
    }
    return createEmptyFortuneSheet(sheetName);
  }

  // If passed an array of sheets, take the first one
  if (Array.isArray(input)) {
    return input[0]
      ? convertToFortuneSheet(input[0], sheetName)
      : createEmptyFortuneSheet(sheetName);
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
    if (Array.isArray(obj.celldata) && obj.celldata.length > 0) {
      celldata = obj.celldata as any;
    } else if (Array.isArray(obj.data) && obj.data.length > 0) {
      celldata = matrixToCelldata(obj.data as any[][]);
    }

    // If completely empty (0 cells) and matches a known template, fallback to default template
    if (celldata.length === 0) {
      const defaultTpl = INITIAL_EVENT_SHEETS.find(
        (t) => t.name.trim().toLowerCase() === sheetName.trim().toLowerCase()
      );
      if (defaultTpl) {
        return convertToFortuneSheet(defaultTpl.data, sheetName);
      }
    }

    return {
      name: (obj.name as string) || sheetName,
      id: (obj.id as string) || `sheet_${sheetName.replace(/[^a-zA-Z0-9]/g, "_")}`,
      status: 1,
      order: typeof obj.order === "number" ? obj.order : 0,
      row: defaultRows,
      column: defaultCols,
      celldata,
      config: (obj.config as any) || {},
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
    };
  }

  // Fallback to default template if name matches
  const defaultTpl = INITIAL_EVENT_SHEETS.find(
    (t) => t.name.trim().toLowerCase() === sheetName.trim().toLowerCase()
  );
  if (defaultTpl) {
    return convertToFortuneSheet(defaultTpl.data, sheetName);
  }

  return createEmptyFortuneSheet(sheetName);
}

/**
 * Creates a blank FortuneSheet with sensible defaults.
 */
function createEmptyFortuneSheet(name: string): Sheet {
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
          if (cell && (cell.v !== undefined && cell.v !== null && cell.v !== "")) {
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
        const val = cell && cell.v !== undefined && cell.v !== null ? (cell.v as any) : "";
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
        const val =
          item.v && item.v.v !== undefined && item.v.v !== null
            ? (item.v.v as any)
            : item.v?.m || "";
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
