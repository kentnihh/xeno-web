/**
 * Comprehensive Test Suite for 1:1 FortuneSheet to PDF Reflection:
 * 1. Data Shifting & Column Alignment (Null / Empty Cells / Shorter Row Arrays).
 * 2. Merged Cells (ColSpan & RowSpan from config.merge and cell.mc, with subordinate cell skipping).
 * 3. Exact Styling (Removed forced dark slate header, exact bg and fc on row 0 & body, fontStyle, halign).
 */

import assert from "node:assert";
import { parseFortuneSheetForAutoTable, buildSpreadsheetPdf } from "../lib/pdf/spreadsheet-pdf";
import type { EventSheet } from "../types/database";

console.log("== Testing 1:1 FortuneSheet to PDF Reflection ==\n");

// ============================================================================
// 1. Data Shifting & Null / Empty Cell Handling
// ============================================================================
console.log("--- 1. Testing Data Shifting & Null/Empty Cell Handling ---");

// Simulating a sheet where:
// - Row 0 has 5 columns (Header 0..4)
// - Row 1 has a null at col 1, value at col 2, null at col 3, value at col 4
// - Row 2 has array length 2 (shorter than total columns)
// - Row 3 has all nulls
const sheetWithGaps = {
  name: "GAPS_TEST",
  data: [
    // Row 0: 5 columns
    [
      { v: "Col 0" },
      { v: "Col 1" },
      { v: "Col 2" },
      { v: "Col 3" },
      { v: "Col 4" },
    ],
    // Row 1: contains nulls
    [
      { v: "R1-C0" },
      null,
      { v: "R1-C2" },
      undefined,
      { v: "R1-C4" },
    ],
    // Row 2: shorter array length (only 2 elements for 5 columns)
    [
      { v: "R2-C0" },
      { v: "R2-C1" },
    ],
    // Row 3: all nulls except last column
    [
      null,
      null,
      null,
      null,
      { v: "R3-C4" },
    ],
  ],
};

const parsedGaps = parseFortuneSheetForAutoTable(sheetWithGaps);

assert.strictEqual(parsedGaps.head.length, 1, "Head must have 1 row");
assert.strictEqual(parsedGaps.head[0].length, 5, "Head must have exactly 5 columns");
assert.strictEqual(parsedGaps.body.length, 3, "Body must have 3 rows");

// Verify Row 1 (Body row 0): exactly 5 cells, nulls/undefined converted to empty cells
const bodyRow0 = parsedGaps.body[0];
assert.strictEqual(bodyRow0.length, 5, "Row 1 must have exactly 5 cells, matching total columns");
assert.strictEqual(bodyRow0[0].content, "R1-C0");
assert.strictEqual(bodyRow0[1].content, "", "Col 1 null must become empty cell");
assert.strictEqual(bodyRow0[2].content, "R1-C2", "Col 2 value must stay at index 2 (NOT shifted to 1)");
assert.strictEqual(bodyRow0[3].content, "", "Col 3 undefined must become empty cell");
assert.strictEqual(bodyRow0[4].content, "R1-C4", "Col 4 value must stay at index 4 (NOT shifted left)");

// Verify Row 2 (Body row 1): shorter array padded to 5 columns
const bodyRow1 = parsedGaps.body[1];
assert.strictEqual(bodyRow1.length, 5, "Row 2 (shorter array) must be padded to 5 columns");
assert.strictEqual(bodyRow1[0].content, "R2-C0");
assert.strictEqual(bodyRow1[1].content, "R2-C1");
assert.strictEqual(bodyRow1[2].content, "", "Col 2 must be empty cell");
assert.strictEqual(bodyRow1[3].content, "", "Col 3 must be empty cell");
assert.strictEqual(bodyRow1[4].content, "", "Col 4 must be empty cell");

// Verify Row 3 (Body row 2): leading nulls do NOT shift R3-C4 to the left
const bodyRow2 = parsedGaps.body[2];
assert.strictEqual(bodyRow2.length, 5, "Row 3 must have 5 columns");
assert.strictEqual(bodyRow2[0].content, "");
assert.strictEqual(bodyRow2[1].content, "");
assert.strictEqual(bodyRow2[2].content, "");
assert.strictEqual(bodyRow2[3].content, "");
assert.strictEqual(bodyRow2[4].content, "R3-C4", "R3-C4 must remain in column 4");

console.log("✓ Null/empty cells and short row arrays iterate up to max columns without data shifting");

// ============================================================================
// 2. Merged Cells (ColSpan & RowSpan from config.merge and cell.mc)
// ============================================================================
console.log("\n--- 2. Testing Merged Cells Handling (config.merge and cell.mc) ---");

// Test 2.1: Merge defined via config.merge
const sheetWithConfigMerge = {
  name: "CONFIG_MERGE_TEST",
  data: [
    // Row 0: Merged header (A1:B1) and normal C1
    [
      { v: "Merged Header A1:B1" },
      null,
      { v: "Header C1" },
    ],
    // Row 1: Merged body 2x2 (A2:B3) and normal C2
    [
      { v: "2x2 Block" },
      null,
      { v: "C2" },
    ],
    // Row 2: A3:B3 covered by 2x2 Block, only C3 has content
    [
      null,
      null,
      { v: "C3" },
    ],
  ],
  config: {
    merge: {
      "0_0": { r: 0, c: 0, rs: 1, cs: 2 },
      "1_0": { r: 1, c: 0, rs: 2, cs: 2 },
    },
  },
};

const parsedConfigMerge = parseFortuneSheetForAutoTable(sheetWithConfigMerge);

// Row 0 Header: cell 0 has colSpan 2, cell 1 (col 1) is skipped, cell 2 (col 2) is present
assert.strictEqual(parsedConfigMerge.head[0].length, 2, "Merged header row has 2 cell entries (col 1 skipped)");
assert.strictEqual(parsedConfigMerge.head[0][0].content, "Merged Header A1:B1");
assert.strictEqual(parsedConfigMerge.head[0][0].colSpan, 2);
assert.strictEqual(parsedConfigMerge.head[0][1].content, "Header C1");

// Row 1 Body: cell 0 has rowSpan 2 and colSpan 2, cell 1 (col 1) is skipped, cell 2 is C2
assert.strictEqual(parsedConfigMerge.body[0].length, 2);
assert.strictEqual(parsedConfigMerge.body[0][0].content, "2x2 Block");
assert.strictEqual(parsedConfigMerge.body[0][0].rowSpan, 2);
assert.strictEqual(parsedConfigMerge.body[0][0].colSpan, 2);
assert.strictEqual(parsedConfigMerge.body[0][1].content, "C2");

// Row 2 Body: cols 0 and 1 are covered by rowSpan 2 above! Only C3 should be present
assert.strictEqual(parsedConfigMerge.body[1].length, 1, "Subordinate cells in Row 2 must be skipped");
assert.strictEqual(parsedConfigMerge.body[1][0].content, "C3");

console.log("✓ config.merge accurately sets colSpan and rowSpan while skipping subordinate cells");

// Test 2.2: Merge defined via cell.mc property
const sheetWithMcMerge = {
  name: "MC_MERGE_TEST",
  data: [
    [
      { v: "MC Merged Title", mc: { r: 0, c: 0, rs: 1, cs: 3 } },
      { mc: { r: 0, c: 0 } },
      { mc: { r: 0, c: 0 } },
      { v: "Normal D1" },
    ],
    [
      { v: "D2-A" },
      { v: "D2-B" },
      { v: "D2-C" },
      { v: "D2-D" },
    ],
  ],
};

const parsedMcMerge = parseFortuneSheetForAutoTable(sheetWithMcMerge);
assert.strictEqual(parsedMcMerge.head[0].length, 2, "Row 0 has 2 entries: merged root (cs 3) and D1");
assert.strictEqual(parsedMcMerge.head[0][0].content, "MC Merged Title");
assert.strictEqual(parsedMcMerge.head[0][0].colSpan, 3);
assert.strictEqual(parsedMcMerge.head[0][1].content, "Normal D1");
assert.strictEqual(parsedMcMerge.body[0].length, 4, "Row 1 has 4 unmerged columns");

console.log("✓ cell.mc merge metadata accurately sets colSpan and skips subordinate cells");

// ============================================================================
// 3. Exact Styling (Removed Forced Dark Header, Exact bg, fc, fontStyle, halign)
// ============================================================================
console.log("\n--- 3. Testing Exact Styling (Removed Forced Dark Header, Exact bg & fc) ---");

const sheetWithExactStyles = {
  name: "EXACT_STYLES",
  data: [
    // Row 0: Custom Header (Soft yellow background #fef08a, deep amber text #854d0e, center aligned, bold)
    [
      { v: "Kategori", bg: "#fef08a", fc: "#854d0e", bl: 1, ht: 0 },
      // Unstyled header cell (should NOT be forced to dark slate; defaults to black text)
      { v: "Deskripsi" },
      // Custom green header
      { v: "Status", bg: "#dcfce7", fc: "#166534", bl: 1, ht: 2 },
    ],
    // Row 1: Body row with italic, left alignment, and custom colors
    [
      { v: "Vendor Audio", bg: "#f0fdf4", fc: "#15803d", it: 1, ht: 1 },
      { v: "Line Array & Stage Monitor", fc: "#1e40af" },
      { v: "Confirmed", bg: "#22c55e", fc: "#ffffff", bl: 1, ht: 0 },
    ],
  ],
};

const parsedStyles = parseFortuneSheetForAutoTable(sheetWithExactStyles);

// Test Header Row 0 exact styles
const headerCol0 = parsedStyles.head[0][0];
assert.deepStrictEqual(headerCol0.styles?.fillColor, [254, 240, 138], "Header bg #fef08a");
assert.deepStrictEqual(headerCol0.styles?.textColor, [133, 77, 14], "Header fc #854d0e");
assert.strictEqual(headerCol0.styles?.fontStyle, "bold", "Header fontStyle bold");
assert.strictEqual(headerCol0.styles?.halign, "center", "Header halign center");

// Test Header Row 0 unstyled cell: textColor must default to black [0, 0, 0]
const headerCol1 = parsedStyles.head[0][1];
assert.strictEqual(headerCol1.styles?.fillColor, undefined, "Unstyled header has no custom fillColor");
assert.deepStrictEqual(headerCol1.styles?.textColor, [0, 0, 0], "Unstyled header textColor defaults to black");
assert.strictEqual(headerCol1.styles?.fontStyle, "bold", "Header default fontStyle is bold");

// Test Header Row 0 green cell: right aligned
const headerCol2 = parsedStyles.head[0][2];
assert.deepStrictEqual(headerCol2.styles?.fillColor, [220, 252, 231], "Header bg #dcfce7");
assert.deepStrictEqual(headerCol2.styles?.textColor, [22, 101, 52], "Header fc #166534");
assert.strictEqual(headerCol2.styles?.halign, "right", "Header halign right");

// Test Body Row 1 exact styles
const bodyCol0 = parsedStyles.body[0][0];
assert.deepStrictEqual(bodyCol0.styles?.fillColor, [240, 253, 244], "Body bg #f0fdf4");
assert.deepStrictEqual(bodyCol0.styles?.textColor, [21, 128, 61], "Body fc #15803d");
assert.strictEqual(bodyCol0.styles?.fontStyle, "italic", "Body fontStyle italic");
assert.strictEqual(bodyCol0.styles?.halign, "left", "Body halign left");

const bodyCol2 = parsedStyles.body[0][2];
assert.deepStrictEqual(bodyCol2.styles?.fillColor, [34, 197, 94], "Body bg #22c55e");
assert.deepStrictEqual(bodyCol2.styles?.textColor, [255, 255, 255], "Body fc #ffffff");
assert.strictEqual(bodyCol2.styles?.fontStyle, "bold", "Body fontStyle bold");
assert.strictEqual(bodyCol2.styles?.halign, "center", "Body halign center");

console.log("✓ Header and body cells extract exact bg, fc, fontStyle, and halign");

// ============================================================================
// 4. Letterhead Header Layout & Text Cleanup Verification
// ============================================================================
console.log("\n--- 4. Testing Letterhead Header Layout & Text Cleanup ---");

import { jsPDF } from "jspdf";
import { renderSheetHeader, registerMontserratFont } from "../lib/pdf/spreadsheet-pdf";

const mockDoc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
registerMontserratFont(mockDoc);
const textCalls: any[] = [];
const imageCalls: any[] = [];
const lineCalls: any[] = [];

mockDoc.text = function (...args: any[]) {
  textCalls.push(args);
  return mockDoc;
};
mockDoc.addImage = function (...args: any[]) {
  imageCalls.push(args);
  return mockDoc;
};
mockDoc.line = function (...args: any[]) {
  lineCalls.push(args);
  return mockDoc;
};

const fakeLogoDataUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
const startYResult = renderSheetHeader(
  mockDoc,
  "Sinar Jaya Annual Gala 2026",
  "CHECKLIST",
  297,
  14,
  269,
  "17/10/2026, 20:00",
  fakeLogoDataUrl
);

// 1. Logo left-aligned at marginX (14)
assert.strictEqual(imageCalls.length, 1, "Must draw 1 logo image");
assert.strictEqual(imageCalls[0][1], "PNG");
assert.strictEqual(imageCalls[0][2], 14, "Logo X coordinate must be marginX (14)");
assert.strictEqual(imageCalls[0][3], 9, "Logo Y coordinate must be 9");

// 2. Title & Sheet name positioned to the right of the logo (e.g. textX = 43)
const titleCall = textCalls.find((c) => c[0] === "Assignment Letter");
assert.ok(titleCall, "Must render 'Assignment Letter' title");
assert.strictEqual(titleCall[1], 43, "Title must sit to the right of the logo (X=43)");

const sheetCall = textCalls.find((c) => c[0] === "CHECKLIST");
assert.ok(sheetCall, "Must render 'CHECKLIST' under the title");
assert.strictEqual(sheetCall[1], 43, "Sheet name must align at textX (43)");

// 3. Text Cleanup: NO 'Sheet: ' prefix
assert.ok(
  !textCalls.some((c) => String(c[0]).includes("Sheet:")),
  "Must NOT render 'Sheet:' prefix anywhere"
);

// 4. Text Cleanup: NO 'Dicetak:' date string
assert.ok(
  !textCalls.some((c) => String(c[0]).includes("Dicetak:")),
  "Must NOT render 'Dicetak:' date string anywhere"
);

// 5. Hairline divider line rendered below logo and text
assert.strictEqual(lineCalls.length, 1, "Must draw 1 hairline divider");
assert.strictEqual(lineCalls[0][0], 14, "Divider starts at marginX");
assert.strictEqual(lineCalls[0][2], 14 + 269, "Divider ends at marginX + contentWidth");

// 6. startY for autoTable is nicely adjusted below the divider (e.g. 40mm)
assert.ok(
  startYResult >= 38 && startYResult <= 42,
  `startY must be nicely proportioned below header (~40mm), got ${startYResult}`
);

console.log("✓ Logo left-aligned (X=14), title & sheet name placed beside logo (X=43)");
console.log("✓ 'Sheet:' prefix and 'Dicetak:' print date completely removed");
console.log(`✓ autoTable startY correctly calculated (${startYResult}mm) below header layout`);

// ============================================================================
// 5. End-to-End PDF Generation with Multiple Sheets
// ============================================================================
console.log("\n--- 5. Testing End-to-End PDF Document Build ---");

const testSheets: EventSheet[] = [
  {
    id: "s_gaps",
    event_id: "e_test",
    sheet_name: "LEMBAR_GAPS",
    order_index: 0,
    data: sheetWithGaps,
    created_at: "",
    updated_at: "",
  },
  {
    id: "s_merge",
    event_id: "e_test",
    sheet_name: "LEMBAR_MERGE",
    order_index: 1,
    data: sheetWithConfigMerge,
    created_at: "",
    updated_at: "",
  },
  {
    id: "s_styles",
    event_id: "e_test",
    sheet_name: "LEMBAR_STYLES",
    order_index: 2,
    data: sheetWithExactStyles,
    created_at: "",
    updated_at: "",
  },
];

const generatedDoc = buildSpreadsheetPdf({
  eventTitle: "Gala Dinner Exact PDF Test",
  sheets: testSheets,
  orientation: "landscape",
});

assert.ok(generatedDoc !== null, "PDF Document must be created");
assert.strictEqual(generatedDoc.getNumberOfPages(), 3, "Must generate 3 pages for 3 sheets");
const pdfBytes = generatedDoc.output("arraybuffer").byteLength;
assert.ok(pdfBytes > 10000, `PDF size must be valid (>10000 bytes, got ${pdfBytes})`);

console.log(`✓ End-to-end PDF build succeeded: 3 sheets rendered with exact 1:1 styling (${pdfBytes} bytes)`);

console.log("\n== ALL 1:1 SPREADSHEET REFLECTION TESTS PASSED SUCCESSFULLY! 🚀 ==");
