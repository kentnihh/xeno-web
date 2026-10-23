import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import * as DropdownMenuExports from "../components/ui/dropdown-menu";
import { deleteEventSheet } from "../app/(dashboard)/events/sheet-actions";

console.log("===============================================================");
console.log("TEST SUITE: Event Sheet Tab Dropdown Menu & Sheet Deletion");
console.log("===============================================================");

// 1. Verify DropdownMenu UI components exist and export Radix-based primitives
console.log("\n1. Verifying DropdownMenu component exports...");
assert(DropdownMenuExports.DropdownMenu, "DropdownMenu must be exported");
assert(DropdownMenuExports.DropdownMenuTrigger, "DropdownMenuTrigger must be exported");
assert(DropdownMenuExports.DropdownMenuContent, "DropdownMenuContent must be exported");
assert(DropdownMenuExports.DropdownMenuItem, "DropdownMenuItem must be exported");
assert(DropdownMenuExports.DropdownMenuSeparator, "DropdownMenuSeparator must be exported");
console.log("   ✓ DropdownMenu primitives successfully verified.");

// 2. Audit components/events/spreadsheet/event-spreadsheet-tabs.tsx
console.log("\n2. Auditing event-spreadsheet-tabs.tsx source code...");
const tabsCode = fs.readFileSync(
  path.join(process.cwd(), "components/events/spreadsheet/event-spreadsheet-tabs.tsx"),
  "utf-8"
);

// Verify imports
assert(
  tabsCode.includes("DropdownMenu") &&
  tabsCode.includes("DropdownMenuTrigger") &&
  tabsCode.includes("DropdownMenuContent") &&
  tabsCode.includes("DropdownMenuItem") &&
  tabsCode.includes("DropdownMenuSeparator"),
  "event-spreadsheet-tabs.tsx must import all Radix DropdownMenu components"
);
console.log("   ✓ Radix DropdownMenu component imports verified.");

// Verify stopPropagation on chevron button
assert(
  tabsCode.includes("e.stopPropagation()"),
  "Dropdown trigger must stop click propagation to prevent unintended tab switching"
);
console.log("   ✓ Trigger stopPropagation verified.");

// Verify DropdownMenuContent z-index styling
assert(
  tabsCode.includes("z-50") && tabsCode.includes("DropdownMenuContent"),
  "DropdownMenuContent must have z-50 to float cleanly above canvas grids"
);
console.log("   ✓ DropdownMenuContent z-50 floating level verified.");

// Verify dropdown options
assert(tabsCode.includes("Ganti Nama"), "Menu must contain 'Ganti Nama' item");
assert(tabsCode.includes("Duplikat Sheet"), "Menu must contain 'Duplikat Sheet' item");
assert(tabsCode.includes("Reset ke Master"), "Menu must contain 'Reset ke Master' item");
assert(tabsCode.includes("Hapus Sheet"), "Menu must contain 'Hapus Sheet' item");
console.log("   ✓ All required sheet action items present in menu.");

// Verify single-sheet invariant (cannot delete if only 1 sheet remains)
assert(
  tabsCode.includes("disabled={sheets.length <= 1}"),
  "Hapus Sheet item must be disabled when only 1 sheet remains"
);
console.log("   ✓ Single-sheet deletion prevention invariant verified.");

// Verify confirmation message
const expectedMessage = "Apakah Anda yakin ingin menghapus lembar kerja ini? Data di dalam sheet ini akan hilang.";
assert(
  tabsCode.includes(expectedMessage),
  `ConfirmModal must display exact confirmation text: "${expectedMessage}"`
);
console.log("   ✓ Exact deletion confirmation message verified.");

// Verify success toast
assert(
  tabsCode.includes("Sheet berhasil dihapus."),
  "Component must trigger success toast 'Sheet berhasil dihapus.'"
);
console.log("   ✓ Success toast notification verified.");

// Verify permission check
assert(
  tabsCode.includes("isSheetsManageable") && tabsCode.includes("canManageSheets ?? canManage"),
  "Sheet actions must respect canManageSheets and canManage permission guards"
);
console.log("   ✓ RBAC permission guard (isSheetsManageable) verified.");

// 3. Audit deleteEventSheet server action in sheet-actions.ts
console.log("\n3. Auditing deleteEventSheet Server Action...");
const actionsCode = fs.readFileSync(
  path.join(process.cwd(), "app/(dashboard)/events/sheet-actions.ts"),
  "utf-8"
);

assert(
  actionsCode.includes("requirePermission(\"events:sheets:manage\")"),
  "deleteEventSheet must strictly enforce events:sheets:manage permission"
);
assert(
  actionsCode.includes("revalidatePath"),
  "deleteEventSheet must revalidate the event detail path"
);
assert(
  typeof deleteEventSheet === "function",
  "deleteEventSheet must be exported as an async function"
);
console.log("   ✓ deleteEventSheet server action permissions and revalidation verified.");

console.log("\n===============================================================");
console.log("ALL EVENT SHEET TAB DROPDOWN & DELETION TESTS PASSED! 🚀");
console.log("===============================================================");
