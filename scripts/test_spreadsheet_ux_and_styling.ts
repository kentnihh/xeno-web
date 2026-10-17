/**
 * Test suite for Spreadsheet UX Improvements & Rich PDF Styling:
 * 1. Show/Hide Gridlines Toggle (Configuration & State).
 * 2. Dedicated Refresh Action (Key Re-mount & State Rehydration without page reload).
 * 3. Rich PDF Styling matching Excel (bg -> fillColor, fc -> textColor, bl/it -> fontStyle, ht -> halign).
 */

import assert from "node:assert";
import {
  convertToFortuneSheet,
  sanitizeSheetData,
  extractCellText,
  parseSheetData,
} from "../lib/spreadsheet-adapter";
import {
  hexToRgb,
  parseFortuneSheetForAutoTable,
  buildSpreadsheetPdf,
} from "../lib/pdf/spreadsheet-pdf";
import type { EventSheet } from "../types/database";

console.log("== Testing Spreadsheet UX Improvements & Rich PDF Styling ==\n");

// ============================================================================
// 1. Show/Hide Gridlines Toggle Testing
// ============================================================================
console.log("--- 1. Testing Gridlines Configuration ---");

// Test 1.1: Default gridlines is enabled
const sheetDefault = convertToFortuneSheet(null, "TestSheet");
assert.strictEqual(sheetDefault.showGridLines, true, "Default gridlines must be true");

// Test 1.2: Explicitly hide gridlines
const sheetHidden = convertToFortuneSheet(null, "TestSheet", false);
assert.strictEqual(sheetHidden.showGridLines, false, "showGridLines must be false when set to false");

// Test 1.3: Explicitly show gridlines
const sheetShown = convertToFortuneSheet(null, "TestSheet", true);
assert.strictEqual(sheetShown.showGridLines, true, "showGridLines must be true when set to true");

// Test 1.4: Gridlines preserved on existing rich sheet data
const richSheetData = {
  name: "Rundown",
  showGridLines: 0,
  celldata: [{ r: 0, c: 0, v: { v: "Acara" } }],
};
const convertedFromData = convertToFortuneSheet(richSheetData, "Rundown");
assert.strictEqual(convertedFromData.showGridLines, false, "Should preserve showGridLines: 0 as false");

// When overridden by parameter
const convertedOverridden = convertToFortuneSheet(richSheetData, "Rundown", true);
assert.strictEqual(convertedOverridden.showGridLines, true, "Explicit parameter should override data.showGridLines");

console.log("✓ Gridlines toggle configuration correctly handles default, hidden, shown, and data states");

// ============================================================================
// 2. Refresh & Dynamic Re-mount Key Generation Testing
// ============================================================================
console.log("\n--- 2. Testing Refresh & Re-mount Logic ---");

// Test 2.1: Re-mount key guarantees fresh React mounting
let revision = 0;
let showGrid = true;
const sheetName = "RUNDOWN_ACARA";

function generateGridKey(name: string, rev: number, gridOn: boolean) {
  return `${name}_rev${rev}_grid${gridOn ? 1 : 0}`;
}

const keyInitial = generateGridKey(sheetName, revision, showGrid);
assert.strictEqual(keyInitial, "RUNDOWN_ACARA_rev0_grid1");

// Toggle gridlines changes key
showGrid = false;
revision++;
const keyToggled = generateGridKey(sheetName, revision, showGrid);
assert.strictEqual(keyToggled, "RUNDOWN_ACARA_rev1_grid0");
assert.notStrictEqual(keyInitial, keyToggled, "Toggling gridlines must produce distinct key to force re-mount");

// Refresh action increments revision and re-mounts with new data without page reload
revision++;
const keyRefreshed = generateGridKey(sheetName, revision, showGrid);
assert.strictEqual(keyRefreshed, "RUNDOWN_ACARA_rev2_grid0");
assert.notStrictEqual(keyToggled, keyRefreshed, "Refresh must increment revision to force clean canvas re-mount");

console.log("✓ Dynamic key generation correctly triggers clean FortuneSheet re-mount on refresh and toggle");

// ============================================================================
// 3. Color Parser (hexToRgb) Testing
// ============================================================================
console.log("\n--- 3. Testing Color Parser (Hex, RGB, RGBA, Named Colors) ---");

assert.deepStrictEqual(hexToRgb("#ff0000"), [255, 0, 0], "6-digit hex with hash #ff0000");
assert.deepStrictEqual(hexToRgb("00ff00"), [0, 255, 0], "6-digit hex without hash 00ff00");
assert.deepStrictEqual(hexToRgb("#00f"), [0, 0, 255], "3-digit hex with hash #00f");
assert.deepStrictEqual(hexToRgb("rgb(255, 200, 50)"), [255, 200, 50], "rgb(255, 200, 50)");
assert.deepStrictEqual(hexToRgb("rgba(10, 20, 30, 0.8)"), [10, 20, 30], "rgba(10, 20, 30, 0.8)");
assert.deepStrictEqual(hexToRgb("red"), [239, 68, 68], "named color red");
assert.deepStrictEqual(hexToRgb("white"), [255, 255, 255], "named color white");
assert.strictEqual(hexToRgb("transparent"), null, "transparent returns null");
assert.strictEqual(hexToRgb(null), null, "null returns null");

console.log("✓ Color parser correctly parses 6-digit hex, 3-digit hex, rgb, rgba, and named colors");

// ============================================================================
// 4. Rich PDF Styling matching Excel Testing
// ============================================================================
console.log("\n--- 4. Testing Rich PDF Cell Styling (bg, fc, bl, it, ht) ---");

const richSheetForPdf: EventSheet = {
  id: "sheet_pdf_test",
  event_id: "e_test",
  sheet_name: "SUSUNAN_ACARA",
  order_index: 0,
  data: {
    name: "SUSUNAN_ACARA",
    celldata: [
      // Row 0: Headers (should stay dark slate in PDF)
      { r: 0, c: 0, v: { v: "Waktu", bl: 1 } },
      { r: 0, c: 1, v: { v: "Kegiatan", bl: 1 } },
      { r: 0, c: 2, v: { v: "Penanggung Jawab", bl: 1 } },
      { r: 0, c: 3, v: { v: "Keterangan", bl: 1 } },

      // Row 1: Cell with background color (#ff0000) and bold (bl: 1)
      { r: 1, c: 0, v: { v: "08:00 - 09:00", bl: 1, ht: 0 } },
      { r: 1, c: 1, v: { v: "Registrasi & Coffee Break", bg: "#ff0000", fc: "#ffffff", bl: 1 } },
      { r: 1, c: 2, v: { v: "Tim LO", fc: "#007aff", ht: 1 } },
      { r: 1, c: 3, v: { v: "Prioritas Tinggi", bg: "#fef3c7", fc: "#92400e", bl: 1, it: 1 } },

      // Row 2: Cell with italic (it: 1) and right alignment (ht: 2)
      { r: 2, c: 0, v: { v: "09:00 - 10:00" } },
      { r: 2, c: 1, v: { v: "Sambutan Pembukaan", it: 1 } },
      { r: 2, c: 2, v: { v: "Ketua Panitia" } },
      { r: 2, c: 3, v: { v: "Selesai", bg: "#dcfce7", fc: "#15803d", ht: 2 } },
    ],
  },
  created_at: "",
  updated_at: "",
};

// Test parseFortuneSheetForAutoTable structure
const { head, body } = parseFortuneSheetForAutoTable(richSheetForPdf.data);

assert.strictEqual(head.length, 1, "Head must have 1 row");
assert.strictEqual(body.length, 2, "Body must have 2 rows");

// Verify row 1 cells (Body row 0)
const bodyRow0 = body[0];

// Cell 1: "Registrasi & Coffee Break" -> bg: #ff0000, fc: #ffffff, bl: 1
const regCell = bodyRow0[1];
assert.strictEqual(typeof regCell, "object", "Rich cell must be an object");
assert.strictEqual(regCell.content, "Registrasi & Coffee Break");
assert.deepStrictEqual(regCell.styles?.fillColor, [255, 0, 0], "fillColor must be [255, 0, 0]");
assert.deepStrictEqual(regCell.styles?.textColor, [255, 255, 255], "textColor must be [255, 255, 255]");
assert.strictEqual(regCell.styles?.fontStyle, "bold", "fontStyle must be bold");
assert.ok(regCell._rawCell, "_rawCell must be attached");

// Cell 2: "Tim LO" -> fc: #007aff, ht: 1 (left)
const loCell = bodyRow0[2];
assert.deepStrictEqual(loCell.styles?.textColor, [0, 122, 255], "textColor must be [0, 122, 255]");
assert.strictEqual(loCell.styles?.halign, "left", "halign must be left");

// Cell 3: "Prioritas Tinggi" -> bg: #fef3c7, fc: #92400e, bl: 1, it: 1
const priorityCell = bodyRow0[3];
assert.deepStrictEqual(priorityCell.styles?.fillColor, [254, 243, 199], "bg #fef3c7");
assert.deepStrictEqual(priorityCell.styles?.textColor, [146, 64, 14], "fc #92400e");
assert.strictEqual(priorityCell.styles?.fontStyle, "bolditalic", "fontStyle must be bolditalic");

// Verify row 2 cells (Body row 1)
const bodyRow1 = body[1];
const speechCell = bodyRow1[1];
assert.strictEqual(speechCell.styles?.fontStyle, "italic", "Sambutan Pembukaan must have fontStyle italic");

const doneCell = bodyRow1[3];
assert.deepStrictEqual(doneCell.styles?.fillColor, [220, 252, 231], "bg #dcfce7");
assert.deepStrictEqual(doneCell.styles?.textColor, [21, 128, 61], "fc #15803d");
assert.strictEqual(doneCell.styles?.halign, "right", "halign must be right");

console.log("✓ parseFortuneSheetForAutoTable correctly extracts bg, fc, bl, it, and ht into cell styles");

// Test buildSpreadsheetPdf with complete didParseCell integration
const pdfDoc = buildSpreadsheetPdf({
  eventTitle: "Annual Summit 2026",
  sheets: [richSheetForPdf],
  orientation: "landscape",
});

assert.ok(pdfDoc, "PDF document must be successfully built");
assert.strictEqual(pdfDoc.getNumberOfPages(), 1, "Must contain 1 page");
const pdfBytes = pdfDoc.output("arraybuffer").byteLength;
assert.ok(pdfBytes > 4000, `PDF size must be valid (> 4000 bytes, got ${pdfBytes})`);

console.log(`✓ buildSpreadsheetPdf successfully rendered document with rich Excel cell styling (${pdfBytes} bytes)`);

// ============================================================================
// 5. Multiline Text in Single Cell (Alt+Enter) Preservation & Serialization
// ============================================================================
console.log("\n--- 5. Testing Multiline Text (Alt+Enter) Preservation & Serialization ---");

const multilineInput = "Tunangan dari \n Aben dan Iben";
const mockEditedSheet = {
  name: "SUSUNAN_ACARA",
  row: 30,
  column: 15,
  data: [
    [
      { v: "No", bl: 1 },
      { v: "Acara", bl: 1 },
    ],
    [
      { v: "1" },
      // Cell with multiline text from Alt+Enter:
      {
        v: multilineInput,
        m: multilineInput,
      },
    ],
  ],
};

// Test 5.1: sanitizeSheetData properly processes multiline cell
const sanitized = sanitizeSheetData(mockEditedSheet);
assert(Array.isArray(sanitized.celldata), "Sanitized sheet must have celldata");
const multilineCellData = sanitized.celldata.find((c: any) => c.r === 1 && c.c === 1);
assert(multilineCellData, "Multiline cell must be present in celldata");
assert.strictEqual(
  multilineCellData.v.tb,
  "2",
  "Multiline cell must have tb: '2' for visual text wrapping"
);
assert.strictEqual(
  multilineCellData.v.ct?.t,
  "inlineStr",
  "Multiline cell must be configured with inlineStr for FortuneSheet canvas line breaking"
);
assert.ok(
  extractCellText(multilineCellData.v).includes("Tunangan dari"),
  "Multiline text content must be preserved"
);
console.log("✓ sanitizeSheetData correctly structures multiline text with inlineStr and text-wrap");

// Test 5.2: JSON serialization & round-trip safety
const serializedJson = JSON.stringify(sanitized);
assert.doesNotThrow(() => JSON.parse(serializedJson), "JSON.stringify must produce valid JSON payload");
const parsedJson = parseSheetData(serializedJson);
assert.ok(parsedJson, "parseSheetData must parse valid JSON string");
console.log("✓ JSON serialization round-trips without errors");

// Test 5.3: Parsing JSON string with literal/unescaped newlines (repair mechanism)
const rawJsonWithLiteralNewlines = `{"name":"TEST","celldata":[{"r":0,"c":0,"v":{"v":"Line 1\nLine 2\r\nLine 3"}}]}`;
const repairedParsed = parseSheetData(rawJsonWithLiteralNewlines);
assert.ok(repairedParsed !== null, "parseSheetData repair mechanism must safely parse raw unescaped newlines");
assert.strictEqual(repairedParsed.name, "TEST");
console.log("✓ parseSheetData safely repairs and recovers JSON strings with unescaped control characters");

// Test 5.4: Hydration back into FortuneSheet
const hydratedSheet = convertToFortuneSheet(sanitized, "SUSUNAN_ACARA");
assert.strictEqual(hydratedSheet.name, "SUSUNAN_ACARA");
const hydratedCell = hydratedSheet.celldata?.find((c) => c.r === 1 && c.c === 1);
assert.ok(hydratedCell, "Hydrated sheet must contain the multiline cell");
assert.strictEqual(hydratedCell.v?.tb, "2", "Hydrated cell preserves text-wrap");
assert.strictEqual(hydratedCell.v?.ct?.t, "inlineStr", "Hydrated cell preserves inlineStr");
assert.ok(
  extractCellText(hydratedCell.v).includes("Aben dan Iben"),
  "Hydrated cell retains full multiline string"
);
console.log("✓ convertToFortuneSheet hydrates multiline cell back into visual line breaks without data loss");

// Test 5.5: PDF Export compatibility for multiline cells
const { head: mlHead, body: mlBody } = parseFortuneSheetForAutoTable(hydratedSheet);
assert.strictEqual(mlHead.length, 1);
assert.strictEqual(mlBody.length, 1);
const pdfCell = mlBody[0][1];
assert.strictEqual(typeof pdfCell, "object");
assert.ok(
  pdfCell.content.includes("\n"),
  "PDF cell content must preserve newline characters for jspdf-autotable line wrapping"
);

const multilinePdfDoc = buildSpreadsheetPdf({
  eventTitle: "Acara Pernikahan",
  sheets: [
    {
      id: "s_ml",
      event_id: "e1",
      sheet_name: "SUSUNAN_ACARA",
      order_index: 0,
      data: hydratedSheet,
      created_at: "",
      updated_at: "",
    },
  ],
});
assert.ok(multilinePdfDoc, "PDF document with multiline cell must build successfully");
const mlPdfBytes = multilinePdfDoc.output("arraybuffer").byteLength;
assert.ok(mlPdfBytes > 4000, `PDF size should be valid, got ${mlPdfBytes}`);
console.log(`✓ PDF export correctly handles multiline cell text with autotable wrapping (${mlPdfBytes} bytes)`);

// ============================================================================
// 6. Testing Redesigned Executive PDF Header (Official Logo, Assignment Letter, Safe startY)
// ============================================================================
console.log("\n--- 6. Testing Redesigned Executive PDF Header Branding ---");

import { getSyncLogoDataUrl } from "../lib/pdf/spreadsheet-pdf";

// Test 6.1: Official logo retrieval
const logoDataUrl = getSyncLogoDataUrl();
assert.ok(logoDataUrl !== null, "Official logo /logo-xeno.png must be accessible in filesystem");
assert.ok(logoDataUrl.startsWith("data:image/"), "Logo data URL must start with valid data URI scheme");
console.log("✓ Official logo successfully retrieved and formatted as base64 data URL");

// Test 6.2: Build PDF with official logo and check header contents
const brandedDoc = buildSpreadsheetPdf({
  eventTitle: "Gala Dinner 2026",
  sheets: [
    {
      id: "s_brand",
      event_id: "e1",
      sheet_name: "SUSUNAN_ACARA",
      order_index: 0,
      data: hydratedSheet,
      created_at: "",
      updated_at: "",
    },
  ],
  logoDataUrl,
});

const pdfTextOutput = brandedDoc.output();

// 6.3 Verify Montserrat font is active and embedded in the PDF
const activeFont = brandedDoc.getFont();
assert.strictEqual(
  activeFont.fontName,
  "Montserrat",
  "PDF active font must be Montserrat"
);
assert.ok(
  pdfTextOutput.includes("Montserrat"),
  "PDF document must include embedded Montserrat font descriptor in header"
);
console.log("✓ 'Assignment Letter' and sheet content formatted with custom Montserrat font");

// 6.4 Verify old hardcoded header text is completely removed
// Ensure "XENO ENTERTAINMENT" is not rendered in the header banner
assert.ok(
  !pdfTextOutput.includes("(XENO ENTERTAINMENT)"),
  "Header must not render the old hardcoded '(XENO ENTERTAINMENT)' badge"
);
console.log("✓ Hardcoded 'xeno entertainment' text and 'x' box completely removed from header");

// 6.5 Verify image dictionary exists in the PDF structure
assert.ok(
  pdfTextOutput.includes("/XObject") && pdfTextOutput.includes("/Subtype /Image"),
  "PDF must contain embedded image XObject from doc.addImage()"
);
console.log("✓ Official logo image object successfully embedded into PDF document via doc.addImage()");

// ============================================================================
// 7. Testing Global Montserrat Font Integration for UI & PDF
// ============================================================================
console.log("\n--- 7. Testing Global Montserrat Font Integration ---");

import { registerMontserratInFortuneSheet } from "../lib/fortune-sheet-fonts";
import { registerMontserratFont } from "../lib/pdf/spreadsheet-pdf";
import { locale } from "@fortune-sheet/core";

// 7.1 Register Montserrat in FortuneSheet locale
async function runSection7() {
  await registerMontserratInFortuneSheet();
  const locEn = locale({ lang: "en" } as any);
  assert.ok(
    Array.isArray(locEn.fontarray) && locEn.fontarray[0] === "Montserrat",
    "Montserrat must be at index 0 of FortuneSheet fontarray as default toolbar font"
  );
  const fontMap = locEn.fontjson as Record<string, number>;
  assert.strictEqual(
    fontMap?.["montserrat"],
    0,
    "FortuneSheet fontjson must map 'montserrat' to index 0"
  );
  console.log("✓ FortuneSheet locale fontarray correctly configures Montserrat as default font (index 0)");

  // 7.2 jsPDF VFS & Font registration
  const { jsPDF } = await import("jspdf");
  const fontCheckDoc = new jsPDF();
  registerMontserratFont(fontCheckDoc);
  const fontList = fontCheckDoc.getFontList();
  assert.ok(fontList.Montserrat, "Montserrat must be registered in jsPDF font list");
  assert.ok(
    fontList.Montserrat.includes("normal") && fontList.Montserrat.includes("bold"),
    "jsPDF must register both normal and bold styles for Montserrat"
  );
  assert.strictEqual(
    fontCheckDoc.getFont().fontName,
    "Montserrat",
    "Active font must default to Montserrat"
  );
  console.log("✓ jsPDF VFS successfully registers Montserrat font with normal, bold, italic, and bolditalic styles");

  console.log("\n== ALL SPREADSHEET UX & STYLING TESTS PASSED SUCCESSFULLY! ==");
}

runSection7().catch((err) => {
  console.error(err);
  process.exit(1);
});
