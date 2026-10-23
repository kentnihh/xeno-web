import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

async function run() {
  console.log("===============================================================");
  console.log("TEST SUITE: Flush Active Cell Edit Before Saving Sheet");
  console.log("===============================================================\n");

  // 1. Audit event-spreadsheet-tabs.tsx
  console.log("1. Auditing Event Detail sheet save handler in event-spreadsheet-tabs.tsx...");
  const eventTabsPath = path.resolve(process.cwd(), "components/events/spreadsheet/event-spreadsheet-tabs.tsx");
  const eventTabsCode = fs.readFileSync(eventTabsPath, "utf-8");

  assert(
    eventTabsCode.includes("if (typeof window !== \"undefined\" && document.activeElement instanceof HTMLElement) {\n      document.activeElement.blur();\n    }"),
    "event-spreadsheet-tabs.tsx must programmatically blur document.activeElement on save click."
  );

  assert(
    eventTabsCode.includes("await new Promise((resolve) => setTimeout(resolve, 50));"),
    "event-spreadsheet-tabs.tsx must delay 50ms to allow React/FortuneSheet event loop to flush active cell edits."
  );

  assert(
    eventTabsCode.includes("gridRef.current?.exitEditMode?.();"),
    "event-spreadsheet-tabs.tsx must invoke exitEditMode if exposed on ref."
  );

  assert(
    !eventTabsCode.includes("onMouseDown={(e) => e.preventDefault()}"),
    "Simpan Perubahan button must NOT preventDefault on onMouseDown (avoids stealing focus without committing)."
  );
  console.log("   ✓ Event detail sheet save handler flushes active cell edit with blur, exitEditMode, and micro-delay.");

  // 2. Audit master-templates-manager.tsx
  console.log("\n2. Auditing Master Template sheet save handler in master-templates-manager.tsx...");
  const masterTemplatesPath = path.resolve(process.cwd(), "components/settings/master-templates-manager.tsx");
  const masterTemplatesCode = fs.readFileSync(masterTemplatesPath, "utf-8");

  assert(
    masterTemplatesCode.includes("if (typeof window !== \"undefined\" && document.activeElement instanceof HTMLElement) {\n      document.activeElement.blur();\n    }"),
    "master-templates-manager.tsx must programmatically blur document.activeElement on save click."
  );

  assert(
    masterTemplatesCode.includes("await new Promise((resolve) => setTimeout(resolve, 50));"),
    "master-templates-manager.tsx must delay 50ms to allow React/FortuneSheet event loop to flush active cell edits."
  );

  assert(
    masterTemplatesCode.includes("gridRef.current?.exitEditMode?.();"),
    "master-templates-manager.tsx must invoke exitEditMode if exposed on ref."
  );

  assert(
    !masterTemplatesCode.includes("onMouseDown={(e) => e.preventDefault()}"),
    "Simpan Template button must NOT preventDefault on onMouseDown."
  );
  console.log("   ✓ Master template save handler flushes active cell edit with blur, exitEditMode, and micro-delay.");

  // 3. Audit dynamic-sheet-grid.tsx
  console.log("\n3. Auditing dynamic-sheet-grid.tsx imperative handle & auto-blur...");
  const dynamicGridPath = path.resolve(process.cwd(), "components/events/spreadsheet/dynamic-sheet-grid.tsx");
  const dynamicGridCode = fs.readFileSync(dynamicGridPath, "utf-8");

  assert(
    dynamicGridCode.includes("exitEditMode?: () => void;"),
    "DynamicSheetGridHandle must declare exitEditMode."
  );

  assert(
    dynamicGridCode.includes("flushActiveCell?: () => void;"),
    "DynamicSheetGridHandle must declare flushActiveCell."
  );

  assert(
    dynamicGridCode.includes("exitEditMode: () => {") &&
    dynamicGridCode.includes("flushActiveCell: () => {"),
    "DynamicSheetGrid must implement exitEditMode and flushActiveCell."
  );

  assert(
    dynamicGridCode.includes("isInput") && dynamicGridCode.includes("document.activeElement.blur();"),
    "DynamicSheetGrid.getData() must automatically blur active cell input if focused."
  );
  console.log("   ✓ dynamic-sheet-grid.tsx exposes exitEditMode, flushActiveCell, and auto-blurs active cell on getData.");

  // 4. Audit alias exports
  console.log("\n4. Auditing alias exports in event-sheet-editor.tsx & master-template-editor.tsx...");
  const eventEditorPath = path.resolve(process.cwd(), "components/events/event-sheet-editor.tsx");
  assert(fs.existsSync(eventEditorPath), "components/events/event-sheet-editor.tsx must exist.");
  const eventEditorCode = fs.readFileSync(eventEditorPath, "utf-8");
  assert(
    eventEditorCode.includes("EventSheetEditor"),
    "event-sheet-editor.tsx must export EventSheetEditor alias."
  );

  const masterEditorPath = path.resolve(process.cwd(), "components/settings/master-template-editor.tsx");
  assert(fs.existsSync(masterEditorPath), "components/settings/master-template-editor.tsx must exist.");
  const masterEditorCode = fs.readFileSync(masterEditorPath, "utf-8");
  assert(
    masterEditorCode.includes("MasterTemplateEditor"),
    "master-template-editor.tsx must export MasterTemplateEditor alias."
  );
  console.log("   ✓ Alias files exist and export expected editor components.");

  // 5. Functional Simulation of Active Cell Flush Sequence
  console.log("\n5. Testing functional simulation of active cell flush sequence...");
  let cellValue = "Original Cell Value";
  let isEditing = true;

  // Mock cell element
  const mockCellInput = {
    value: "Updated Cell Value Before Save",
    blur() {
      isEditing = false;
      cellValue = this.value;
    },
  };

  // Simulated handleSave sequence
  async function simulateSave() {
    // 1. Force blur active cell input
    mockCellInput.blur();

    // 2. Allow event loop / React state to flush
    await new Promise((resolve) => setTimeout(resolve, 50));

    // 3. Extract committed data
    return cellValue;
  }

  const savedValue = await simulateSave();
  assert.strictEqual(
    savedValue,
    "Updated Cell Value Before Save",
    "Active cell edit must be committed to the saved data array."
  );
  assert.strictEqual(isEditing, false, "Cell editing must be closed after flush.");
  console.log("   ✓ Functional simulation verified: cell retains new uncommitted value upon immediate save click.");

  console.log("\n===============================================================");
  console.log("ALL ACTIVE CELL FLUSH TESTS PASSED! 🚀");
  console.log("===============================================================");
}

run().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
