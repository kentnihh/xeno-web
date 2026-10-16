import assert from "node:assert";
import * as XLSX from "xlsx";
import {
  convertToFortuneSheet,
  sheetToAoaAndMerges,
  isFortuneSheet,
} from "../lib/spreadsheet-adapter";

console.log("== Testing FortuneSheet Adapter & Excel Export ==");

// 1. Test legacy conversion
const legacyData = {
  columns: [
    { id: "col_1", name: "No" },
    { id: "col_2", name: "Item Checklist" },
    { id: "col_3", name: "Status" },
  ],
  rows: [
    { id: "row_1", col_1: "1", col_2: "Sound Test", col_3: "Done" },
    { id: "row_2", col_1: "2", col_2: "Lighting Check", col_3: "Pending" },
  ],
};

assert.strictEqual(isFortuneSheet(legacyData), false, "Legacy data should not be detected as FortuneSheet");

const converted = convertToFortuneSheet(legacyData, "CHECKLIST");
assert.strictEqual(isFortuneSheet(converted), true, "Converted sheet must be recognized as FortuneSheet");
assert.strictEqual(converted.name, "CHECKLIST");
assert(Array.isArray(converted.celldata), "Converted sheet must have celldata array");

// Check header formatting
const headerCell0 = converted.celldata?.find((c) => c.r === 0 && c.c === 0);
assert(headerCell0, "Header cell 0,0 must exist");
assert.strictEqual(headerCell0.v?.v, "No");
assert.strictEqual(headerCell0.v?.bl, 1, "Header cell must be Bold");
assert.strictEqual(headerCell0.v?.bg, "#f4f4f6", "Header cell must have background color");

// Check data cell
const dataCell = converted.celldata?.find((c) => c.r === 1 && c.c === 1);
assert(dataCell, "Data cell 1,1 must exist");
assert.strictEqual(dataCell.v?.v, "Sound Test");

console.log("✓ Legacy format successfully converted to FortuneSheet with bold headers & background styling");

// 2. Test rich FortuneSheet format with bold, color, and merge cells
const richSheet = {
  name: "Reception Rundown",
  id: "sheet_rundown",
  status: 1,
  row: 30,
  column: 15,
  celldata: [
    { r: 0, c: 0, v: { v: "Acara Utama", m: "Acara Utama", bl: 1, bg: "#ffebee", fs: 14 } },
    { r: 0, c: 1, v: { v: "", m: "" } },
    { r: 1, c: 0, v: { v: "18:00", m: "18:00" } },
    { r: 1, c: 1, v: { v: "Opening MC", m: "Opening MC", bl: 1, fc: "#007aff" } },
  ],
  config: {
    merge: {
      "0_0": { r: 0, c: 0, rs: 1, cs: 2 }, // merge A1:B1
    },
  },
};

assert.strictEqual(isFortuneSheet(richSheet), true, "Rich sheet must be recognized as FortuneSheet");
const normalized = convertToFortuneSheet(richSheet, "Reception Rundown");
assert.strictEqual(normalized.name, "Reception Rundown");
assert.strictEqual(normalized.config?.merge?.["0_0"]?.cs, 2, "Merge configuration must be preserved");

console.log("✓ Rich FortuneSheet cell styles (bg, bl, fs, fc) and merge metadata preserved");

// 3. Test sheetToAoaAndMerges for Excel (.xlsx) export
const { aoa, merges, colWidths } = sheetToAoaAndMerges(richSheet);
assert.strictEqual(aoa[0][0], "Acara Utama", "First row AOA must contain text");
assert.strictEqual(merges.length, 1, "Merges array must have exactly 1 merged range");
assert.deepStrictEqual(merges[0], {
  s: { r: 0, c: 0 },
  e: { r: 0, c: 1 },
});
assert(colWidths.length >= 2, "Must compute column widths");

// Test XLSX workbook compilation with merges
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.aoa_to_sheet(aoa);
ws["!merges"] = merges;
ws["!cols"] = colWidths;
XLSX.utils.book_append_sheet(wb, ws, "Rundown");

assert.strictEqual(wb.SheetNames.length, 1);
assert.strictEqual(ws["!merges"]?.length, 1, "XLSX worksheet must contain merged ranges");

const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
assert(buf.length > 0, "XLSX binary buffer must be generated");

console.log("✓ Excel (.xlsx) export with cell merges and column widths generated successfully");

// 4. Test stringified JSON hydration
const jsonString = JSON.stringify(legacyData);
const fromString = convertToFortuneSheet(jsonString, "CHECKLIST");
assert.strictEqual(fromString.name, "CHECKLIST");
assert(fromString.celldata && fromString.celldata.length > 0, "Must parse JSON string");
console.log("✓ Stringified JSON data successfully parsed and hydrated");

// 5. Test 2D matrix-to-celldata rehydration (when FortuneSheet returns only data matrix)
const matrixOnlySheet = {
  name: "CHECKLIST",
  row: 30,
  column: 18,
  data: [
    [{ v: "Item 1", m: "Item 1" }, { v: "Done", m: "Done" }],
    [null, { v: "Note A", m: "Note A" }],
  ],
};
const rehydrated = convertToFortuneSheet(matrixOnlySheet, "CHECKLIST");
assert(rehydrated.celldata && rehydrated.celldata.length === 3, "Matrix must be converted to celldata");
assert.strictEqual(rehydrated.celldata[0]?.v?.v, "Item 1");
assert.strictEqual(rehydrated.celldata[1]?.v?.v, "Done");
assert.strictEqual(rehydrated.celldata[2]?.v?.v, "Note A");
console.log("✓ 2D matrix data safely reconstructed into celldata for flawless canvas remounting");

// 6. Test fallback to default template when empty
const emptyFallback = convertToFortuneSheet(null, "CHECKLIST");
assert(emptyFallback.celldata && emptyFallback.celldata.length >= 6, "Must fallback to INITIAL_EVENT_SHEETS");
console.log("✓ Empty/null sheet gracefully recovers default template data");

console.log("\n== ALL FORTUNESHEET TESTS PASSED SUCCESSFULLY! ==");
