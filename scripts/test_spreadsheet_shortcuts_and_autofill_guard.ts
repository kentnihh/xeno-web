/**
 * Automated Test Suite: Spreadsheet Shortcuts and Autofill Guard
 * 
 * Verifies:
 * 1. clampRowCount and MAX_SAFE_AUTOFILL_ROWS limits
 * 2. calculateContiguousFillRange behavior (adjacent bounds, no runaway fill, clamping)
 * 3. isCellPopulated logic across diverse cell representations
 * 4. isCellEditorActive detection of cell editors & formula bar
 * 5. insertNewlineAtCaret behavior for inputs and contenteditable
 * 6. Codebase audit for DynamicSheetGrid, EventSpreadsheetTabs, and MasterTemplatesManager
 */

import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import {
  MAX_SAFE_AUTOFILL_ROWS,
  MAX_SAFE_ROW_LIMIT,
  clampRowCount,
  isCellPopulated,
  calculateContiguousFillRange,
  isCellEditorActive,
  insertNewlineAtCaret,
  buildVisibleRowHeights,
  buildVisibleColWidths,
  getRowByCoordinate,
  getColByCoordinate,
  calculateMarqueeBounds,
  calculateCalibratedMouseCoordinates,
} from "../lib/spreadsheet-autofill";

console.log("=== RUNNING SPREADSHEET SHORTCUTS & AUTOFILL GUARD TESTS ===");

// -------------------------------------------------------------
// Test 1: clampRowCount & Limits
// -------------------------------------------------------------
console.log("\n1. Testing clampRowCount...");
assert.strictEqual(clampRowCount(10), 10, "Normal row count within limit should be preserved");
assert.strictEqual(clampRowCount(MAX_SAFE_ROW_LIMIT), MAX_SAFE_ROW_LIMIT, "Exact limit should be preserved");
assert.strictEqual(clampRowCount(100), MAX_SAFE_ROW_LIMIT, "Excessive row count should be clamped to MAX_SAFE_ROW_LIMIT");
assert.strictEqual(clampRowCount(99999), MAX_SAFE_ROW_LIMIT, "Astronomical row count should be clamped");
assert.strictEqual(clampRowCount(0), 1, "0 should clamp to minimum 1");
assert.strictEqual(clampRowCount(-5), 1, "Negative numbers should clamp to minimum 1");
assert.strictEqual(clampRowCount(NaN), 1, "NaN should clamp to minimum 1");
assert.strictEqual(clampRowCount(25.7), 25, "Floats should be floored");
console.log("   ✓ clampRowCount strictly enforces MAX_SAFE_ROW_LIMIT (50)");

// -------------------------------------------------------------
// Test 2: isCellPopulated
// -------------------------------------------------------------
console.log("\n2. Testing isCellPopulated...");
assert.strictEqual(isCellPopulated(null), false, "null is not populated");
assert.strictEqual(isCellPopulated(undefined), false, "undefined is not populated");
assert.strictEqual(isCellPopulated(""), false, "empty string is not populated");
assert.strictEqual(isCellPopulated("   "), false, "whitespace string is not populated");
assert.strictEqual(isCellPopulated("Hello"), true, "string is populated");
assert.strictEqual(isCellPopulated(0), true, "number 0 is populated");
assert.strictEqual(isCellPopulated(123), true, "positive number is populated");
assert.strictEqual(isCellPopulated({ v: "Val" }), true, "cell with .v is populated");
assert.strictEqual(isCellPopulated({ v: "" }), false, "cell with empty .v is not populated");
assert.strictEqual(isCellPopulated({ m: "Formatted" }), true, "cell with .m is populated");
assert.strictEqual(isCellPopulated({ ct: { t: "inlineStr", s: [{ v: "Line 1" }] } }), true, "inlineStr cell is populated");
assert.strictEqual(isCellPopulated({ ct: { t: "inlineStr", s: [{ v: "" }] } }), false, "empty inlineStr is not populated");
console.log("   ✓ isCellPopulated accurately detects non-empty cells across all formats");

// -------------------------------------------------------------
// Test 3: calculateContiguousFillRange
// -------------------------------------------------------------
console.log("\n3. Testing calculateContiguousFillRange...");

// Mock sheet data: 8 rows, 3 columns
// Col 0 (A): Items 1..6 (rows 0..5), empty at row 6..7
// Col 1 (B): Formula at row 0, empty rows 1..7
const mockData: any[][] = [
  [{ v: "Item 1" }, { v: "=A1*2" }, null],
  [{ v: "Item 2" }, null, null],
  [{ v: "Item 3" }, null, null],
  [{ v: "Item 4" }, null, null],
  [{ v: "Item 5" }, null, null],
  [{ v: "Item 6" }, null, null],
  [null, null, null],
  [null, null, null],
];

// Test 3a: Double-click autofill on B1 (row 0, col 1) should fill down to row 5 (adjacent data boundary)
const selB1 = { row: [0, 0] as [number, number], column: [1, 1] as [number, number] };
const resultB1 = calculateContiguousFillRange(mockData, selB1, MAX_SAFE_AUTOFILL_ROWS);
assert.notStrictEqual(resultB1, null, "Should return fill range matching adjacent column");
assert.strictEqual(resultB1?.targetRow, 5, "Target row should match the end of contiguous column A data (row 5)");
assert.deepStrictEqual(resultB1?.applyRange, { row: [1, 5], column: [1, 1] }, "applyRange should be rows 1..5 in column 1");

// Test 3b: When there are NO populated rows below selection, return null (prevent indefinite fill)
const selEmpty = { row: [5, 5] as [number, number], column: [1, 1] as [number, number] };
const resultEmpty = calculateContiguousFillRange(mockData, selEmpty, MAX_SAFE_AUTOFILL_ROWS);
assert.strictEqual(resultEmpty, null, "Must return null when no adjacent data exists beyond selection");

// Test 3c: Large contiguous data must be clamped by MAX_SAFE_AUTOFILL_ROWS
const largeData: any[][] = [];
for (let i = 0; i < 200; i++) {
  largeData.push([{ v: `Row ${i}` }, i === 0 ? { v: "formula" } : null]);
}
const resultLarge = calculateContiguousFillRange(largeData, selB1, MAX_SAFE_AUTOFILL_ROWS);
assert.notStrictEqual(resultLarge, null);
assert.strictEqual(
  resultLarge?.targetRow,
  MAX_SAFE_AUTOFILL_ROWS,
  `Target row must be clamped to MAX_SAFE_AUTOFILL_ROWS (${MAX_SAFE_AUTOFILL_ROWS})`
);
assert.deepStrictEqual(
  resultLarge?.applyRange,
  { row: [1, MAX_SAFE_AUTOFILL_ROWS], column: [1, 1] },
  "applyRange must be strictly clamped by MAX_SAFE_AUTOFILL_ROWS"
);

// Test 3d: Empty sheet data
assert.strictEqual(calculateContiguousFillRange([], selB1), null, "Empty sheet returns null");
assert.strictEqual(calculateContiguousFillRange(undefined, selB1), null, "Undefined sheet returns null");
console.log("   ✓ calculateContiguousFillRange bounds autofill to contiguous rows and clamps to safe limit");

// -------------------------------------------------------------
// Test 4: isCellEditorActive & DOM Simulation
// -------------------------------------------------------------
console.log("\n4. Testing isCellEditorActive & insertNewlineAtCaret...");

// Setup global mock DOM for Node environment
class MockHTMLElement {
  id = "";
  className = "";
  tagName = "DIV";
  attributes: Record<string, string> = {};
  value = "";
  textContent = "";
  selectionStart = 0;
  selectionEnd = 0;
  dispatchedEvents: string[] = [];

  classList = {
    contains: (cls: string) => this.className.split(" ").includes(cls),
  };

  getAttribute(name: string) {
    return this.attributes[name] ?? null;
  }

  setAttribute(name: string, val: string) {
    this.attributes[name] = val;
  }

  dispatchEvent(evt: { type: string }) {
    this.dispatchedEvents.push(evt.type);
    return true;
  }
}

class MockHTMLTextAreaElement extends MockHTMLElement {
  tagName = "TEXTAREA";
}
class MockHTMLInputElement extends MockHTMLElement {
  tagName = "INPUT";
}

(global as any).HTMLTextAreaElement = MockHTMLTextAreaElement;
(global as any).HTMLInputElement = MockHTMLInputElement;
(global as any).window = global;
(global as any).document = {
  activeElement: null as any,
  createTextNode: (txt: string) => ({ textContent: txt }),
};
(global as any).Event = class MockEvent {
  type: string;
  constructor(type: string) {
    this.type = type;
  }
};

const cellEditor = new MockHTMLElement();
cellEditor.id = "luckysheet-rich-text-editor";
cellEditor.setAttribute("contenteditable", "true");

(global as any).document.activeElement = cellEditor;
assert.strictEqual(isCellEditorActive(), true, "Should identify luckysheet-rich-text-editor as active editor");

const fxEditor = new MockHTMLElement();
fxEditor.id = "luckysheet-functionbox-cell";
(global as any).document.activeElement = fxEditor;
assert.strictEqual(isCellEditorActive(), true, "Should identify luckysheet-functionbox-cell as active editor");

const normalButton = new MockHTMLElement();
normalButton.tagName = "BUTTON";
(global as any).document.activeElement = normalButton;
assert.strictEqual(isCellEditorActive(), false, "Button should not be identified as cell editor");

// Test insertNewlineAtCaret on text input
const textarea = new MockHTMLTextAreaElement();
textarea.value = "Hello World";
textarea.selectionStart = 5;
textarea.selectionEnd = 5;

(global as any).document.activeElement = textarea;
const handled = insertNewlineAtCaret(textarea as any);
assert.strictEqual(handled, true, "insertNewlineAtCaret should return true for textarea");
assert.strictEqual(textarea.value, "Hello\n World", "Newline should be inserted at caret position");
assert.strictEqual(textarea.selectionStart, 6, "Caret should advance past newline");
assert.ok(textarea.dispatchedEvents.includes("input"), "input event must be dispatched");

console.log("   ✓ isCellEditorActive and insertNewlineAtCaret successfully verified");

// -------------------------------------------------------------
// Test 5: Coordinate Snapping & Marquee Bounds Clamping
// -------------------------------------------------------------
console.log("\n5. Testing Coordinate Calculation & Marquee Bounds...");

const visibleRows = buildVisibleRowHeights(20, undefined, 20); // 20 rows, each 20px
const visibleCols = buildVisibleColWidths(10, undefined, 74); // 10 cols, each 74px

// Verify getRowByCoordinate:
// Row 0: 0..19px
// Row 7: 140..159px
assert.strictEqual(getRowByCoordinate(0, visibleRows), 0, "relativeY = 0 must be row 0");
assert.strictEqual(getRowByCoordinate(10, visibleRows), 0, "relativeY = 10 must be row 0");
assert.strictEqual(getRowByCoordinate(140, visibleRows), 7, "relativeY = 140 must be row 7");
assert.strictEqual(getRowByCoordinate(155, visibleRows), 7, "relativeY = 155 must be row 7");
assert.strictEqual(getRowByCoordinate(165, visibleRows), 8, "relativeY = 165 must be row 8");
console.log("   ✓ getRowByCoordinate strictly returns the exact row directly underneath cursor");

// Test User Scenario: Dragging downward from cells G4:G5 (rows 3..4, col 6) to row 7:
const selG4G5 = { row: [3, 4], column: [6, 6] };
const marqueeAtRow7 = calculateMarqueeBounds(selG4G5, 7, 6, visibleRows, visibleCols);

// Top MUST be anchored to row 3 start (visibleRows[2] = 60px)
assert.strictEqual(marqueeAtRow7.top, 60, "Marquee top must anchor to start of selection (row 3 start = 60px)");
// Bottom MUST stop exactly at row 7 (visibleRows[7] = 160px)
assert.strictEqual(
  marqueeAtRow7.top + marqueeAtRow7.height + 1,
  160,
  "Marquee bottom must stop exactly at row 7 end (160px)"
);
assert.strictEqual(marqueeAtRow7.targetRow, 7, "Target row must be exactly 7 (NOT jumping to row 14)");
assert.strictEqual(marqueeAtRow7.direction, "down", "Direction must be downward");
console.log("   ✓ Dragging G4:G5 to row 7 strictly stops preview at row 7 without adjacent snapping");

// Test dragging down by exactly 2 rows (from row 4 to row 6):
const marquee2Rows = calculateMarqueeBounds(selG4G5, 6, 6, visibleRows, visibleCols);
assert.strictEqual(marquee2Rows.targetRow, 6, "Dragging down 2 rows must yield targetRow = 6");
assert.strictEqual(
  marquee2Rows.top + marquee2Rows.height + 1,
  visibleRows[6],
  "Preview box must stop exactly at row 6"
);
console.log("   ✓ Dragging down by 2 rows strictly bounds preview to 2 new rows");

// Test Calibrated Mouse Coordinates (compensates window.scrollY & header offsets):
const overlayRect = { top: 220, left: 50 };
const columnHeaderHeight = 20;
const rowHeaderWidth = 46;
const windowScrollY = 150;
const scrollTop = 0;

const calibrated = calculateCalibratedMouseCoordinates(
  7,
  6,
  visibleRows,
  visibleCols,
  overlayRect,
  scrollTop,
  0,
  windowScrollY,
  0,
  columnHeaderHeight,
  rowHeaderWidth
);

// When FortuneSheet calculates y = (clientY + windowScrollY) - overlayRect.top - columnHeaderHeight + scrollTop:
const fortuneSheetCalculatedY = (calibrated.clientY + windowScrollY) - overlayRect.top - columnHeaderHeight + scrollTop;
const midRow7Y = (visibleRows[6] + visibleRows[7]) / 2;
assert.strictEqual(
  fortuneSheetCalculatedY,
  midRow7Y,
  "Calibrated clientY must produce exact midY for row 7 in FortuneSheet regardless of window.scrollY"
);
console.log("   ✓ calculateCalibratedMouseCoordinates completely cancels out window.scrollY and header offsets");

// -------------------------------------------------------------
// Test 6: Codebase Static Audit
// -------------------------------------------------------------
console.log("\n6. Auditing Codebase Integration...");

const dynamicGridCode = fs.readFileSync(
  path.join(__dirname, "../components/events/spreadsheet/dynamic-sheet-grid.tsx"),
  "utf8"
);
const eventTabsCode = fs.readFileSync(
  path.join(__dirname, "../components/events/spreadsheet/event-spreadsheet-tabs.tsx"),
  "utf8"
);
const masterTplCode = fs.readFileSync(
  path.join(__dirname, "../components/settings/master-templates-manager.tsx"),
  "utf8"
);

// DynamicSheetGrid assertions
assert.ok(
  dynamicGridCode.includes("MAX_SAFE_AUTOFILL_ROWS"),
  "DynamicSheetGrid must reference MAX_SAFE_AUTOFILL_ROWS"
);
assert.ok(
  dynamicGridCode.includes("calculateContiguousFillRange"),
  "DynamicSheetGrid must use calculateContiguousFillRange"
);
assert.ok(
  dynamicGridCode.includes("insertNewlineAtCaret"),
  "DynamicSheetGrid must support insertNewlineAtCaret"
);
assert.ok(
  dynamicGridCode.includes("onSaveShortcut"),
  "DynamicSheetGrid must accept onSaveShortcut prop"
);
assert.ok(
  dynamicGridCode.includes("Ctrl+Enter") && dynamicGridCode.includes("Ctrl+S"),
  "DynamicSheetGrid instructions must display Ctrl+Enter and Ctrl+S tips"
);
console.log("   ✓ dynamic-sheet-grid.tsx correctly integrated with shortcuts & autofill guard");

// EventSpreadsheetTabs assertions
assert.ok(
  eventTabsCode.includes("isCellEditorActive"),
  "EventSpreadsheetTabs must import isCellEditorActive"
);
assert.ok(
  eventTabsCode.includes("handleManualSaveRef"),
  "EventSpreadsheetTabs must use handleManualSaveRef for keyboard save listener"
);
assert.ok(
  eventTabsCode.includes("onSaveShortcut={handleManualSave}"),
  "EventSpreadsheetTabs must pass onSaveShortcut to DynamicSheetGrid"
);
console.log("   ✓ event-spreadsheet-tabs.tsx correctly integrated with global save shortcut");

// MasterTemplatesManager assertions
assert.ok(
  masterTplCode.includes("isCellEditorActive"),
  "MasterTemplatesManager must import isCellEditorActive"
);
assert.ok(
  masterTplCode.includes("handleManualSaveRef"),
  "MasterTemplatesManager must use handleManualSaveRef for keyboard save listener"
);
assert.ok(
  masterTplCode.includes("onSaveShortcut={handleManualSave}"),
  "MasterTemplatesManager must pass onSaveShortcut to DynamicSheetGrid"
);
console.log("   ✓ master-templates-manager.tsx correctly integrated with global save shortcut");

console.log("\nALL TESTS PASSED! (6/6 suites successful)");
