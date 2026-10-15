import { jsPDF } from "jspdf";
import rawAutoTable, { type UserOptions } from "jspdf-autotable";
import { convertToFortuneSheet } from "@/lib/spreadsheet-adapter";
import { formatDate } from "@/lib/utils";
import type { EventSheet } from "@/types/database";

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
}

/**
 * Converts a hex color (#ffffff, #fff, or ffffff) into RGB tuple [r, g, b].
 */
export function hexToRgb(hex?: string | null): [number, number, number] | null {
  if (!hex || typeof hex !== "string") return null;
  let clean = hex.replace("#", "").trim();
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
  const { eventTitle, sheets, orientation = "landscape" } = options;

  // Initialize PDF with requested orientation (A4)
  const doc = new jsPDF({
    orientation,
    unit: "mm",
    format: "a4",
  });

  const pageWidth = orientation === "landscape" ? 297 : 210;
  const pageHeight = orientation === "landscape" ? 210 : 297;
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2;
  const nowFormatted = formatDate(new Date().toISOString());

  // Filter valid sheets
  const validSheets = sheets.filter((s) => Boolean(s && s.sheet_name));
  if (validSheets.length === 0) {
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
      nowFormatted
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
      headStyles: {
        fillColor: [17, 24, 39], // Rich dark slate
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 8,
        cellPadding: 2.5,
        halign: "left",
      },
      bodyStyles: {
        textColor: [31, 41, 55],
        fontSize: 7.5,
        cellPadding: 2.2,
        lineColor: [229, 231, 235],
        lineWidth: 0.15,
      },
      alternateRowStyles: {
        fillColor: [250, 250, 250],
      },
      margin: {
        left: marginX,
        right: marginX,
        top: 24,
        bottom: 18,
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

  // Render uniform running footers on all pages
  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page++) {
    doc.setPage(page);

    // Footer hairline divider
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.2);
    doc.line(marginX, pageHeight - 12, marginX + contentWidth, pageHeight - 12);

    // Footer text
    doc.setFont("helvetica", "normal");
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
 * Renders the top brand header for a sheet.
 */
function renderSheetHeader(
  doc: jsPDF,
  eventTitle: string,
  sheetName: string,
  pageWidth: number,
  marginX: number,
  contentWidth: number,
  nowFormatted: string
): number {
  const topY = 10;

  // 1. Brand Logo Mark (Rounded Slate Badge with crisp "X")
  doc.setFillColor(17, 24, 39);
  doc.roundedRect(marginX, topY, 8, 8, 1.8, 1.8, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text("X", marginX + 4, topY + 5.5, { align: "center" });

  // Brand Name & Subtitle
  doc.setTextColor(17, 24, 39);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.text("XENO ENTERTAINMENT", marginX + 11, topY + 4);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(107, 114, 128);
  doc.text("LEMBAR KERJA & SPREADSHEET OPERASIONAL ACARA", marginX + 11, topY + 7.5);

  // 2. Right-Aligned Event & Sheet Information
  const cleanEventTitle =
    eventTitle && eventTitle.length > 45
      ? eventTitle.slice(0, 43) + "..."
      : eventTitle || "Acara Xeno";

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(17, 24, 39);
  doc.text(cleanEventTitle, pageWidth - marginX, topY + 3.8, { align: "right" });

  // Sheet Name Badge
  const badgeText = `LEMBAR: ${sheetName.toUpperCase()}`;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  const badgeTextWidth = doc.getTextWidth(badgeText);
  const badgeWidth = badgeTextWidth + 6;
  const badgeX = pageWidth - marginX - badgeWidth;
  const badgeY = topY + 5.2;

  doc.setFillColor(239, 246, 255);
  doc.roundedRect(badgeX, badgeY, badgeWidth, 4.2, 1.2, 1.2, "F");
  doc.setTextColor(0, 122, 255);
  doc.text(badgeText, badgeX + badgeWidth / 2, badgeY + 3, { align: "center" });

  // Print Timestamp under sheet name
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.setTextColor(156, 163, 175);
  doc.text(`Dicetak: ${nowFormatted}`, pageWidth - marginX, topY + 13, { align: "right" });

  // Divider Line
  const dividerY = topY + 15;
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.25);
  doc.line(marginX, dividerY, marginX + contentWidth, dividerY);

  return dividerY + 4; // Start Y for table
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
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(107, 114, 128);
  doc.text(
    `XENO ENTERTAINMENT — ${eventTitle.toUpperCase()} (Lanjutan Sheet: ${sheetName})`,
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
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(eventTitle || "Detail Acara", marginX, 20);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128);
  doc.text("Tidak ada lembar kerja yang dipilih atau tersedia untuk diekspor.", marginX, 30);
}

/**
 * Parses FortuneSheet data into structured autoTable head and body arrays,
 * preserving cell formatting (bold, italic, colors, text alignment) and merged ranges.
 */
export function parseFortuneSheetForAutoTable(sheetObj: any): {
  head: any[][];
  body: any[][];
} {
  // 1. Build a 2D matrix of cell objects { v, m, bg, bl, it, fc, ht }
  let maxR = 0;
  let maxC = 0;
  const matrix: Map<string, any> = new Map();

  // If 2D array data exists
  if (Array.isArray(sheetObj.data) && sheetObj.data.length > 0) {
    sheetObj.data.forEach((row: any, r: number) => {
      if (Array.isArray(row)) {
        row.forEach((cell: any, c: number) => {
          if (cell && (cell.v !== undefined && cell.v !== null && cell.v !== "")) {
            if (r > maxR) maxR = r;
            if (c > maxC) maxC = c;
            matrix.set(`${r}_${c}`, cell);
          }
        });
      }
    });
  }

  // If celldata exists
  if (Array.isArray(sheetObj.celldata) && sheetObj.celldata.length > 0) {
    sheetObj.celldata.forEach((item: any) => {
      if (item && typeof item.r === "number" && typeof item.c === "number") {
        if (item.r > maxR) maxR = item.r;
        if (item.c > maxC) maxC = item.c;
        matrix.set(`${item.r}_${item.c}`, item.v || {});
      }
    });
  }

  // If completely empty, return single fallback row
  if (matrix.size === 0) {
    return {
      head: [["Informasi"]],
      body: [["Lembar kerja belum memiliki data."]],
    };
  }

  // 2. Build merge maps and skip coordinates
  const skipMap = new Set<string>();
  const mergeLookup = new Map<string, { rowSpan: number; colSpan: number }>();

  if (sheetObj.config?.merge) {
    for (const key of Object.keys(sheetObj.config.merge)) {
      const m = sheetObj.config.merge[key];
      if (m && typeof m.r === "number" && typeof m.c === "number") {
        const rowSpan = Math.max(m.rs || 1, 1);
        const colSpan = Math.max(m.cs || 1, 1);
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

  // 3. Find effective boundaries (strip trailing blank rows/cols)
  let lastNonEmptyRow = 0;
  for (let r = maxR; r >= 0; r--) {
    let hasData = false;
    for (let c = 0; c <= maxC; c++) {
      const cell = matrix.get(`${r}_${c}`);
      const val = cell?.m ?? cell?.v ?? "";
      if (val !== "") {
        hasData = true;
        break;
      }
    }
    if (hasData) {
      lastNonEmptyRow = r;
      break;
    }
  }

  // 4. Construct Head (row 0) and Body (rows 1..N)
  const head: any[][] = [];
  const body: any[][] = [];

  for (let r = 0; r <= lastNonEmptyRow; r++) {
    const rowCells: any[] = [];
    const isHeaderRow = r === 0;

    for (let c = 0; c <= maxC; c++) {
      const coordKey = `${r}_${c}`;
      if (skipMap.has(coordKey)) {
        // Skip cells covered by a previous merge root
        continue;
      }

      const rawCell = matrix.get(coordKey);
      const textVal =
        rawCell && (rawCell.m !== undefined && rawCell.m !== null)
          ? String(rawCell.m)
          : rawCell && (rawCell.v !== undefined && rawCell.v !== null)
          ? String(rawCell.v)
          : "";

      const mergeInfo = mergeLookup.get(coordKey);
      const cellStyles: Record<string, any> = {};

      // Parse background color
      if (rawCell?.bg) {
        const rgb = hexToRgb(rawCell.bg);
        if (rgb) cellStyles.fillColor = rgb;
      }

      // Parse text color
      if (rawCell?.fc) {
        const rgb = hexToRgb(rawCell.fc);
        if (rgb) cellStyles.textColor = rgb;
      }

      // Parse font styles (bold / italic)
      if (rawCell?.bl === 1 && rawCell?.it === 1) {
        cellStyles.fontStyle = "bolditalic";
      } else if (rawCell?.bl === 1 || isHeaderRow) {
        cellStyles.fontStyle = "bold";
      } else if (rawCell?.it === 1) {
        cellStyles.fontStyle = "italic";
      }

      // Parse horizontal alignment
      if (rawCell?.ht === 0) {
        cellStyles.halign = "center";
      } else if (rawCell?.ht === 1) {
        cellStyles.halign = "left";
      } else if (rawCell?.ht === 2) {
        cellStyles.halign = "right";
      }

      // Construct autoTable cell
      if (mergeInfo || Object.keys(cellStyles).length > 0) {
        rowCells.push({
          content: textVal,
          rowSpan: mergeInfo?.rowSpan,
          colSpan: mergeInfo?.colSpan,
          styles: Object.keys(cellStyles).length > 0 ? cellStyles : undefined,
        });
      } else {
        rowCells.push(textVal);
      }
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
 * Triggers PDF generation and immediate browser download.
 */
export async function downloadSpreadsheetPdf(
  options: GenerateSpreadsheetPdfOptions
): Promise<{ fileName: string }> {
  const doc = buildSpreadsheetPdf(options);

  const cleanEvent = (options.eventTitle || "Event")
    .replace(/[^a-zA-Z0-9_\-\s]/g, "")
    .trim()
    .replace(/\s+/g, "_");

  let fileName = `${cleanEvent}_Lembar_Kerja.pdf`;
  if (options.sheets.length === 1 && options.sheets[0]?.sheet_name) {
    const cleanSheet = options.sheets[0].sheet_name
      .replace(/[^a-zA-Z0-9_\-\s]/g, "")
      .trim()
      .replace(/\s+/g, "_");
    fileName = `${cleanEvent}_${cleanSheet}.pdf`;
  }

  if (options.customFilename) {
    fileName = options.customFilename.endsWith(".pdf")
      ? options.customFilename
      : `${options.customFilename}.pdf`;
  }

  doc.save(fileName);
  return { fileName };
}
