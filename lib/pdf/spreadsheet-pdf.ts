import { jsPDF } from "jspdf";
import rawAutoTable, { type UserOptions } from "jspdf-autotable";
import { convertToFortuneSheet, extractCellText } from "@/lib/spreadsheet-adapter";
import { formatDate } from "@/lib/utils";
import type {
  EventSheet,
  EventPublicForm,
  EventFormData,
  FormCategorySchema,
} from "@/types/database";
import { DEFAULT_PUBLIC_FORM_SCHEMA } from "@/lib/constants/public-forms";
import {
  montserratRegularBase64,
  montserratBoldBase64,
} from "@/lib/fonts/Montserrat-base64";

const autoTable = (
  typeof rawAutoTable === "function"
    ? rawAutoTable
    : (rawAutoTable as any).default || (rawAutoTable as any).autoTable
) as typeof rawAutoTable;

export interface GenerateSpreadsheetPdfOptions {
  eventTitle: string;
  sheets: EventSheet[];
  orientation?: "landscape" | "portrait";
  customFilename?: string;
  logoDataUrl?: string | null;
  includeFamilyData?: boolean;
  familyData?: EventPublicForm | null;
}

let cachedLogoDataUrl: string | null = null;

/**
 * Embeds Montserrat font (Regular, Bold, Italic, BoldItalic) into jsPDF Virtual File System (VFS)
 * and activates it as the active default font.
 */
export function registerMontserratFont(doc: jsPDF): void {
  try {
    // 1. Add Regular font to jsPDF Virtual File System (VFS)
    doc.addFileToVFS("Montserrat-Regular.ttf", montserratRegularBase64);
    doc.addFont("Montserrat-Regular.ttf", "Montserrat", "normal");
    doc.addFont("Montserrat-Regular.ttf", "Montserrat", "italic");

    // 2. Add Bold font to jsPDF Virtual File System (VFS)
    doc.addFileToVFS("Montserrat-Bold.ttf", montserratBoldBase64);
    doc.addFont("Montserrat-Bold.ttf", "Montserrat", "bold");
    doc.addFont("Montserrat-Bold.ttf", "Montserrat", "bolditalic");

    // 3. Set Montserrat as the active default font
    doc.setFont("Montserrat", "normal");
  } catch (err) {
    console.warn("[registerMontserratFont] Error embedding Montserrat font in jsPDF:", err);
  }
}

/**
 * Synchronously retrieves the base64 data URL for /logo-xeno.png in Node.js environments.
 */
export function getSyncLogoDataUrl(): string | null {
  if (cachedLogoDataUrl) return cachedLogoDataUrl;
  if (typeof window === "undefined") {
    try {
      const fs = eval("require")("node:fs");
      const path = eval("require")("node:path");
      const logoPath = path.join(process.cwd(), "public", "logo-xeno.png");
      if (fs.existsSync(logoPath)) {
        const buffer = fs.readFileSync(logoPath);
        cachedLogoDataUrl = `data:image/png;base64,${buffer.toString("base64")}`;
        return cachedLogoDataUrl;
      }
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Loads the official /logo-xeno.png using fetch and an off-screen canvas to obtain a clean PNG data URL,
 * suitable for jsPDF's doc.addImage().
 */
export async function getLogoDataUrl(): Promise<string | null> {
  if (cachedLogoDataUrl) return cachedLogoDataUrl;

  if (typeof window !== "undefined") {
    try {
      // 1. Fetch the image as a Blob
      const response = await fetch("/logo-xeno.png");
      if (!response.ok) {
        throw new Error(`Failed to fetch logo: HTTP ${response.status}`);
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);

      // 2. Load into HTMLImageElement
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = (e) => reject(e);
        img.src = objectUrl;
      });

      // 3. Draw to a temporary canvas and obtain standard PNG data URL
      const canvas = document.createElement("canvas");
      const naturalWidth = img.naturalWidth || img.width || 400;
      const naturalHeight = img.naturalHeight || img.height || 400;
      canvas.width = naturalWidth;
      canvas.height = naturalHeight;

      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0, naturalWidth, naturalHeight);
        cachedLogoDataUrl = canvas.toDataURL("image/png");
      }

      URL.revokeObjectURL(objectUrl);
      if (cachedLogoDataUrl) return cachedLogoDataUrl;
    } catch (fetchErr) {
      console.warn("[getLogoDataUrl] Fetch failed, falling back to Image load:", fetchErr);
    }

    // Fallback: direct Image load if fetch is unavailable
    return new Promise((resolve) => {
      try {
        const fallbackImg = new Image();
        fallbackImg.crossOrigin = "anonymous";
        fallbackImg.onload = () => {
          try {
            const canvas = document.createElement("canvas");
            const w = fallbackImg.naturalWidth || 400;
            const h = fallbackImg.naturalHeight || 400;
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(fallbackImg, 0, 0, w, h);
              cachedLogoDataUrl = canvas.toDataURL("image/png");
              resolve(cachedLogoDataUrl);
              return;
            }
            resolve(fallbackImg.src);
          } catch {
            resolve(fallbackImg.src);
          }
        };
        fallbackImg.onerror = () => resolve(null);
        fallbackImg.src = "/logo-xeno.png";
      } catch {
        resolve(null);
      }
    });
  }

  return getSyncLogoDataUrl();
}

/**
 * Converts a hex (#ffffff, #fff, ffffff), rgb(r, g, b), or rgba(r, g, b, a) color into RGB tuple [r, g, b].
 */
export function hexToRgb(color?: string | null): [number, number, number] | null {
  if (!color || typeof color !== "string") return null;
  const str = color.trim().toLowerCase();
  if (str === "transparent" || str === "none") return null;

  // Handle rgb / rgba: "rgb(255, 0, 0)" or "rgba(255, 0, 0, 1)"
  if (str.startsWith("rgb")) {
    const match = str.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (match) {
      return [
        Math.min(255, Math.max(0, parseInt(match[1], 10))),
        Math.min(255, Math.max(0, parseInt(match[2], 10))),
        Math.min(255, Math.max(0, parseInt(match[3], 10))),
      ];
    }
  }

  // Handle common named colors
  const namedColors: Record<string, [number, number, number]> = {
    white: [255, 255, 255],
    black: [0, 0, 0],
    red: [239, 68, 68],
    green: [34, 197, 94],
    blue: [59, 130, 246],
    yellow: [234, 179, 8],
    gray: [107, 114, 128],
    grey: [107, 114, 128],
  };
  if (namedColors[str]) {
    return namedColors[str];
  }

  let clean = str.replace("#", "").trim();
  if (clean.length === 3) {
    clean = clean
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (clean.length !== 6) return null;
  const num = parseInt(clean, 16);
  if (isNaN(num)) return null;
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

/**
 * Builds a vector-based, professional PDF document from one or more event sheets.
 */
export function buildSpreadsheetPdf(options: GenerateSpreadsheetPdfOptions): jsPDF {
  const {
    eventTitle,
    sheets,
    orientation = "landscape",
    logoDataUrl,
    includeFamilyData = false,
    familyData,
  } = options;
  const logoUrl = logoDataUrl !== undefined ? logoDataUrl : getSyncLogoDataUrl();

  // Initialize PDF with requested orientation (A4)
  const doc = new jsPDF({
    orientation,
    unit: "mm",
    format: "a4",
  });

  // Embed Montserrat font into jsPDF VFS and set as default font
  registerMontserratFont(doc);

  const pageWidth = orientation === "landscape" ? 297 : 210;
  const pageHeight = orientation === "landscape" ? 210 : 297;
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2;
  const nowFormatted = formatDate(new Date().toISOString());

  // Filter valid sheets
  const validSheets = sheets.filter((s) => Boolean(s && s.sheet_name));
  if (validSheets.length === 0 && !includeFamilyData) {
    renderEmptyDocument(doc, eventTitle, pageWidth, marginX, contentWidth);
    return doc;
  }

  validSheets.forEach((sheet, sheetIndex) => {
    // If not the first sheet, add a new page
    if (sheetIndex > 0) {
      doc.addPage("a4", orientation);
    }

    const startY = renderSheetHeader(
      doc,
      eventTitle,
      sheet.sheet_name,
      pageWidth,
      marginX,
      contentWidth,
      nowFormatted,
      logoUrl
    );

    // Convert sheet data to FortuneSheet model for unified parsing
    const fortuneSheet = convertToFortuneSheet(sheet.data, sheet.sheet_name);
    const { head, body } = parseFortuneSheetForAutoTable(fortuneSheet);

    // Render table
    const tableOptions: UserOptions = {
      startY,
      head: head.length > 0 ? head : undefined,
      body,
      theme: "grid",
      styles: {
        font: "Montserrat",
        lineWidth: 0.15,
        lineColor: [229, 231, 235],
      },
      headStyles: {
        font: "Montserrat",
        fillColor: [244, 245, 247], // Neutral light header background fallback (matches FortuneSheet)
        textColor: [0, 0, 0], // Default black
        fontStyle: "bold",
        fontSize: 8,
        cellPadding: 2.8,
        halign: "left",
        valign: "middle",
        lineWidth: 0.15,
        lineColor: [229, 231, 235],
      },
      bodyStyles: {
        font: "Montserrat",
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontSize: 7.5,
        cellPadding: 2.2,
        lineColor: [229, 231, 235],
        lineWidth: 0.15,
        overflow: "linebreak",
      },
      alternateRowStyles: {
        fillColor: [255, 255, 255], // Clean white by default matching web spreadsheet
      },
      margin: {
        left: marginX,
        right: marginX,
        top: 24,
        bottom: 18,
      },
      didParseCell: (data) => {
        data.cell.styles.font = "Montserrat";

        const raw = data.cell.raw;
        let rawCell: any = null;
        let mergeInfo: { colSpan?: number; rowSpan?: number } | null = null;

        if (typeof raw === "object" && raw !== null) {
          if ((raw as any)._rawCell !== undefined) {
            rawCell = (raw as any)._rawCell;
          } else if (
            (raw as any).bg !== undefined ||
            (raw as any).fc !== undefined ||
            (raw as any).bl !== undefined ||
            (raw as any).it !== undefined ||
            (raw as any).ht !== undefined ||
            (raw as any).mc !== undefined ||
            (raw as any).v !== undefined
          ) {
            rawCell = raw;
          }

          if ((raw as any)._merge) {
            mergeInfo = (raw as any)._merge;
          }
        }

        // Check merge from cell.mc if not already present
        if (!mergeInfo && rawCell?.mc) {
          const mc = rawCell.mc;
          const rs = Math.max(mc.rs || 1, 1);
          const cs = Math.max(mc.cs || 1, 1);
          if (rs > 1 || cs > 1) {
            mergeInfo = { rowSpan: rs, colSpan: cs };
          }
        }

        // Apply ColSpan and RowSpan to match spreadsheet layout
        if (mergeInfo) {
          if (mergeInfo.colSpan && mergeInfo.colSpan > 1) {
            data.cell.colSpan = mergeInfo.colSpan;
          }
          if (mergeInfo.rowSpan && mergeInfo.rowSpan > 1) {
            data.cell.rowSpan = mergeInfo.rowSpan;
          }
        }

        // Apply background color (bg) using cell's hex code for EVERY cell, including header row
        if (rawCell?.bg) {
          const bgRgb = hexToRgb(rawCell.bg);
          if (bgRgb) {
            data.cell.styles.fillColor = bgRgb;
          }
        } else {
          if (data.section === "head") {
            data.cell.styles.fillColor = [244, 245, 247];
          } else {
            data.cell.styles.fillColor = [255, 255, 255];
          }
        }

        // Apply text color (fc) using cell's hex code (default to black if empty)
        if (rawCell?.fc) {
          const fcRgb = hexToRgb(rawCell.fc);
          if (fcRgb) {
            data.cell.styles.textColor = fcRgb;
          } else {
            data.cell.styles.textColor = [0, 0, 0];
          }
        } else {
          data.cell.styles.textColor = [0, 0, 0];
        }

        // Apply fontStyle (bold / italic) directly from FortuneSheet cell object
        const isBold =
          rawCell?.bl === 1 || (data.section === "head" && rawCell?.bl !== 0);
        const isItalic = rawCell?.it === 1;

        if (isBold && isItalic) {
          data.cell.styles.fontStyle = "bolditalic";
        } else if (isBold) {
          data.cell.styles.fontStyle = "bold";
        } else if (isItalic) {
          data.cell.styles.fontStyle = "italic";
        } else {
          data.cell.styles.fontStyle = "normal";
        }

        // Apply horizontal alignment (halign) directly from FortuneSheet cell object
        if (
          rawCell?.ht === 0 ||
          rawCell?.ht === "0" ||
          rawCell?.ht === "center"
        ) {
          data.cell.styles.halign = "center";
        } else if (
          rawCell?.ht === 1 ||
          rawCell?.ht === "1" ||
          rawCell?.ht === "left"
        ) {
          data.cell.styles.halign = "left";
        } else if (
          rawCell?.ht === 2 ||
          rawCell?.ht === "2" ||
          rawCell?.ht === "right"
        ) {
          data.cell.styles.halign = "right";
        }

        // Apply vertical alignment (valign)
        if (
          rawCell?.vt === 0 ||
          rawCell?.vt === "0" ||
          rawCell?.vt === "center" ||
          rawCell?.vt === "middle"
        ) {
          data.cell.styles.valign = "middle";
        } else if (
          rawCell?.vt === 1 ||
          rawCell?.vt === "1" ||
          rawCell?.vt === "top"
        ) {
          data.cell.styles.valign = "top";
        } else if (
          rawCell?.vt === 2 ||
          rawCell?.vt === "2" ||
          rawCell?.vt === "bottom"
        ) {
          data.cell.styles.valign = "bottom";
        }
      },
      didDrawPage: (data) => {
        // If autotable splits a single sheet into multiple pages, draw a running header on pages > 1
        if (data.pageNumber > 1 && data.pageNumber === doc.getNumberOfPages()) {
          renderSubsequentHeader(
            doc,
            eventTitle,
            sheet.sheet_name,
            pageWidth,
            marginX,
            contentWidth
          );
        }
      },
    };

    autoTable(doc, tableOptions);
  });

  // 2. Render Family Data (Formulir Publik) if selected
  if (includeFamilyData) {
    // If Excel sheets were already rendered, start Family Data on a fresh page
    if (validSheets.length > 0) {
      doc.addPage("a4", orientation);
    }

    renderFamilyDataSectionPdf(
      doc,
      eventTitle,
      familyData,
      pageWidth,
      pageHeight,
      marginX,
      contentWidth,
      nowFormatted,
      logoUrl,
      orientation
    );
  }

  // Render uniform running footers on all pages
  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page++) {
    doc.setPage(page);

    // Footer hairline divider
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.2);
    doc.line(marginX, pageHeight - 12, marginX + contentWidth, pageHeight - 12);

    // Footer text
    doc.setFont("Montserrat", "normal");
    doc.setFontSize(6.8);
    doc.setTextColor(156, 163, 175);
    doc.text(
      "Xeno Entertainment • Dokumen Resmi Lembar Kerja Acara • Rahasia (Internal Use Only)",
      marginX,
      pageHeight - 7
    );

    doc.text(
      `Halaman ${page} dari ${totalPages}`,
      pageWidth - marginX,
      pageHeight - 7,
      { align: "right" }
    );
  }

  return doc;
}

/**
 * Renders the clean, official executive letterhead for a sheet.
 * Features:
 * 1. Left-aligned official Xeno logo at marginX (X=14).
 * 2. "Assignment Letter" title and sheet name positioned to the right of the logo, vertically centered.
 * 3. Clean text without "Sheet:" prefix and completely removed "Dicetak:" print date.
 * 4. Crisp hairline divider line and nicely proportioned startY for autoTable.
 */
export function renderSheetHeader(
  doc: jsPDF,
  eventTitle: string,
  sheetName: string,
  pageWidth: number,
  marginX: number,
  contentWidth: number,
  nowFormatted?: string,
  logoDataUrl?: string | null
): number {
  const logoY = 9;
  const logoWidth = 22;
  const logoHeight = 22;
  let textX = marginX;

  // 1. Official Logo at top-left
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, "PNG", marginX, logoY, logoWidth, logoHeight);
      textX = marginX + logoWidth + 7; // Place text neatly to the right of the logo
    } catch (err) {
      console.warn("[renderSheetHeader] Error inserting logo image:", err);
      textX = marginX;
    }
  }

  // 2. "Assignment Letter" Title (sitting to the right of the logo, vertically aligned)
  const titleY = logoDataUrl ? logoY + 8 : logoY + 6;
  doc.setFont("Montserrat", "bold");
  doc.setFontSize(15);
  doc.setTextColor(17, 24, 39); // Deep slate / charcoal
  doc.text("Assignment Letter", textX, titleY);

  // 3. Sheet Name (cleanly rendered directly under "Assignment Letter" without "Sheet:" prefix)
  const subtitleY = logoDataUrl ? logoY + 15.5 : logoY + 13.5;
  const cleanSheetName = (sheetName || "Sheet 1").toUpperCase();
  doc.setFont("Montserrat", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(75, 85, 99); // Slate-600
  doc.text(cleanSheetName, textX, subtitleY);

  // 4. Optional Event Title (right-aligned on the letterhead banner if provided)
  if (
    eventTitle &&
    eventTitle.trim() &&
    eventTitle !== "Acara Xeno" &&
    eventTitle !== "Event"
  ) {
    const cleanEvent =
      eventTitle.length > 50 ? eventTitle.slice(0, 47) + "..." : eventTitle.trim();
    doc.setFont("Montserrat", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(107, 114, 128); // Slate-500
    doc.text(cleanEvent, pageWidth - marginX, subtitleY, { align: "right" });
  }

  // 5. Hairline Divider Line below the letterhead header
  const dividerY = logoDataUrl ? logoY + logoHeight + 3.5 : subtitleY + 5;
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.25);
  doc.line(marginX, dividerY, marginX + contentWidth, dividerY);

  // 6. Return startY for autoTable with clean breathing room below the divider
  return dividerY + 5.5;
}

/**
 * Running header for multi-page overflow sheets.
 */
function renderSubsequentHeader(
  doc: jsPDF,
  eventTitle: string,
  sheetName: string,
  pageWidth: number,
  marginX: number,
  contentWidth: number
) {
  const topY = 10;
  doc.setFont("Montserrat", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(107, 114, 128);
  doc.text(
    `ASSIGNMENT LETTER — ${sheetName.toUpperCase()} (Lanjutan)`,
    marginX,
    topY + 3
  );

  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.2);
  doc.line(marginX, topY + 5.5, marginX + contentWidth, topY + 5.5);
}

/**
 * Fallback when no sheets are available.
 */
function renderEmptyDocument(
  doc: jsPDF,
  eventTitle: string,
  pageWidth: number,
  marginX: number,
  contentWidth: number
) {
  doc.setFont("Montserrat", "bold");
  doc.setFontSize(12);
  doc.text(eventTitle || "Detail Acara", marginX, 20);

  doc.setFont("Montserrat", "normal");
  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128);
  doc.text("Tidak ada lembar kerja yang dipilih atau tersedia untuk diekspor.", marginX, 30);
}

/**
 * Parses FortuneSheet data into structured autoTable head and body arrays,
 * completely preventing data shifting (null/empty handling up to max columns),
 * supporting merged cells (both config.merge and cell.mc) with accurate subordinate skipping,
 * and matching exact FortuneSheet cell styling (including row 0 header).
 */
export function parseFortuneSheetForAutoTable(sheetObj: any): {
  head: any[][];
  body: any[][];
} {
  let maxR = 0;
  let maxC = 0;
  let hasAnyData = false;
  const matrix = new Map<string, any>();

  const registerCell = (r: number, c: number, cell: any) => {
    if (r < 0 || c < 0) return;
    if (cell === null || cell === undefined) return;

    matrix.set(`${r}_${c}`, cell);

    const text = extractCellText(cell);
    const hasContent = text.trim() !== "";
    const hasFormatting = Boolean(
      cell.bg ||
      cell.bl ||
      cell.fc ||
      cell.it ||
      cell.ht !== undefined ||
      cell.vt !== undefined
    );
    const hasMerge = Boolean(cell.mc);

    if (hasContent || hasFormatting || hasMerge) {
      hasAnyData = true;
      if (r > maxR) maxR = r;
      if (c > maxC) maxC = c;
    }
  };

  // 1. Process 2D array data if present
  if (Array.isArray(sheetObj?.data) && sheetObj.data.length > 0) {
    sheetObj.data.forEach((row: any, r: number) => {
      if (Array.isArray(row)) {
        row.forEach((cell: any, c: number) => {
          registerCell(r, c, cell);
        });
      }
    });
  }

  // 2. Process celldata if present
  if (Array.isArray(sheetObj?.celldata) && sheetObj.celldata.length > 0) {
    sheetObj.celldata.forEach((item: any) => {
      if (item && typeof item.r === "number" && typeof item.c === "number") {
        registerCell(item.r, item.c, item.v);
      }
    });
  }

  // 3. Process config.merge to ensure maxR and maxC cover all merged ranges
  const rawMerges: any[] = [];
  if (sheetObj?.config?.merge) {
    if (Array.isArray(sheetObj.config.merge)) {
      rawMerges.push(...sheetObj.config.merge);
    } else if (typeof sheetObj.config.merge === "object") {
      rawMerges.push(...Object.values(sheetObj.config.merge));
    }
  }

  for (const m of rawMerges) {
    if (m && typeof m.r === "number" && typeof m.c === "number") {
      const rowSpan = Math.max(m.rs || 1, 1);
      const colSpan = Math.max(m.cs || 1, 1);
      hasAnyData = true;
      if (m.r + rowSpan - 1 > maxR) maxR = m.r + rowSpan - 1;
      if (m.c + colSpan - 1 > maxC) maxC = m.c + colSpan - 1;
    }
  }

  // 4. Process legacy columns / rows if present
  if (Array.isArray(sheetObj?.columns) && sheetObj.columns.length > 0) {
    hasAnyData = true;
    if (sheetObj.columns.length - 1 > maxC) maxC = sheetObj.columns.length - 1;
  }

  // 5. Process cell.mc merges
  for (const [key, cell] of matrix.entries()) {
    if (cell && typeof cell === "object" && cell.mc) {
      const [rStr, cStr] = key.split("_");
      const r = parseInt(rStr, 10);
      const c = parseInt(cStr, 10);
      const mc = cell.mc;
      const rootR = typeof mc.r === "number" ? mc.r : r;
      const rootC = typeof mc.c === "number" ? mc.c : c;
      const rs = Math.max(mc.rs || 1, 1);
      const cs = Math.max(mc.cs || 1, 1);
      hasAnyData = true;
      if (rootR + rs - 1 > maxR) maxR = rootR + rs - 1;
      if (rootC + cs - 1 > maxC) maxC = rootC + cs - 1;
    }
  }

  // Fallback for completely empty sheet
  if (!hasAnyData && matrix.size === 0) {
    return {
      head: [["Informasi"]],
      body: [["Lembar kerja belum memiliki data."]],
    };
  }

  // 6. Build merge maps and skip coordinates
  const skipMap = new Set<string>();
  const mergeLookup = new Map<string, { rowSpan: number; colSpan: number }>();

  // A. From config.merge
  for (const m of rawMerges) {
    if (m && typeof m.r === "number" && typeof m.c === "number") {
      const rowSpan = Math.max(m.rs || 1, 1);
      const colSpan = Math.max(m.cs || 1, 1);
      if (rowSpan > 1 || colSpan > 1) {
        mergeLookup.set(`${m.r}_${m.c}`, { rowSpan, colSpan });

        for (let r = m.r; r < m.r + rowSpan; r++) {
          for (let c = m.c; c < m.c + colSpan; c++) {
            if (r !== m.r || c !== m.c) {
              skipMap.add(`${r}_${c}`);
            }
          }
        }
      }
    }
  }

  // B. From cell.mc
  for (const [key, cell] of matrix.entries()) {
    if (cell && typeof cell === "object" && cell.mc) {
      const [rStr, cStr] = key.split("_");
      const r = parseInt(rStr, 10);
      const c = parseInt(cStr, 10);
      const mc = cell.mc;

      const rootR = typeof mc.r === "number" ? mc.r : r;
      const rootC = typeof mc.c === "number" ? mc.c : c;
      const rowSpan = Math.max(mc.rs || 1, 1);
      const colSpan = Math.max(mc.cs || 1, 1);

      if (rowSpan > 1 || colSpan > 1) {
        mergeLookup.set(`${rootR}_${rootC}`, { rowSpan, colSpan });

        for (let mr = rootR; mr < rootR + rowSpan; mr++) {
          for (let mcCol = rootC; mcCol < rootC + colSpan; mcCol++) {
            if (mr !== rootR || mcCol !== rootC) {
              skipMap.add(`${mr}_${mcCol}`);
            }
          }
        }
      } else if (rootR !== r || rootC !== c) {
        // Subordinate cell pointing to another merge root
        skipMap.add(`${r}_${c}`);
      }
    }
  }

  // 7. Construct Head (row 0) and Body (rows 1..N)
  const head: any[][] = [];
  const body: any[][] = [];

  for (let r = 0; r <= maxR; r++) {
    const rowCells: any[] = [];
    const isHeaderRow = r === 0;

    for (let c = 0; c <= maxC; c++) {
      const coordKey = `${r}_${c}`;

      // Check if this cell is spanned/covered by a merge
      if (skipMap.has(coordKey)) {
        // Subordinate cell: omit so autoTable expands the spanned cell into this slot!
        continue;
      }

      const rawCell = matrix.get(coordKey) ?? null;
      let textVal = extractCellText(rawCell);
      textVal = textVal.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

      const mergeInfo = mergeLookup.get(coordKey) ?? null;
      const cellStyles: Record<string, any> = {};

      // Background color (bg) for ALL cells (including row 0 header)
      if (rawCell?.bg) {
        const rgb = hexToRgb(rawCell.bg);
        if (rgb) cellStyles.fillColor = rgb;
      }

      // Font color (fc) for ALL cells (default to black if empty)
      if (rawCell?.fc) {
        const rgb = hexToRgb(rawCell.fc);
        if (rgb) {
          cellStyles.textColor = rgb;
        } else {
          cellStyles.textColor = [0, 0, 0];
        }
      } else {
        cellStyles.textColor = [0, 0, 0];
      }

      // Bold status & Italic status
      const isBold = rawCell?.bl === 1 || (isHeaderRow && rawCell?.bl !== 0);
      const isItalic = rawCell?.it === 1;

      if (isBold && isItalic) {
        cellStyles.fontStyle = "bolditalic";
      } else if (isBold) {
        cellStyles.fontStyle = "bold";
      } else if (isItalic) {
        cellStyles.fontStyle = "italic";
      } else {
        cellStyles.fontStyle = "normal";
      }

      // Horizontal alignment (0 = center, 1 = left, 2 = right)
      if (rawCell?.ht === 0 || rawCell?.ht === "0" || rawCell?.ht === "center") {
        cellStyles.halign = "center";
      } else if (rawCell?.ht === 1 || rawCell?.ht === "1" || rawCell?.ht === "left") {
        cellStyles.halign = "left";
      } else if (rawCell?.ht === 2 || rawCell?.ht === "2" || rawCell?.ht === "right") {
        cellStyles.halign = "right";
      }

      // Vertical alignment
      if (rawCell?.vt === 0 || rawCell?.vt === "0" || rawCell?.vt === "center" || rawCell?.vt === "middle") {
        cellStyles.valign = "middle";
      } else if (rawCell?.vt === 1 || rawCell?.vt === "1" || rawCell?.vt === "top") {
        cellStyles.valign = "top";
      } else if (rawCell?.vt === 2 || rawCell?.vt === "2" || rawCell?.vt === "bottom") {
        cellStyles.valign = "bottom";
      }

      // Explicitly return structured cell object for EVERY cell (including null/empty cells)
      // so the array length matches max columns perfectly and prevents data from shifting to the left!
      rowCells.push({
        content: textVal,
        rowSpan: mergeInfo?.rowSpan,
        colSpan: mergeInfo?.colSpan,
        styles: Object.keys(cellStyles).length > 0 ? cellStyles : undefined,
        _rawCell: rawCell || null,
        _merge: mergeInfo || null,
      });
    }

    if (isHeaderRow) {
      head.push(rowCells);
    } else {
      body.push(rowCells);
    }
  }

  return { head, body };
}

/**
 * Renders the Family Data (Formulir Publik) section into the PDF document.
 * Draws letterhead header, category sub-headers, and clean autoTable grids for each category
 * using the Montserrat font and matching theme styling.
 */
export function renderFamilyDataSectionPdf(
  doc: jsPDF,
  eventTitle: string,
  familyData: EventPublicForm | null | undefined,
  pageWidth: number,
  pageHeight: number,
  marginX: number,
  contentWidth: number,
  nowFormatted: string,
  logoUrl?: string | null,
  orientation: "landscape" | "portrait" = "landscape"
): void {
  let currentY = renderSheetHeader(
    doc,
    eventTitle,
    "DATA KELUARGA (FORMULIR PUBLIK)",
    pageWidth,
    marginX,
    contentWidth,
    nowFormatted,
    logoUrl
  );

  const baseCategories: FormCategorySchema[] =
    familyData?.form_schema && familyData.form_schema.length > 0
      ? familyData.form_schema
      : DEFAULT_PUBLIC_FORM_SCHEMA;

  const formData: EventFormData = familyData?.form_data || {};

  // Combine categories from schema and any extra dynamic categories found in formData
  const definedIds = new Set(baseCategories.map((c) => c.id));
  const categories: FormCategorySchema[] = [...baseCategories];
  for (const [key, val] of Object.entries(formData)) {
    if (!definedIds.has(key) && Array.isArray(val) && val.length > 0) {
      categories.push({
        id: key,
        name: key
          .replace(/[_-]/g, " ")
          .replace(/\b\w/g, (char) => char.toUpperCase()),
      });
    }
  }

  // Count total non-empty members
  let totalMembersCount = 0;
  categories.forEach((cat) => {
    const list = formData[cat.id] || [];
    const valid = list.filter(
      (m) =>
        Boolean(
          m &&
            (m.name ||
              m.nama ||
              m.role ||
              m.hubungan ||
              m.phone ||
              m.no_hp ||
              m.address ||
              m.alamat ||
              m.notes ||
              m.catatan)
        )
    );
    totalMembersCount += valid.length;
  });

  if (totalMembersCount === 0) {
    doc.setFont("Montserrat", "italic");
    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128);
    doc.text(
      "Belum ada data anggota keluarga yang tercatat pada formulir publik ini.",
      marginX,
      currentY + 6
    );
    return;
  }

  categories.forEach((cat) => {
    const rawMembers = formData[cat.id] || [];
    const members = rawMembers.filter(
      (m) =>
        Boolean(
          m &&
            (m.name ||
              m.nama ||
              m.role ||
              m.hubungan ||
              m.phone ||
              m.no_hp ||
              m.address ||
              m.alamat ||
              m.notes ||
              m.catatan)
        )
    );

    if (members.length === 0) return;

    // Check vertical space on page before rendering category header & table
    if (currentY > pageHeight - 35) {
      doc.addPage("a4", orientation);
      currentY = renderSheetHeader(
        doc,
        eventTitle,
        "DATA KELUARGA (FORMULIR PUBLIK)",
        pageWidth,
        marginX,
        contentWidth,
        nowFormatted,
        logoUrl
      );
    }

    // Category sub-header text
    doc.setFont("Montserrat", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(17, 24, 39);
    doc.text(cat.name, marginX, currentY + 3.5);
    currentY += 5;

    if (cat.description) {
      doc.setFont("Montserrat", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(107, 114, 128);
      doc.text(cat.description, marginX, currentY);
      currentY += 4;
    }

    const head = [
      [
        "No",
        "Nama Lengkap",
        "Hubungan / Peran",
        "No. WhatsApp / HP",
        "Alamat / Catatan Khusus",
      ],
    ];

    const body = members.map((m, idx) => {
      const addressNotes = [
        (m.address || m.alamat)?.trim(),
        (m.notes || m.catatan)?.trim(),
      ]
        .filter(Boolean)
        .join(" • ");

      return [
        String(idx + 1),
        m.name || m.nama || "-",
        m.role || m.hubungan || m.peran || "-",
        m.phone || m.no_hp || m.telepon || "-",
        addressNotes || "-",
      ];
    });

    const isLandscape = orientation === "landscape";

    autoTable(doc, {
      startY: currentY,
      head,
      body,
      theme: "grid",
      styles: {
        font: "Montserrat",
        lineWidth: 0.15,
        lineColor: [229, 231, 235],
      },
      headStyles: {
        font: "Montserrat",
        fillColor: [244, 245, 247],
        textColor: [17, 24, 39],
        fontStyle: "bold",
        fontSize: 8,
        cellPadding: 2.8,
        halign: "left",
        valign: "middle",
        lineWidth: 0.15,
        lineColor: [229, 231, 235],
      },
      bodyStyles: {
        font: "Montserrat",
        fillColor: [255, 255, 255],
        textColor: [31, 41, 55],
        fontSize: 7.5,
        cellPadding: 2.2,
        lineColor: [229, 231, 235],
        lineWidth: 0.15,
        overflow: "linebreak",
      },
      columnStyles: {
        0: { cellWidth: 10, halign: "center" },
        1: { fontStyle: "bold", cellWidth: isLandscape ? 60 : 45 },
        2: { cellWidth: isLandscape ? 50 : 35 },
        3: { cellWidth: isLandscape ? 45 : 35 },
        4: { cellWidth: "auto" },
      },
      margin: {
        left: marginX,
        right: marginX,
        top: 20,
        bottom: 18,
      },
      didDrawPage: (data) => {
        if (data.pageNumber > 1 && data.pageNumber === doc.getNumberOfPages()) {
          renderSubsequentHeader(
            doc,
            eventTitle,
            `DATA KELUARGA — ${cat.name.toUpperCase()}`,
            pageWidth,
            marginX,
            contentWidth
          );
        }
      },
    });

    const lastFinalY = (doc as any).lastAutoTable?.finalY;
    currentY = (lastFinalY || currentY) + 7;
  });
}

/**
 * Triggers PDF generation and immediate browser download.
 */
export async function downloadSpreadsheetPdf(
  options: GenerateSpreadsheetPdfOptions
): Promise<{ fileName: string }> {
  // Obtain official logo data URL via off-screen canvas if in browser
  const logoDataUrl =
    options.logoDataUrl !== undefined ? options.logoDataUrl : await getLogoDataUrl();
  const doc = buildSpreadsheetPdf({ ...options, logoDataUrl });

  const cleanEvent = (options.eventTitle || "Event")
    .replace(/[^a-zA-Z0-9_\-\s]/g, "")
    .trim()
    .replace(/\s+/g, "_");

  let fileName = `${cleanEvent}_Lembar_Kerja.pdf`;
  if (options.sheets.length === 1 && options.sheets[0]?.sheet_name && !options.includeFamilyData) {
    const cleanSheet = options.sheets[0].sheet_name
      .replace(/[^a-zA-Z0-9_\-\s]/g, "")
      .trim()
      .replace(/\s+/g, "_");
    fileName = `${cleanEvent}_${cleanSheet}.pdf`;
  } else if (options.sheets.length === 0 && options.includeFamilyData) {
    fileName = `${cleanEvent}_Data_Keluarga.pdf`;
  } else if (options.sheets.length > 0 && options.includeFamilyData) {
    fileName = `${cleanEvent}_Lembar_Kerja_dan_Data_Keluarga.pdf`;
  }

  if (options.customFilename) {
    fileName = options.customFilename.endsWith(".pdf")
      ? options.customFilename
      : `${options.customFilename}.pdf`;
  }

  doc.save(fileName);
  return { fileName };
}

