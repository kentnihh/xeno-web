import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

console.log("==================================================================");
console.log("TEST SUITE: Remove Price / Financial Fields from Event Vendors");
console.log("==================================================================\n");

// --- 1. Audit AssignVendorModal in components/events/assign-vendor-modal.tsx ---
console.log("1. Auditing AssignVendorModal Component...");
const modalPath = path.resolve(
  process.cwd(),
  "components/events/assign-vendor-modal.tsx"
);
assert(fs.existsSync(modalPath), "assign-vendor-modal.tsx must exist");
const modalContent = fs.readFileSync(modalPath, "utf-8");

assert(
  !modalContent.includes('name="cost"') && !modalContent.includes('label="cost"'),
  "assign-vendor-modal.tsx must not have cost form controls"
);
assert(
  !modalContent.includes("Nilai Kontrak (IDR)") && !modalContent.includes("Biaya (IDR)"),
  "assign-vendor-modal.tsx must not display price/cost input labels"
);
assert(
  !modalContent.includes("setCost("),
  "assign-vendor-modal.tsx must not maintain cost state"
);
assert(
  modalContent.includes("Status Layanan Operasional"),
  "assign-vendor-modal.tsx must display operational status field"
);
assert(
  modalContent.includes("Rincian Layanan / Paket"),
  "assign-vendor-modal.tsx must retain service details field"
);
console.log("   ✓ Price/cost input fields completely removed from modal; operational fields preserved.");

// --- 2. Audit EventVendorsSection in components/events/event-vendors-section.tsx ---
console.log("\n2. Auditing EventVendorsSection Component & Vendor Cards...");
const sectionPath = path.resolve(
  process.cwd(),
  "components/events/event-vendors-section.tsx"
);
assert(fs.existsSync(sectionPath), "event-vendors-section.tsx must exist");
const sectionContent = fs.readFileSync(sectionPath, "utf-8");

assert(
  !sectionContent.includes("formatIDR"),
  "event-vendors-section.tsx must not import or render formatIDR"
);
assert(
  !sectionContent.includes("totalVendorCost"),
  "event-vendors-section.tsx must not calculate totalVendorCost"
);
assert(
  !sectionContent.includes("Total Biaya Vendor Kontrak"),
  "event-vendors-section.tsx must not render Total Biaya summary footer"
);
assert(
  !sectionContent.includes("ev.cost"),
  "event-vendors-section.tsx must not render ev.cost on vendor cards"
);
assert(
  sectionContent.includes("vendor?.pic_name") && sectionContent.includes("vendor?.phone"),
  "event-vendors-section.tsx must display operational PIC Name and Phone/WhatsApp"
);
console.log("   ✓ Price tags and total cost summary removed; vendor card displays clean operational layout.");

// --- 3. Audit Server Actions in app/(dashboard)/events/actions.ts ---
console.log("\n3. Auditing Server Actions in events/actions.ts...");
const actionsPath = path.resolve(
  process.cwd(),
  "app/(dashboard)/events/actions.ts"
);
assert(fs.existsSync(actionsPath), "events/actions.ts must exist");
const actionsContent = fs.readFileSync(actionsPath, "utf-8");

assert(
  actionsContent.includes("export async function assignEventVendor"),
  "events/actions.ts must export assignEventVendor"
);
assert(
  actionsContent.includes("export const assignVendorToEvent = assignEventVendor"),
  "events/actions.ts must export assignVendorToEvent alias"
);
assert(
  actionsContent.includes("export const linkVendor = assignEventVendor"),
  "events/actions.ts must export linkVendor alias"
);
assert(
  actionsContent.includes("cost: null"),
  "events/actions.ts must set cost: null when inserting/updating event_vendors"
);
assert(
  !actionsContent.includes('formData.get("cost")'),
  "events/actions.ts must not extract cost from vendor formData"
);
console.log("   ✓ Server actions insert cost: null and export required semantic aliases.");

console.log("\n==================================================================");
console.log("🎉 ALL EVENT VENDOR PRICE REMOVAL TESTS PASSED! 🚀");
console.log("==================================================================");
