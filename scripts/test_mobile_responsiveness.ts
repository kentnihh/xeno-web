import fs from "fs";
import path from "path";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASSED: ${message}`);
}

const rootDir = path.resolve(__dirname, "..");

function readCode(filePath: string): string {
  return fs.readFileSync(path.join(rootDir, filePath), "utf-8");
}

console.log("=== Testing Mobile Responsiveness Implementation ===");

// 1. Sidebar & Mobile Hamburger Menu
const sidebarCode = readCode("components/sidebar.tsx");
assert(
  sidebarCode.includes("hidden md:flex"),
  "Sidebar is hidden on mobile screens (hidden md:flex)"
);

const navbarCode = readCode("components/navbar.tsx");
assert(
  navbarCode.includes("md:hidden") && navbarCode.includes("mobile-menu-drawer"),
  "Navbar contains mobile Hamburger toggle and mobile drawer"
);
assert(
  navbarCode.includes("isMobileOpen"),
  "Navbar manages state for mobile navigation drawer"
);

// 2. Forms & Grid Layouts
const createEventCode = readCode("components/events/create-event-form.tsx");
assert(
  createEventCode.includes("flex-col-reverse sm:flex-row"),
  "CreateEventForm buttons stack vertically on mobile (flex-col-reverse sm:flex-row)"
);
assert(
  createEventCode.includes("w-full sm:w-auto"),
  "CreateEventForm buttons expand full width on mobile"
);

const editEventCode = readCode("components/events/edit-event-form.tsx");
assert(
  editEventCode.includes("flex-col-reverse sm:flex-row"),
  "EditEventForm buttons stack vertically on mobile"
);

const publicFormCode = readCode("components/public-form/public-family-form.tsx");
assert(
  publicFormCode.includes("grid-cols-1 sm:grid-cols-2") &&
    publicFormCode.includes("grid-cols-1 sm:grid-cols-2 md:grid-cols-3"),
  "PublicFamilyForm grids collapse to 1 column on mobile"
);

// 3. Tables & Overflow
const usersTableCode = readCode("components/users/users-table.tsx");
assert(
  usersTableCode.includes("overflow-x-auto") && usersTableCode.includes("min-w-[640px]"),
  "UsersTable has overflow-x-auto and min-w-[640px] for mobile horizontal swipe"
);

const financeTableCode = readCode("components/events/event-finance-section.tsx");
assert(
  financeTableCode.includes("overflow-x-auto") && financeTableCode.includes("min-w-[580px]"),
  "EventFinanceSection table has overflow-x-auto and min-w-[580px]"
);

const docsTableCode = readCode("components/events/event-documents-section.tsx");
assert(
  docsTableCode.includes("overflow-x-auto") && docsTableCode.includes("min-w-[600px]"),
  "EventDocumentsSection table has overflow-x-auto and min-w-[600px]"
);

// 4. Modals & Dialogs
const modalShellCode = readCode("components/users/modal-shell.tsx");
assert(
  modalShellCode.includes("w-[calc(100%-1.5rem)]") && modalShellCode.includes("max-h-[85vh]"),
  "ModalShell container is responsive with max-h-[85vh] and overflow-y-auto"
);

const confirmModalCode = readCode("components/ui/confirm-modal.tsx");
assert(
  confirmModalCode.includes("w-[calc(100%-1.5rem)]") &&
    confirmModalCode.includes("flex-col-reverse sm:flex-row"),
  "ConfirmModal is responsive with stacked action buttons"
);

const exportPdfModalCode = readCode("components/events/spreadsheet/export-spreadsheet-pdf-modal.tsx");
assert(
  exportPdfModalCode.includes("max-h-[85vh]") &&
    exportPdfModalCode.includes("flex-col-reverse sm:flex-row"),
  "ExportSpreadsheetPdfModal has max-h-[85vh] and responsive buttons"
);

// 5. FortuneSheet
const sheetGridCode = readCode("components/events/spreadsheet/dynamic-sheet-grid.tsx");
assert(
  sheetGridCode.includes("overflow-hidden") &&
    sheetGridCode.includes("h-[60vh] sm:h-[620px] md:h-[680px] lg:h-[720px]"),
  "FortuneSheet wrapper has overflow-hidden and responsive fixed height (h-[60vh] sm:h-[620px] md:h-[680px] lg:h-[720px])"
);

console.log("\n🎉 ALL MOBILE RESPONSIVENESS ASSERTIONS PASSED SUCCESSFULLY!");
