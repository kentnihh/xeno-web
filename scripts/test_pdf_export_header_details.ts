import assert from "node:assert";
import fs from "node:fs";
import { jsPDF } from "jspdf";
import {
  renderSheetHeader,
  registerMontserratFont,
  buildSpreadsheetPdf,
  formatHeaderDate,
  formatHeaderPax,
  formatHeaderVenue,
} from "../lib/pdf/spreadsheet-pdf";
import type { EventSheet } from "../types/database";

console.log("=== Testing PDF Export Header Details (Venue, Date, Pax) ===\n");

// 1. Test Helper Formatters
console.log("1. Testing Header Formatting Helpers...");
assert.strictEqual(formatHeaderDate("2026-10-24T10:00:00Z"), "24 Okt 2026");
assert.strictEqual(formatHeaderDate("2026-10-24"), "24 Okt 2026");
assert.strictEqual(formatHeaderDate(null), "-");
assert.strictEqual(formatHeaderDate(undefined), "-");
assert.strictEqual(formatHeaderDate(""), "-");

assert.strictEqual(formatHeaderPax(500), "500 Pax");
assert.strictEqual(formatHeaderPax(1500), "1.500 Pax");
assert.strictEqual(formatHeaderPax(null), "-");
assert.strictEqual(formatHeaderPax(undefined), "-");
assert.strictEqual(formatHeaderPax(""), "-");

assert.strictEqual(formatHeaderVenue("Grand Ballroom Hotel Mulia"), "Grand Ballroom Hotel Mulia");
assert.strictEqual(formatHeaderVenue(null), "-");
assert.strictEqual(formatHeaderVenue(""), "-");
console.log("✓ Formatting helpers handle valid inputs and empty states gracefully.");

// 2. Test renderSheetHeader with Full Event Details
console.log("2. Testing renderSheetHeader with full event details...");
const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
registerMontserratFont(doc);

const textCalls: any[] = [];
doc.text = function (...args: any[]) {
  textCalls.push(args);
  return doc;
};

const fakeLogoDataUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

const startY = renderSheetHeader(
  doc,
  "Michelle & Theo Reception",
  "RUNDOWN",
  297,
  14,
  269,
  "24/10/2026, 18:00",
  fakeLogoDataUrl,
  {
    title: "Michelle & Theo Reception",
    venue: "Grand Ballroom Hotel Mulia",
    start_date: "2026-10-24T10:00:00.000Z",
    pax: 500,
  }
);

assert.ok(startY >= 38 && startY <= 42, `startY must be ~40mm, got ${startY}`);

// Check that Event Title is rendered prominent on the right
const titleCall = textCalls.find((c) => c[0] === "Michelle & Theo Reception");
assert.ok(titleCall, "Must render event title 'Michelle & Theo Reception'");
assert.strictEqual(titleCall[1], 297 - 14, "Title must be aligned to right margin");
assert.strictEqual(titleCall[3]?.align, "right", "Title alignment must be right");

// Check Venue call with icon 📍
const venueCall = textCalls.find((c) => typeof c[0] === "string" && c[0].includes("Grand Ballroom Hotel Mulia"));
assert.ok(venueCall, "Must render venue 'Grand Ballroom Hotel Mulia'");
assert.ok(venueCall[0].includes("📍"), "Venue must have 📍 icon");
assert.strictEqual(venueCall[3]?.align, "right", "Venue alignment must be right");

// Check Date call with icon 📅 and formatted date
const dateCall = textCalls.find((c) => typeof c[0] === "string" && c[0].includes("24 Okt 2026"));
assert.ok(dateCall, "Must render formatted Indonesian date '24 Okt 2026'");
assert.ok(dateCall[0].includes("📅"), "Date must have 📅 icon");
assert.strictEqual(dateCall[3]?.align, "right", "Date alignment must be right");

// Check Pax call with icon 👥 and formatted pax
const paxCall = textCalls.find((c) => typeof c[0] === "string" && c[0].includes("500 Pax"));
assert.ok(paxCall, "Must render guest count '500 Pax'");
assert.ok(paxCall[0].includes("👥"), "Pax must have 👥 icon");
assert.strictEqual(paxCall[3]?.align, "right", "Pax alignment must be right");

console.log("✓ renderSheetHeader correctly renders Event Title, 📍 Venue, 📅 Date, and 👥 Pax.");

// 3. Test Graceful Fallbacks with Null / Undefined Values
console.log("3. Testing renderSheetHeader with empty / null fallbacks...");
textCalls.length = 0;

renderSheetHeader(
  doc,
  "Minimalist Event",
  "CHECKLIST",
  297,
  14,
  269,
  "24/10/2026, 18:00",
  fakeLogoDataUrl,
  {
    title: "Minimalist Event",
    venue: null,
    start_date: null,
    pax: null,
  }
);

assert.ok(textCalls.some((c) => c[0] === "📍 -"), "Null venue must render '📍 -'");
assert.ok(textCalls.some((c) => c[0] === "📅 -"), "Null date must render '📅 -'");
assert.ok(textCalls.some((c) => c[0] === "👥 -"), "Null pax must render '👥 -'");
console.log("✓ Empty states gracefully output '-' without layout breaking.");

// 4. Test buildSpreadsheetPdf Integration
console.log("4. Testing buildSpreadsheetPdf with event details...");
const mockSheet: EventSheet<any> = {
  id: "sheet-1",
  event_id: "evt-1",
  sheet_name: "Rundown",
  sort_order: 0,
  order_index: 0,
  data: JSON.stringify([
    { r: 0, c: 0, v: { m: "No", v: "No" } },
    { r: 0, c: 1, v: { m: "Waktu", v: "Waktu" } },
  ]),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const fullPdfDoc = buildSpreadsheetPdf({
  eventTitle: "Gala Dinner 2026",
  event: {
    title: "Gala Dinner 2026",
    venue: "ICE BSD",
    start_date: "2026-11-15T09:00:00Z",
    pax: 1200,
  },
  sheets: [mockSheet],
  orientation: "landscape",
  logoDataUrl: fakeLogoDataUrl,
});

assert.strictEqual(fullPdfDoc.getNumberOfPages(), 1, "Must generate 1 page document");
console.log("✓ buildSpreadsheetPdf end-to-end build succeeded.");

// 5. Audit Component Prop Forwarding
console.log("5. Auditing UI components for event prop forwarding...");
const modalSrc = fs.readFileSync("components/events/spreadsheet/export-spreadsheet-pdf-modal.tsx", "utf-8");
assert.ok(modalSrc.includes("event?:"), "ExportSpreadsheetPdfModal must accept event prop");
assert.ok(modalSrc.includes("event: event ||"), "Modal must forward event to downloadSpreadsheetPdf");

const buttonSrc = fs.readFileSync("components/events/spreadsheet/export-spreadsheet-pdf-button.tsx", "utf-8");
assert.ok(buttonSrc.includes("event?:"), "ExportSpreadsheetPdfButton must accept event prop");
assert.ok(buttonSrc.includes("event={event}"), "Button must forward event to modal");

const actionButtonsSrc = fs.readFileSync("components/events/event-action-buttons.tsx", "utf-8");
assert.ok(actionButtonsSrc.includes("event={event}"), "EventActionButtons must pass event={event} to ExportSpreadsheetPdfButton");
console.log("✓ Event object verified throughout UI component chain.");

console.log("\n🎉 ALL PDF EXPORT HEADER TESTS PASSED SUCCESSFULLY! 🚀");
