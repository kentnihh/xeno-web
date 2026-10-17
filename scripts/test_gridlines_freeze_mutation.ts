import assert from "node:assert";
import { convertToFortuneSheet } from "../lib/spreadsheet-adapter";

console.log("=== Testing Gridlines Toggle with Deeply Frozen / Read-Only Objects ===\n");

// 1. Create a deeply frozen sheet object simulating React StrictMode frozen state
const frozenConfig = Object.freeze({
  showGridLines: 1,
  merge: Object.freeze({}),
});

const frozenSheet = Object.freeze({
  name: "CHECKLIST",
  id: "sheet_checklist",
  row: 30,
  column: 18,
  celldata: Object.freeze([]),
  config: frozenConfig,
  showGridLines: true,
});

console.log("Test 1: Passing deeply frozen sheet into convertToFortuneSheet");
const sheetResult = convertToFortuneSheet(frozenSheet, "CHECKLIST", false);

assert.strictEqual(sheetResult.showGridLines, false, "showGridLines should be set to false");
// Verify sheetResult.config is NOT the same reference as frozenConfig
assert.notStrictEqual(
  sheetResult.config,
  frozenConfig,
  "config MUST be deeply cloned, not passed by reference"
);
assert.doesNotThrow(() => {
  // Simulating mutating showGridLines on the returned sheet and config
  (sheetResult as any).showGridLines = true;
  (sheetResult.config as any).showGridLines = 1;
}, "Mutating returned sheet or config must NOT throw read-only TypeError");
console.log("✓ convertToFortuneSheet returns completely mutable deep clone of config and sheet");

console.log("\nTest 2: Simulating DynamicSheetGrid state initializer logic on frozen input");
function simulateInitialSheets(data: any, showGridLines?: boolean) {
  const sheet = convertToFortuneSheet(data, "Sheet 1", showGridLines);
  const newSheet =
    typeof structuredClone === "function"
      ? structuredClone(sheet)
      : (JSON.parse(JSON.stringify(sheet)) as typeof sheet);

  if (showGridLines !== undefined) {
    newSheet.showGridLines = showGridLines;
    if (!newSheet.config) {
      newSheet.config = {};
    } else {
      newSheet.config = { ...newSheet.config };
    }
    (newSheet.config as any).showGridLines = showGridLines ? 1 : 0;
  }
  return [newSheet];
}

assert.doesNotThrow(() => {
  const resOff = simulateInitialSheets(frozenSheet, false);
  assert.strictEqual(resOff[0].showGridLines, false);
  assert.strictEqual((resOff[0].config as any).showGridLines, 0);

  const resOn = simulateInitialSheets(frozenSheet, true);
  assert.strictEqual(resOn[0].showGridLines, true);
  assert.strictEqual((resOn[0].config as any).showGridLines, 1);
}, "Toggling showGridLines with deeply frozen state must not throw TypeError");
console.log("✓ Initial sheets state initializer safely clones frozen objects without mutating read-only properties");

console.log("\n=== ALL GRIDLINES MUTATION TESTS PASSED SUCCESSFULLY! ===");
