/**
 * Excel Export using ExcelJS — full styling support (borders, fonts, fill, alignment).
 *
 * Converts Fortune Sheet data → ExcelJS workbook with proper border thickness,
 * colors, font styling, background fills, and merged cells.
 */

import { convertToFortuneSheet, extractCellText } from "@/lib/spreadsheet-adapter";
import {
  computeSheetBorderMap,
  resolveBorderStyle,
  type BorderSideConfig,
  type CellBorderMapItem,
} from "@/lib/pdf/spreadsheet-pdf";
import type { EventSheet } from "@/types/database";

// ────────────────────────────────────────────────────────────────────────────────
// Fortune Sheet style code → ExcelJS border style name
// ────────────────────────────────────────────────────────────────────────────────
type ExcelBorderStyle =
  | "thin"
  | "medium"
  | "thick"
  | "dotted"
  | "dashed"
  | "mediumDashed"
  | "double"
  | "hair";

function fortuneBorderToExcelStyle(
  b: BorderSideConfig | null | undefined
): { style: ExcelBorderStyle; color: { argb: string } } | undefined {
  if (!b || b.style === undefined || b.style === null) return undefined;

  const code = String(b.style).trim().toLowerCase();
  if (code === "0" || code === "none") return undefined;

  let style: ExcelBorderStyle = "thin";

  switch (code) {
    case "1":
    case "thin":
      style = "thin";
      break;
    case "2":
    case "hair":
      style = "hair";
      break;
    case "3":
    case "dotted":
      style = "dotted";
      break;
    case "4":
    case "dashed":
    case "5":
    case "6":
      style = "dashed";
      break;
    case "7":
    case "medium":
      style = "medium";
      break;
    case "8":
    case "medium-dashed":
    case "9":
    case "10":
    case "11":
      style = "mediumDashed";
      break;
    case "12":
    case "double":
      style = "double";
      break;
    case "13":
    case "thick":
      style = "thick";
      break;
    default:
      style = "thin";
      break;
  }

  // Normalize color: ExcelJS wants ARGB (e.g. "FF000000")
  let hex = (b.color || "#000000").replace("#", "").toUpperCase();
  if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
  if (hex.length === 6) hex = "FF" + hex;

  return { style, color: { argb: hex } };
}

// ────────────────────────────────────────────────────────────────────────────────
// Cell styling extraction from Fortune Sheet cell objects
// ────────────────────────────────────────────────────────────────────────────────
function normalizeArgb(hexColor: string | undefined | null): string | undefined {
  if (!hexColor) return undefined;
  let hex = hexColor.replace("#", "").toUpperCase();
  if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
  if (hex.length === 6) hex = "FF" + hex;
  return hex;
}

/**
 * Maps Fortune Sheet horizontal alignment (ht) to ExcelJS horizontal alignment.
 * Fortune Sheet: 0 = center, 1 = left, 2 = right
 */
function mapHorizontalAlignment(
  ht: number | undefined
): "left" | "center" | "right" | undefined {
  switch (ht) {
    case 0:
      return "center";
    case 1:
      return "left";
    case 2:
      return "right";
    default:
      return undefined;
  }
}

/**
 * Maps Fortune Sheet vertical alignment (vt) to ExcelJS vertical alignment.
 * Fortune Sheet: 0 = middle, 1 = top, 2 = bottom
 */
function mapVerticalAlignment(
  vt: number | undefined
): "top" | "middle" | "bottom" | undefined {
  switch (vt) {
    case 0:
      return "middle";
    case 1:
      return "top";
    case 2:
      return "bottom";
    default:
      return undefined;
  }
}

// ────────────────────────────────────────────────────────────────────────────────
// Main export function
// ────────────────────────────────────────────────────────────────────────────────
export async function exportSheetsToExcel(
  eventTitle: string,
  sheets: EventSheet[]
): Promise<void> {
  // Lazy-load ExcelJS to keep bundle small
  const ExcelJS = await import("exceljs");
  const { saveAs } = await import("file-saver");

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Xeno";
  workbook.created = new Date();

  const usedNames = new Set<string>();

  for (const sheet of sheets) {
    // Sanitize sheet name for Excel (max 31 chars, no invalid chars)
    const safeName = sheet.sheet_name
      .replace(/[:\\/?*[\]]/g, "_")
      .trim()
      .slice(0, 31) || "Sheet";

    let counter = 1;
    let finalName = safeName;
    while (usedNames.has(finalName.toLowerCase())) {
      const suffix = `_${counter}`;
      finalName = `${safeName.slice(0, 31 - suffix.length)}${suffix}`;
      counter++;
    }
    usedNames.add(finalName.toLowerCase());

    // Convert to Fortune Sheet format for consistent access
    const fortuneSheet = convertToFortuneSheet(sheet.data);
    const worksheet = workbook.addWorksheet(finalName);

    // ── Determine data bounds ──────────────────────────────────────────────
    let maxR = 0;
    let maxC = 0;

    // Build a cell lookup map from celldata or 2D data
    const cellMap = new Map<string, any>();

    if (Array.isArray(fortuneSheet.data) && fortuneSheet.data.length > 0) {
      fortuneSheet.data.forEach((row: any, r: number) => {
        if (!Array.isArray(row)) return;
        row.forEach((cell: any, c: number) => {
          if (cell !== null && cell !== undefined) {
            cellMap.set(`${r}_${c}`, cell);
            if (r > maxR) maxR = r;
            if (c > maxC) maxC = c;
          }
        });
      });
    } else if (
      Array.isArray(fortuneSheet.celldata) &&
      fortuneSheet.celldata.length > 0
    ) {
      fortuneSheet.celldata.forEach((item: any) => {
        if (item && typeof item.r === "number" && typeof item.c === "number") {
          cellMap.set(`${item.r}_${item.c}`, item.v);
          if (item.r > maxR) maxR = item.r;
          if (item.c > maxC) maxC = item.c;
        }
      });
    }

    // ── Compute border map (reuse same logic as PDF export) ────────────────
    const borderMap = computeSheetBorderMap(fortuneSheet);

    // ── Apply merged cells ─────────────────────────────────────────────────
    if (fortuneSheet.config?.merge) {
      const mergeObj = fortuneSheet.config.merge as Record<string, any>;
      for (const key of Object.keys(mergeObj)) {
        const m = mergeObj[key];
        if (m && typeof m.r === "number" && typeof m.c === "number") {
          const startRow = m.r + 1; // ExcelJS is 1-indexed
          const startCol = m.c + 1;
          const endRow = m.r + (m.rs || 1);
          const endCol = m.c + (m.cs || 1);
          try {
            worksheet.mergeCells(startRow, startCol, endRow, endCol);
          } catch {
            // Overlapping merge — skip silently
          }
        }
      }
    }

    // ── Write cells with full styling ──────────────────────────────────────
    for (let r = 0; r <= maxR; r++) {
      for (let c = 0; c <= maxC; c++) {
        const cell = cellMap.get(`${r}_${c}`);
        const excelCell = worksheet.getCell(r + 1, c + 1); // 1-indexed

        // Set value
        const text = extractCellText(cell);
        if (text !== "") {
          // Try to preserve numeric values
          const num = Number(text);
          if (text !== "" && !isNaN(num) && text.trim() === String(num)) {
            excelCell.value = num;
          } else {
            excelCell.value = text;
          }
        }

        // Apply font styling
        if (cell && typeof cell === "object") {
          const font: any = {};
          if (cell.bl === 1) font.bold = true;
          if (cell.it === 1) font.italic = true;
          if (cell.cl === 1) font.strike = true;
          if (cell.un === 1) font.underline = true;
          if (cell.fs) font.size = Number(cell.fs) || 11;
          if (cell.ff) font.name = String(cell.ff);
          if (cell.fc) {
            const argb = normalizeArgb(cell.fc);
            if (argb) font.color = { argb };
          }
          if (Object.keys(font).length > 0) {
            excelCell.font = { ...excelCell.font, ...font };
          }

          // Apply background fill
          if (cell.bg) {
            const argb = normalizeArgb(cell.bg);
            if (argb) {
              excelCell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb },
              };
            }
          }

          // Apply alignment
          const alignment: any = {};
          const hAlign = mapHorizontalAlignment(cell.ht);
          const vAlign = mapVerticalAlignment(cell.vt);
          if (hAlign) alignment.horizontal = hAlign;
          if (vAlign) alignment.vertical = vAlign;
          if (cell.tb === "2" || (text && text.includes("\n"))) {
            alignment.wrapText = true;
          }
          if (Object.keys(alignment).length > 0) {
            excelCell.alignment = alignment;
          }
        }

        // Apply borders from the computed border map
        const borderDef = borderMap.get(`${r}_${c}`);
        if (borderDef) {
          const border: any = {};
          if (borderDef.t) {
            const top = fortuneBorderToExcelStyle(borderDef.t);
            if (top) border.top = top;
          }
          if (borderDef.b) {
            const bottom = fortuneBorderToExcelStyle(borderDef.b);
            if (bottom) border.bottom = bottom;
          }
          if (borderDef.l) {
            const left = fortuneBorderToExcelStyle(borderDef.l);
            if (left) border.left = left;
          }
          if (borderDef.r) {
            const right = fortuneBorderToExcelStyle(borderDef.r);
            if (right) border.right = right;
          }
          if (Object.keys(border).length > 0) {
            excelCell.border = border;
          }
        }
      }
    }

    // ── Apply column widths ────────────────────────────────────────────────
    const columnLens = (fortuneSheet.config as any)?.columnlen;
    if (columnLens && typeof columnLens === "object") {
      for (const [colIdx, pxWidth] of Object.entries(columnLens)) {
        const col = worksheet.getColumn(Number(colIdx) + 1);
        // Fortune Sheet stores pixel width; Excel uses ~7px per character unit
        col.width = Math.max(Math.round((pxWidth as number) / 7), 8);
      }
    }
    // Set default minimum width for columns without explicit width
    for (let c = 1; c <= maxC + 1; c++) {
      const col = worksheet.getColumn(c);
      if (!col.width || col.width < 8) {
        // Auto-calculate based on content
        let maxLen = 8;
        for (let r = 0; r <= maxR; r++) {
          const cell = cellMap.get(`${r}_${c - 1}`);
          const text = extractCellText(cell);
          if (text.length > maxLen) maxLen = text.length;
        }
        col.width = Math.min(Math.max(maxLen + 2, 10), 50);
      }
    }

    // ── Apply row heights ──────────────────────────────────────────────────
    const rowLens = (fortuneSheet.config as any)?.rowlen;
    if (rowLens && typeof rowLens === "object") {
      for (const [rowIdx, pxHeight] of Object.entries(rowLens)) {
        const row = worksheet.getRow(Number(rowIdx) + 1);
        // Fortune Sheet stores pixel height; Excel uses points (1pt ≈ 1.33px)
        row.height = Math.max(Math.round((pxHeight as number) / 1.33), 15);
      }
    }
  }

  // ── Download ───────────────────────────────────────────────────────────────
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const safeTitle =
    eventTitle
      .replace(/[^a-zA-Z0-9_\-\s]/g, "")
      .trim()
      .replace(/\s+/g, "_") || "Event";
  saveAs(blob, `${safeTitle}_Data_Sheets.xlsx`);
}

