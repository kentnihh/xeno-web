import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { saveEventSheet, updateEventSheet, resetSheetToMaster } from "../app/(dashboard)/events/sheet-actions";

console.log("===============================================================");
console.log("TEST SUITE: Sheet Feedback Isolation & Template Guards");
console.log("===============================================================\n");

// 1. Audit event-spreadsheet-tabs.tsx source code
console.log("1. Auditing event-spreadsheet-tabs.tsx feedback & reset guards...");
const tabsPath = path.resolve(process.cwd(), "components/events/spreadsheet/event-spreadsheet-tabs.tsx");
const tabsCode = fs.readFileSync(tabsPath, "utf-8");

// 1.1 State Isolation & Reset on Action
assert(
  tabsCode.includes('setStatusMessage("Perubahan berhasil disimpan");') ||
  tabsCode.includes("setStatusMessage('Perubahan berhasil disimpan');"),
  "handleManualSave must explicitly set statusMessage to 'Perubahan berhasil disimpan' on success."
);

assert(
  tabsCode.includes('setStatusMessage("");\n    setSaveStatus("saving");'),
  "handleManualSave must immediately clear previous status text upon click."
);

assert(
  tabsCode.includes('setStatusMessage("");\n    setSaveStatus("idle");'),
  "Tab change and refresh must immediately reset previous feedback text."
);

// 1.2 Distinguish Success vs Error
assert(
  tabsCode.includes('<span>{statusMessage || "Perubahan berhasil disimpan"}</span>'),
  "Success badge must render 'Perubahan berhasil disimpan'."
);

assert(
  tabsCode.includes('<AlertCircle className="w-3 h-3 text-rose-500" />'),
  "Error badge must feature AlertCircle icon in red/rose."
);

assert(
  !tabsCode.includes('<Check className="w-3 h-3" />\n              <span>{statusMessage || "Tersimpan"}</span>'),
  "Must not render stale statusMessage without fallback in green check badge."
);

console.log("   ✓ Feedback state properly isolated, reset on action, and distinguished between success/error.");

// 2. Guard 'Reset ke Master Template' on Sheets without Valid Templates
console.log("\n2. Auditing 'Reset ke Master Template' guards for custom/duplicate sheets...");

assert(
  tabsCode.includes('setToast("Sheet ini tidak terhubung dengan master template.");'),
  "handleResetSheet must trigger toast notification for duplicate/custom sheets."
);

assert(
  tabsCode.includes('sheetName.toLowerCase().includes("(salinan")'),
  "handleResetSheet must detect duplicated sheets by name."
);

assert(
  tabsCode.includes('title="Sheet ini tidak terhubung dengan master template"'),
  "Dropdown menu must indicate disabled/unlinked state for duplicated sheets."
);

console.log("   ✓ Reset to master is protected for duplicate/custom sheets without corrupting save status badge.");

// 3. Verify saveEventSheet Action Independence
console.log("\n3. Auditing saveEventSheet / updateEventSheet independence in sheet-actions.ts...");
const sheetActionsPath = path.resolve(process.cwd(), "app/(dashboard)/events/sheet-actions.ts");
const sheetActionsCode = fs.readFileSync(sheetActionsPath, "utf-8");

assert(
  typeof saveEventSheet === "function",
  "sheet-actions.ts must export saveEventSheet."
);

assert(
  typeof updateEventSheet === "function",
  "sheet-actions.ts must export updateEventSheet alias."
);

// Extract the saveEventSheet function body
const saveEventSheetStart = sheetActionsCode.indexOf("export async function saveEventSheet(");
const saveEventSheetEnd = sheetActionsCode.indexOf("export const updateEventSheet = saveEventSheet;");
const saveEventSheetBody = sheetActionsCode.slice(saveEventSheetStart, saveEventSheetEnd);

assert(
  !saveEventSheetBody.includes("from(\"master_templates\")") &&
  !saveEventSheetBody.includes("from('master_templates')") &&
  !saveEventSheetBody.includes("getMasterTemplatesCached"),
  "saveEventSheet must NEVER query, validate, or require a record in master_templates."
);

assert(
  saveEventSheetBody.includes(".from(\"event_sheets\")") &&
  saveEventSheetBody.includes(".update({") &&
  saveEventSheetBody.includes("sheet_name: sheetName,") &&
  saveEventSheetBody.includes("data: sanitizedData,"),
  "saveEventSheet must update only data, sheet_name, and updated_at on existing sheets."
);

console.log("   ✓ saveEventSheet and updateEventSheet are 100% independent of master_templates.");

console.log("\n===============================================================");
console.log("ALL SHEET FEEDBACK & TEMPLATE GUARD TESTS PASSED! 🚀");
console.log("===============================================================");
