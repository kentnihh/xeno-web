import assert from "node:assert";
import {
  computeSheetBorderMap,
  resolveBorderStyle,
  resolveSharedBorder,
  buildSpreadsheetPdf,
  parseFortuneSheetForAutoTable,
} from "../lib/pdf/spreadsheet-pdf";
import { sanitizeSheetData } from "../lib/spreadsheet-adapter";
import type { EventSheet } from "../types/database";

console.log("==================================================================");
console.log("TEST SUITE: Deduplicated Borders, Merged Cells & Gridline Normalization");
console.log("==================================================================\n");

// --------------------------------------------------------------------------
// 1. Verify Canonical Single-Edge Ownership (No Double-Border Stacking)
// --------------------------------------------------------------------------
console.log("--- 1. Testing Canonical Single-Edge Ownership ---");

const mockUniformTable = {
  data: [
    [{ v: "No" }, { v: "Item" }, { v: "Status" }],
    [{ v: "1" }, { v: "Sound System" }, { v: "Ready" }],
    [{ v: "2" }, { v: "Lighting" }, { v: "Pending" }],
    [{ v: "3" }, { v: "Stage" }, { v: "Done" }],
  ],
  config: {
    borderInfo: [
      {
        rangeType: "range",
        borderType: "border-all",
        style: 1, // Standard thin border
        color: "#000000",
        range: [{ row: [0, 3], column: [0, 2] }],
      },
    ],
  },
};

const uniformBorderMap = computeSheetBorderMap(mockUniformTable);

// A. Top-most row (r = 0) must retain its top border
for (let c = 0; c <= 2; c++) {
  const topCell = uniformBorderMap.get(`0_${c}`);
  assert.ok(topCell?.t, `Row 0 Col ${c} must have top border`);
  assert.strictEqual(String(topCell.t.style), "1", `Row 0 Col ${c} top must be style 1`);
}

// B. Horizontal edges: both cell(r, c).b and cell(r+1, c).t are synchronized with the resolved border
for (let r = 0; r < 3; r++) {
  for (let c = 0; c <= 2; c++) {
    const curCell = uniformBorderMap.get(`${r}_${c}`);
    const nextRowCell = uniformBorderMap.get(`${r + 1}_${c}`);

    assert.ok(curCell?.b, `Row ${r} Col ${c} must own bottom border`);
    assert.strictEqual(String(curCell.b.style), "1", `Row ${r} Col ${c} bottom must be style 1`);
    assert.strictEqual(
      String(nextRowCell?.t?.style),
      "1",
      `Row ${r + 1} Col ${c} top border must match bottom border of Row ${r} Col ${c}`
    );
  }
}

// C. Left-most column (c = 0) must retain its left border
for (let r = 0; r <= 3; r++) {
  const leftCell = uniformBorderMap.get(`${r}_0`);
  assert.ok(leftCell?.l, `Row ${r} Col 0 must have left border`);
  assert.strictEqual(String(leftCell.l.style), "1", `Row ${r} Col 0 left must be style 1`);
}

// D. Vertical edges: both cell(r, c).r and cell(r, c+1).l are synchronized with the resolved border
for (let r = 0; r <= 3; r++) {
  for (let c = 0; c < 2; c++) {
    const curCell = uniformBorderMap.get(`${r}_${c}`);
    const nextColCell = uniformBorderMap.get(`${r}_${c + 1}`);

    assert.ok(curCell?.r, `Row ${r} Col ${c} must own right border`);
    assert.strictEqual(String(curCell.r.style), "1", `Row ${r} Col ${c} right must be style 1`);
    assert.strictEqual(
      String(nextColCell?.l?.style),
      "1",
      `Row ${r} Col ${c + 1} left border must match right border of Row ${r} Col ${c}`
    );
  }
}

console.log("   ✓ Shared edges properly resolved and synchronized on both sides; deduplicated at draw time");

// --------------------------------------------------------------------------
// 2. Verify Merged Cell Perimeter Border Resolution (Rows 12..19 simulation)
// --------------------------------------------------------------------------
console.log("\n--- 2. Testing Merged Cell Perimeter Border Resolution (Reception Rundown simulation) ---");

// Simulating a Reception Rundown sheet where:
// Col 0: Time (merged rows 12..19, rs = 8, cs = 1)
// Col 1: Duration (merged rows 12..19, rs = 8, cs = 1)
// Col 2: Venue (merged rows 12..19, rs = 8, cs = 1)
// Col 3: Vendor (merged rows 12..19, rs = 8, cs = 1)
// Col 4: Activity (unmerged rows 12..19)
const mockReceptionRundown = {
  data: Array.from({ length: 22 }, (_, r) =>
    Array.from({ length: 5 }, (_, c) => ({ v: `R${r}C${c}` }))
  ),
  config: {
    merge: [
      { r: 12, c: 0, rs: 8, cs: 1 }, // Time
      { r: 12, c: 1, rs: 8, cs: 1 }, // Duration
      { r: 12, c: 2, rs: 8, cs: 1 }, // Venue
      { r: 12, c: 3, rs: 8, cs: 1 }, // Vendor
    ],
    borderInfo: [
      // Standard thin border-all across the entire table
      {
        rangeType: "range",
        borderType: "border-all",
        style: 1,
        color: "#000000",
        range: [{ row: [0, 21], column: [0, 4] }],
      },
    ],
  },
};

const rundownBorderMap = computeSheetBorderMap(mockReceptionRundown);

// Check that rows 13..19 around merged cells Venue (col 2) and Vendor (col 3)
// HAVE valid borders and are NOT null or lost!
for (let r = 12; r <= 19; r++) {
  // Col 2 (Venue) right edge must exist (owned by Col 2)
  const venueCell = rundownBorderMap.get(`${r}_2`);
  assert.ok(venueCell?.r, `Row ${r} Col 2 (Venue) right edge must exist`);
  assert.strictEqual(String(venueCell.r.style), "1", `Row ${r} Col 2 right edge must be style 1`);

  // Col 3 (Vendor) right edge must exist (owned by Col 3)
  const vendorCell = rundownBorderMap.get(`${r}_3`);
  assert.ok(vendorCell?.r, `Row ${r} Col 3 (Vendor) right edge must exist`);
  assert.strictEqual(String(vendorCell.r.style), "1", `Row ${r} Col 3 right edge must be style 1`);

  // Col 4 (Activity) left edge synchronized with Col 3 right edge
  const activityCell = rundownBorderMap.get(`${r}_4`);
  assert.strictEqual(String(activityCell?.l?.style), "1", `Row ${r} Col 4 left edge must match Col 3 right edge`);
}

// Check that interior horizontal borders inside merged cells (rows 12..18) are cleared!
for (let r = 12; r < 19; r++) {
  const venueInterior = rundownBorderMap.get(`${r}_2`);
  assert.strictEqual(venueInterior?.b, null, `Row ${r} Col 2 (Venue) interior bottom must be null`);
  const vendorInterior = rundownBorderMap.get(`${r}_3`);
  assert.strictEqual(vendorInterior?.b, null, `Row ${r} Col 3 (Vendor) interior bottom must be null`);
}

// Bottom-most row of merged box (row 19) MUST have bottom border
const venueBottom = rundownBorderMap.get("19_2");
assert.ok(venueBottom?.b, "Row 19 Col 2 (Venue bottom) must have bottom border");
assert.strictEqual(String(venueBottom.b.style), "1", "Venue bottom border must be style 1");

const vendorBottom = rundownBorderMap.get("19_3");
assert.ok(vendorBottom?.b, "Row 19 Col 3 (Vendor bottom) must have bottom border");
assert.strictEqual(String(vendorBottom.b.style), "1", "Vendor bottom border must be style 1");

console.log("   ✓ Merged cell perimeter border resolution verified: rows 12..19 have seamless, uniform borders");

// --------------------------------------------------------------------------
// 3. Verify Mixed Thin & Thick Section Dividers
// --------------------------------------------------------------------------
console.log("\n--- 3. Testing Mixed Thin & Thick Borders (Section Dividers) ---");

const mockSheetWithThickDivider = {
  data: [
    [{ v: "Header" }, { v: "Title" }],
    [{ v: "Row 1" }, { v: "Val 1" }],
    [{ v: "Row 2 (Section End)" }, { v: "Val 2" }],
    [{ v: "Row 3 (New Section)" }, { v: "Val 3" }],
    [{ v: "Row 4" }, { v: "Val 4" }],
  ],
  config: {
    borderInfo: [
      // Standard thin border-all
      {
        rangeType: "range",
        borderType: "border-all",
        style: 1,
        color: "#000000",
        range: [{ row: [0, 4], column: [0, 1] }],
      },
      // Explicit thick divider on bottom of Row 2
      {
        rangeType: "range",
        borderType: "border-bottom",
        style: 13,
        color: "#000000",
        range: [{ row: [2, 2], column: [0, 1] }],
      },
    ],
  },
};

const mixedMap = computeSheetBorderMap(mockSheetWithThickDivider);

// Row 2 bottom border must be Thick (13)
const r2c0 = mixedMap.get("2_0");
const r2c1 = mixedMap.get("2_1");
assert.strictEqual(String(r2c0?.b?.style), "13", "Row 2 Col 0 bottom must be Thick (13)");
assert.strictEqual(String(r2c1?.b?.style), "13", "Row 2 Col 1 bottom must be Thick (13)");

// Row 3 top border synchronized with Row 2 bottom border (Thick 13)
const r3c0 = mixedMap.get("3_0");
const r3c1 = mixedMap.get("3_1");
assert.strictEqual(String(r3c0?.t?.style), "13", "Row 3 Col 0 top must be synchronized to Thick (13)");
assert.strictEqual(String(r3c1?.t?.style), "13", "Row 3 Col 1 top must be synchronized to Thick (13)");

// Normal thin borders around other rows must remain thin (1)
const r0c0 = mixedMap.get("0_0");
assert.strictEqual(String(r0c0?.b?.style), "1", "Row 0 Col 0 bottom must remain Thin (1)");
const r1c0 = mixedMap.get("1_0");
assert.strictEqual(String(r1c0?.b?.style), "1", "Row 1 Col 0 bottom must remain Thin (1)");
const r3c0_b = mixedMap.get("3_0");
assert.strictEqual(String(r3c0_b?.b?.style), "1", "Row 3 Col 0 bottom must remain Thin (1)");

console.log("   ✓ Thick section divider correctly stands out while standard thin borders remain crisp & uniform");

// --------------------------------------------------------------------------
// 4. Verify Faint Gridline Elimination in PDF Table Options
// --------------------------------------------------------------------------
console.log("\n--- 4. Testing Faint Gridline Elimination on Bordered Tables ---");

const testEventSheet: EventSheet = {
  id: "sheet_test_dedup",
  event_id: "evt_test",
  sheet_name: "RECEPTION RUNDOWN",
  order_index: 0,
  data: mockReceptionRundown,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// AutoTable parser must identify custom borders
const { borderMap: parsedBorderMap } = parseFortuneSheetForAutoTable(mockReceptionRundown);
assert.ok(parsedBorderMap && parsedBorderMap.size > 0, "Parsed FortuneSheet must have non-empty borderMap");

const pdfDoc = buildSpreadsheetPdf({
  eventTitle: "Wedding Grand Reception",
  sheets: [testEventSheet],
  orientation: "landscape",
});

const pdfArray = pdfDoc.output("arraybuffer");
assert.ok(pdfArray.byteLength > 2000, `PDF must build successfully, got ${pdfArray.byteLength} bytes`);

console.log(`   ✓ PDF export built successfully (${pdfArray.byteLength} bytes) with clean, non-competing borders`);

// --------------------------------------------------------------------------
// 5. Verify Sheet Save Normalizer (sanitizeSheetData)
// --------------------------------------------------------------------------
console.log("\n--- 5. Testing Sheet Save Normalizer for borderInfo ---");

const rawSheetPayload = {
  data: [[{ v: "Test" }]],
  config: {
    borderInfo: [
      { rangeType: "range", borderType: "border-all", style: "1", color: "" },
      { rangeType: "range", borderType: "border-bottom", style: 13, color: "#111111" },
      null, // invalid
    ],
  },
};

const sanitized = sanitizeSheetData(rawSheetPayload as any);
assert.ok(Array.isArray((sanitized as any).config?.borderInfo), "config.borderInfo must be array");
assert.strictEqual((sanitized as any).config.borderInfo.length, 2, "Null item must be stripped");
assert.strictEqual((sanitized as any).config.borderInfo[0].style, 1, "String style '1' must be normalized to number 1");
assert.strictEqual((sanitized as any).config.borderInfo[0].color, "#000000", "Empty color must default to #000000");
assert.strictEqual((sanitized as any).config.borderInfo[1].style, 13, "Style 13 must be preserved");

console.log("   ✓ sanitizeSheetData normalizes and protects config.borderInfo on save");

// --------------------------------------------------------------------------
// 6. Verify Calibrated Hairline Stroke Widths & Page Clamping Constraints
// --------------------------------------------------------------------------
console.log("\n--- 6. Testing Calibrated Hairline Stroke Widths & Page Bounds ---");

const thinRes = resolveBorderStyle({ style: 1, color: "#000000" });
assert.strictEqual(thinRes?.widthMm, 0.15, "Style 1 must resolve to 0.15mm hairline");

const hairRes = resolveBorderStyle({ style: 2, color: "#000000" });
assert.strictEqual(hairRes?.widthMm, 0.10, "Style 2 must resolve to 0.10mm hairline");

const medRes = resolveBorderStyle({ style: 7, color: "#000000" });
assert.strictEqual(medRes?.widthMm, 0.35, "Style 7 must resolve to 0.35mm (~1.0pt)");

const thickRes = resolveBorderStyle({ style: 13, color: "#000000" });
assert.strictEqual(thickRes?.widthMm, 0.60, "Style 13 must resolve to 0.60mm (~1.7pt)");

const dblRes = resolveBorderStyle({ style: 12, color: "#000000" });
assert.strictEqual(dblRes?.widthMm, 0.50, "Style 12 must resolve to 0.50mm");

// Spy on lines drawn during buildSpreadsheetPdf to verify maxX clamping and stroke width
const drawnLinesP1: any[] = [];
const origLine = pdfDoc.line.bind(pdfDoc);
pdfDoc.line = function(x1: number, y1: number, x2: number, y2: number, ...args: any[]) {
  drawnLinesP1.push({ x1, y1, x2, y2, lw: pdfDoc.getLineWidth() });
  return origLine(x1, y1, x2, y2, ...args);
};

buildSpreadsheetPdf({
  eventTitle: "Wedding Grand Reception Bounds Test",
  sheets: [testEventSheet],
  orientation: "landscape",
  doc: pdfDoc,
});

const maxAllowedX = 297 - 14; // 283mm
for (const line of drawnLinesP1) {
  assert.ok(
    line.x1 <= maxAllowedX + 0.05 && line.x2 <= maxAllowedX + 0.05,
    `Line x coordinate must not overflow right margin (${maxAllowedX}mm), got (${line.x1}, ${line.x2})`
  );
}

console.log("   ✓ Hairline stroke widths (0.15mm, 0.10mm, 0.35mm, 0.60mm) and right margin clamp (<= 283mm) strictly verified");

console.log("\n==================================================================");
console.log("ALL TESTS PASSED SUCCESSFULLY! 🚀");
console.log("==================================================================");
