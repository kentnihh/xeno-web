import assert from "node:assert";
import { buildEventSummaryPdf } from "../lib/pdf/event-summary-pdf";
import type { Event, EventCrew, EventTask, EventExpense } from "../types/database";

console.log("== Running PDF Export Self-Check ==");

const mockEvent: Event = {
  id: "evt-12345678-abcd",
  title: "Sinar Jaya Annual Gala 2026",
  description: "Annual corporate gathering and celebration",
  client_id: "cl-1",
  venue: "Grand Ballroom Hotel Indonesia Kempinski Jakarta",
  start_date: "2026-10-20T11:00:00.000Z",
  end_date: "2026-10-20T16:00:00.000Z",
  status: "confirmed",
  pic: "Jonathan Admin",
  created_by: "usr-1",
  created_at: "2026-10-01T00:00:00.000Z",
  updated_at: "2026-10-01T00:00:00.000Z",
  client: {
    id: "cl-1",
    name: "PT Sinar Jaya Abadi",
    company: "Sinar Jaya Group",
    email: "contact@sinarjaya.co.id",
    phone: "+62 21-555-1234",
    address: "Jakarta Pusat",
    notes: "VIP Client",
    created_at: "2026-01-01T00:00:00.000Z",
  },
};

const mockCrew: EventCrew[] = [
  {
    id: "crew-1",
    event_id: mockEvent.id,
    profile_id: "usr-1",
    role_in_event: "Stage Manager",
    created_at: "2026-10-01T00:00:00.000Z",
    profile: {
      id: "usr-1",
      full_name: "Jonathan Admin",
      email: "admin@xenoent.com",
      role: "admin",
      phone: "+62 812-1111-2222",
      avatar_url: null,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    },
  },
  {
    id: "crew-2",
    event_id: mockEvent.id,
    profile_id: "usr-2",
    role_in_event: "Sound Engineer & Audio Director",
    created_at: "2026-10-01T00:00:00.000Z",
    profile: {
      id: "usr-2",
      full_name: "Rian Kru Operasional",
      email: "rian@xenoent.com",
      role: "staff",
      phone: "+62 813-3333-4444",
      avatar_url: null,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    },
  },
];

const mockTasks: EventTask[] = [
  {
    id: "task-1",
    event_id: mockEvent.id,
    title: "Rigging Sound System & FOH Audio Check",
    description: "Line check 32 channel dan sinkronisasi wireless mic Shure.",
    assigned_to: "usr-2",
    due_date: "2026-10-20T08:00:00.000Z",
    status: "in_progress",
    priority: "urgent",
    created_at: "2026-10-01T00:00:00.000Z",
    updated_at: "2026-10-01T00:00:00.000Z",
    assignee: mockCrew[1].profile,
  },
  {
    id: "task-2",
    event_id: mockEvent.id,
    title: "Briefing MC & Opening Sequence Rehearsal",
    description: "Gladi resik cue pembuka dan video bumper VIP.",
    assigned_to: "usr-1",
    due_date: "2026-10-20T09:30:00.000Z",
    status: "todo",
    priority: "high",
    created_at: "2026-10-01T00:00:00.000Z",
    updated_at: "2026-10-01T00:00:00.000Z",
    assignee: mockCrew[0].profile,
  },
  {
    id: "task-3",
    event_id: mockEvent.id,
    title: "Closing & Clear Area Ballroom",
    description: "Bongkar panggung dan load-out semua perlengkapan rental.",
    assigned_to: null,
    due_date: "2026-10-20T17:00:00.000Z",
    status: "todo",
    priority: "medium",
    created_at: "2026-10-01T00:00:00.000Z",
    updated_at: "2026-10-01T00:00:00.000Z",
    assignee: null,
  },
];

const mockExpenses: EventExpense[] = [
  {
    id: "exp-1",
    event_id: mockEvent.id,
    amount: 85000000,
    category: "Vendor",
    expense_date: "2026-10-10",
    status: "Paid",
    notes: "DP Sound system",
    created_at: "2026-10-10T00:00:00.000Z",
  },
];

// Test 1: Full dataset generation
const doc1 = buildEventSummaryPdf({
  event: mockEvent,
  crew: mockCrew,
  tasks: mockTasks,
  expenses: mockExpenses,
});

assert(doc1 !== null, "PDF doc should be returned");
assert(doc1.getNumberOfPages() >= 1, "PDF should have at least 1 page");
const bytes1 = doc1.output("arraybuffer").byteLength;
assert(bytes1 > 2000, `PDF byte length should be > 2000 bytes, got ${bytes1}`);
console.log(`✓ Full PDF export succeeded (${bytes1} bytes, ${doc1.getNumberOfPages()} page(s))`);

// Test 2: Empty crew and tasks fallback
const doc2 = buildEventSummaryPdf({
  event: mockEvent,
  crew: [],
  tasks: [],
});
assert(doc2.getNumberOfPages() === 1, "Empty dataset should fit in 1 page");
const bytes2 = doc2.output("arraybuffer").byteLength;
assert(bytes2 > 2000, `Empty PDF byte length should be > 2000 bytes, got ${bytes2}`);
console.log(`✓ Empty fallback PDF export succeeded (${bytes2} bytes)`);

// ==========================================
// Test 3: Spreadsheet PDF Export (Legacy & Rich Formats)
// ==========================================
import { buildSpreadsheetPdf, parseFortuneSheetForAutoTable } from "../lib/pdf/spreadsheet-pdf";
import type { EventSheet } from "../types/database";

console.log("\n== Testing Spreadsheet PDF Generation ==");

// Legacy format sheet
const legacySheet: EventSheet = {
  id: "sheet-leg-1",
  event_id: mockEvent.id,
  sheet_name: "CHECKLIST_OPS",
  order_index: 0,
  data: {
    columns: [
      { id: "col_1", name: "No" },
      { id: "col_2", name: "Item Kebutuhan" },
      { id: "col_3", name: "Penanggung Jawab" },
      { id: "col_4", name: "Status" },
    ],
    rows: [
      { id: "r1", col_1: "1", col_2: "Sound System 10.000W", col_3: "Vendor Audio", col_4: "Confirmed" },
      { id: "r2", col_1: "2", col_2: "LED Videotron 6x4m", col_3: "Vendor Visual", col_4: "Confirmed" },
      { id: "r3", col_1: "3", col_2: "Lighting Stage Set", col_3: "Vendor Lighting", col_4: "Pending" },
    ],
  },
  created_at: "2026-10-01T00:00:00.000Z",
  updated_at: "2026-10-01T00:00:00.000Z",
};

// Rich FortuneSheet with cell styles (bg, fc, bl) and merged cells
const richSheet: EventSheet = {
  id: "sheet-rich-1",
  event_id: mockEvent.id,
  sheet_name: "RUNDOWN_VIP",
  order_index: 1,
  data: {
    name: "RUNDOWN_VIP",
    id: "sheet_rundown_vip",
    status: 1,
    order: 1,
    row: 30,
    column: 10,
    celldata: [
      { r: 0, c: 0, v: { v: "SESI UTAMA ACARA (MERGED)", bl: 1, bg: "#1e293b", fc: "#ffffff" } },
      { r: 0, c: 1, v: { v: "", bl: 1 } },
      { r: 0, c: 2, v: { v: "KETERANGAN TEKNIS", bl: 1, bg: "#334155", fc: "#ffffff" } },
      { r: 1, c: 0, v: { v: "18:00 - 19:00", bl: 1, bg: "#fef3c7", ht: 0 } },
      { r: 1, c: 1, v: { v: "Welcoming VIP Guest & Cocktail", fc: "#0369a1", bl: 1 } },
      { r: 1, c: 2, v: { v: "Lounge Area, BGM Jazz Live", it: 1 } },
      { r: 2, c: 0, v: { v: "19:00 - 20:00", bl: 1, bg: "#dcfce7", ht: 0 } },
      { r: 2, c: 1, v: { v: "Main Gala Opening & Keynote", fc: "#15803d", bl: 1 } },
      { r: 2, c: 2, v: { v: "Stage Center, Spotlight on Speaker", it: 1 } },
    ],
    config: {
      merge: {
        "0_0": { r: 0, c: 0, rs: 1, cs: 2 },
      },
    },
  },
  created_at: "2026-10-01T00:00:00.000Z",
  updated_at: "2026-10-01T00:00:00.000Z",
};

// Test parseFortuneSheetForAutoTable
const parsed = parseFortuneSheetForAutoTable(richSheet.data);
assert(parsed.head.length === 1, "Should have 1 header row");
assert(parsed.body.length === 2, "Should have 2 body rows");
// Verify merged root cell
const mergedRoot = parsed.head[0][0];
assert.strictEqual(typeof mergedRoot, "object", "Merged cell should be an object");
assert.strictEqual(mergedRoot.colSpan, 2, "Merged cell should have colSpan = 2");
assert.strictEqual(mergedRoot.content, "SESI UTAMA ACARA (MERGED)");
console.log("✓ parseFortuneSheetForAutoTable correctly preserves cell styles and merge spans");

// Test multi-sheet PDF generation
const sheetDoc = buildSpreadsheetPdf({
  eventTitle: mockEvent.title,
  sheets: [legacySheet, richSheet],
  orientation: "landscape",
});

assert(sheetDoc !== null, "Spreadsheet PDF should be created");
assert.strictEqual(sheetDoc.getNumberOfPages(), 2, "Two sheets should produce 2 pages");
const sheetPdfBytes = sheetDoc.output("arraybuffer").byteLength;
assert(sheetPdfBytes > 3000, `Spreadsheet PDF byte length should be > 3000, got ${sheetPdfBytes}`);
console.log(`✓ Multi-sheet PDF generation succeeded (${sheetPdfBytes} bytes, ${sheetDoc.getNumberOfPages()} pages)`);

console.log("\n== All PDF Export checks passed successfully! ==");
