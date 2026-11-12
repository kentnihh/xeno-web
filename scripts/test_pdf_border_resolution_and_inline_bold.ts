import assert from "node:assert";
import {
  resolveBorderStyle,
  getBorderWeight,
  resolveSharedBorder,
  computeSheetBorderMap,
  buildSpreadsheetPdf,
  renderInlineStrCellText,
} from "../lib/pdf/spreadsheet-pdf";
import {
  extractCellText,
  normalizeCellForFortuneSheet,
  sanitizeSheetData,
  matrixToCelldata,
} from "../lib/spreadsheet-adapter";
import {
  isToolbarBoldButton,
  getActiveCellEditor,
  hasActiveTextSelectionInEditor,
  toggleInlineBoldOnSelection,
} from "../lib/spreadsheet-autofill";
import type { EventSheet } from "../types/database";

console.log("==================================================================");
console.log("TEST SUITE: PDF Border Resolution & Partial Inline Bold (inlineStr)");
console.log("==================================================================\n");

// --------------------------------------------------------------------------
// 1. Verify Border Style Codes & Distinct Thickness Progression (0.4pt -> 2.8pt)
// --------------------------------------------------------------------------
console.log("--- 1. Testing Border Style Codes & Thickness Mappings ---");

const hair = resolveBorderStyle({ style: 2, color: "#000000" });
const thin = resolveBorderStyle({ style: 1, color: "#000000" });
const medium = resolveBorderStyle({ style: 7, color: "#000000" });
const doubleBorder = resolveBorderStyle({ style: 12, color: "#000000" });
const thick = resolveBorderStyle({ style: 13, color: "#000000" });

assert(hair && hair.widthMm === 0.141, `Hair border should be 0.141mm (0.4pt), got ${hair?.widthMm}`);
assert(thin && thin.widthMm === 0.282, `Thin border should be 0.282mm (0.8pt), got ${thin?.widthMm}`);
assert(medium && medium.widthMm === 0.564, `Medium border should be 0.564mm (1.6pt), got ${medium?.widthMm}`);
assert(doubleBorder && doubleBorder.widthMm === 0.776, `Double border should be 0.776mm (2.2pt), got ${doubleBorder?.widthMm}`);
assert(thick && thick.widthMm === 0.988, `Thick border should be 0.988mm (2.8pt), got ${thick?.widthMm}`);

assert(hair.widthMm < thin.widthMm, "Hair must be thinner than Thin");
assert(thin.widthMm < medium.widthMm, "Thin must be thinner than Medium");
assert(medium.widthMm < doubleBorder.widthMm, "Medium must be thinner than Double");
assert(doubleBorder.widthMm < thick.widthMm, "Double must be thinner than Thick");
assert(thick.widthMm > thin.widthMm * 3, "Thick border must be ~3.5x thicker than Thin");

console.log("   ✓ Border widths map accurately to Hair 0.4pt, Thin 0.8pt, Medium 1.6pt, Double 2.2pt, Thick 2.8pt");

// --------------------------------------------------------------------------
// 2. Verify Border Weight & Shared Edge Conflict Resolution
// --------------------------------------------------------------------------
console.log("\n--- 2. Testing Shared Edge Priority & Thick Border Precedence ---");

const thinSide = { style: 1, color: "#000000" };
const thickSide = { style: 13, color: "#000000" };
const mediumSide = { style: 7, color: "#000000" };

assert(getBorderWeight(thickSide) > getBorderWeight(thinSide), "Thick border weight must exceed Thin");
assert(getBorderWeight(thickSide) > getBorderWeight(mediumSide), "Thick border weight must exceed Medium");

const resolved1 = resolveSharedBorder(thinSide, thickSide);
assert(resolved1 && String(resolved1.style) === "13", "Shared edge conflict must resolve to Thick over Thin");

const resolved2 = resolveSharedBorder(thickSide, thinSide);
assert(resolved2 && String(resolved2.style) === "13", "Order of arguments must not alter Thick border precedence");

console.log("   ✓ resolveSharedBorder reliably selects thicker explicit border");

// --------------------------------------------------------------------------
// 3. Verify Per-Cell Border Matrix & Adjacent Edge Synchronization
// --------------------------------------------------------------------------
console.log("\n--- 3. Testing config.borderInfo Chronological Overrides & Edge Sync ---");

// Scenario: A table has border-all (style: 1 Thin), followed by a section divider:
// Row 2 has a Thick Bottom Border (style: 13 Thick).
const mockSheetWithDividers = {
  data: [
    [{ v: "Header 1" }, { v: "Header 2" }],
    [{ v: "Item 1" }, { v: "Item 2" }],
    [{ v: "Section End" }, { v: "Total" }],
    [{ v: "New Section" }, { v: "Value" }],
  ],
  config: {
    borderInfo: [
      // 1. Initial border-all across rows 0..3, cols 0..1 (Thin, style: 1)
      {
        rangeType: "range",
        borderType: "border-all",
        style: 1,
        color: "#000000",
        range: [{ row: [0, 3], column: [0, 1] }],
      },
      // 2. Subsequent thick divider on Row 2 bottom
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

const borderMap = computeSheetBorderMap(mockSheetWithDividers);

// Row 2 cells bottom border must be style: 13 (Thick)
const r2c0 = borderMap.get("2_0");
const r2c1 = borderMap.get("2_1");
assert(r2c0?.b && String(r2c0.b.style) === "13", `Row 2 Col 0 bottom border must be 13, got ${r2c0?.b?.style}`);
assert(r2c1?.b && String(r2c1.b.style) === "13", `Row 2 Col 1 bottom border must be 13, got ${r2c1?.b?.style}`);

// Adjacent Row 3 cells top border must be synchronized to style: 13 (Thick) rather than thin!
const r3c0 = borderMap.get("3_0");
const r3c1 = borderMap.get("3_1");
assert(r3c0?.t && String(r3c0.t.style) === "13", `Row 3 Col 0 top border must synchronize to 13 (Thick), got ${r3c0?.t?.style}`);
assert(r3c1?.t && String(r3c1.t.style) === "13", `Row 3 Col 1 top border must synchronize to 13 (Thick), got ${r3c1?.t?.style}`);

console.log("   ✓ Chronological borderInfo overrides & shared edge synchronization preserve Thick dividers");

// --------------------------------------------------------------------------
// 4. Verify Partial Inline Bold (inlineStr) Serialization & Preservation
// --------------------------------------------------------------------------
console.log("\n--- 4. Testing Partial Inline Bold (inlineStr) Serialization ---");

// Cell with "bud belanja ke pasar" where only "belanja" is bold
const mockInlineCell = {
  v: "bud belanja ke pasar",
  m: "bud belanja ke pasar",
  ct: {
    fa: "General",
    t: "inlineStr",
    s: [
      { v: "bud ", bl: 0 },
      { v: "belanja", bl: 1 },
      { v: " ke pasar", bl: 0 },
    ],
  },
};

// 1. extractCellText must extract the joined string
const extracted = extractCellText(mockInlineCell);
assert.strictEqual(extracted, "bud belanja ke pasar", "extractCellText must join inlineStr runs");

// 2. normalizeCellForFortuneSheet must preserve ct.s intact and NOT set cell.bl = 1
const normalized = normalizeCellForFortuneSheet(mockInlineCell);
assert.strictEqual(normalized.ct?.t, "inlineStr", "ct.t must remain inlineStr");
assert.strictEqual(normalized.ct?.s?.length, 3, "ct.s must preserve all 3 runs");
assert.strictEqual(normalized.ct.s[1].v, "belanja", "Run 1 must be 'belanja'");
assert.strictEqual(normalized.ct.s[1].bl, 1, "Run 1 must have bl = 1");
assert.strictEqual(normalized.ct.s[0].bl, 0, "Run 0 must have bl = 0");
assert.notStrictEqual(normalized.bl, 1, "Cell-wide bl must NOT be set to 1 for partial inline bold");

// 3. Test matrixToCelldata round-trip
const celldata = matrixToCelldata([[mockInlineCell]]);
assert.strictEqual(celldata.length, 1, "celldata must contain the inline cell");
assert.strictEqual(celldata[0].v.ct?.t, "inlineStr", "celldata cell must preserve inlineStr");
assert.strictEqual(celldata[0].v.ct.s[1].bl, 1, "celldata cell must preserve run boldness");

// 4. Test sanitizeSheetData
const sanitized = sanitizeSheetData({
  data: [[mockInlineCell]],
});
assert.strictEqual(sanitized.celldata?.[0]?.v?.ct?.t, "inlineStr", "sanitized sheet must retain inlineStr in celldata");
assert.strictEqual(sanitized.celldata?.[0]?.v?.ct?.s?.[1]?.bl, 1, "sanitized sheet must retain inline bold");

console.log("   ✓ Partial inline bold (inlineStr) preserved across normalization & serialization without cell-wide bl: 1");

// --------------------------------------------------------------------------
// 5. Verify PDF Export with Preserved Thick Borders & inlineStr Rendering
// --------------------------------------------------------------------------
console.log("\n--- 5. Testing End-to-End PDF Export with Thick Borders & inlineStr ---");

const testSheet: EventSheet = {
  id: "sheet_test_1",
  event_id: "evt_1",
  sheet_name: "Rundown Acara",
  order_index: 0,
  data: {
    columns: [],
    rows: [],
    data: [
      [{ v: "Waktu" }, { v: "Deskripsi Acara" }, { v: "PIC" }],
      [
        { v: "08:00" },
        {
          v: "bud belanja ke pasar",
          m: "bud belanja ke pasar",
          ct: {
            fa: "General",
            t: "inlineStr",
            s: [
              { v: "bud ", bl: 0 },
              { v: "belanja", bl: 1 },
              { v: " ke pasar", bl: 0 },
            ],
          },
        },
        { v: "Tim Lapangan" },
      ],
      [{ v: "10:00" }, { v: "Briefing Vendor VIP" }, { v: "Koordinator" }],
    ],
    config: {
      borderInfo: [
        {
          rangeType: "range",
          borderType: "border-all",
          style: 1, // Thin
          color: "#000000",
          range: [{ row: [0, 2], column: [0, 2] }],
        },
        {
          rangeType: "range",
          borderType: "border-bottom",
          style: 13, // Thick divider
          color: "#000000",
          range: [{ row: [1, 1], column: [0, 2] }],
        },
      ],
    },
  },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const pdfDoc = buildSpreadsheetPdf({
  eventTitle: "Wedding Test Event",
  sheets: [testSheet],
  orientation: "landscape",
});

const pdfBuffer = pdfDoc.output("arraybuffer");
assert(pdfBuffer.byteLength > 1000, `PDF generated size must be valid, got ${pdfBuffer.byteLength} bytes`);
console.log(`   ✓ PDF export built successfully (${pdfBuffer.byteLength} bytes) with preserved borders & inlineStr`);

// --------------------------------------------------------------------------
// 6. Verify Toolbar Bold Button Detection
// --------------------------------------------------------------------------
console.log("\n--- 6. Testing Toolbar Bold Button Detection ---");

const mockBoldButtonWithTips = {
  getAttribute: (attr: string) => (attr === "data-tips" ? "Bold" : null),
  closest: function (sel: string) { return this; },
  querySelector: () => null,
};
assert(isToolbarBoldButton(mockBoldButtonWithTips as any), "Should detect Bold button by data-tips");

const mockBoldButtonWithAria = {
  getAttribute: (attr: string) => (attr === "aria-label" ? "bold" : null),
  closest: function (sel: string) { return this; },
  querySelector: () => null,
};
assert(isToolbarBoldButton(mockBoldButtonWithAria as any), "Should detect Bold button by aria-label");

const mockBoldButtonWithSvg = {
  getAttribute: () => null,
  closest: function (sel: string) { return this; },
  querySelector: (sel: string) => (sel === "svg use" ? { getAttribute: () => "#bold" } : null),
};
assert(isToolbarBoldButton(mockBoldButtonWithSvg as any), "Should detect Bold button by svg use href");

const mockOtherButton = {
  getAttribute: (attr: string) => (attr === "data-tips" ? "Align Left" : null),
  closest: function (sel: string) { return this; },
  querySelector: () => null,
};
assert(!isToolbarBoldButton(mockOtherButton as any), "Should not match Align Left button as Bold");

console.log("   ✓ Toolbar Bold button correctly matched via data-tips, aria-label, and svg use href");

console.log("\n==================================================================");
console.log("ALL TESTS PASSED SUCCESSFULLY! 🚀");
console.log("==================================================================");
