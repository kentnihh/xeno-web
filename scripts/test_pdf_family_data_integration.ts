import assert from "node:assert";
import { buildSpreadsheetPdf } from "../lib/pdf/spreadsheet-pdf";
import type { EventSheet, EventPublicForm } from "../types/database";

console.log("=== Testing Dynamic Family Data PDF Export Integration ===");

// 1. Mock Sheets Data
const mockSheets: EventSheet[] = [
  {
    id: "sheet-1",
    event_id: "evt-123",
    sheet_name: "CHECKLIST",
    order_index: 0,
    data: {
      data: [
        [
          { v: "No", s: { bl: 1 } },
          { v: "Item Operasional", s: { bl: 1 } },
          { v: "Penanggung Jawab", s: { bl: 1 } },
          { v: "Status", s: { bl: 1 } },
        ],
        [
          { v: "1" },
          { v: "Sound System Check" },
          { v: "Budi (Sound Ops)" },
          { v: "Selesai" },
        ],
        [
          { v: "2" },
          { v: "Lighting Preset" },
          { v: "Andi (Stage)" },
          { v: "Proses" },
        ],
      ],
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// 2. Mock Public Form Data
const mockFamilyData: EventPublicForm = {
  id: "form-1",
  event_id: "evt-123",
  token: "abc123xyz789",
  expires_at: new Date(Date.now() + 86400000 * 3).toISOString(),
  form_schema: [
    {
      id: "groom_family",
      name: "Keluarga Groom (Mempelai Pria)",
      description: "Keluarga inti & perwakilan keluarga besar Groom",
    },
    {
      id: "bride_family",
      name: "Keluarga Bride (Mempelai Wanita)",
      description: "Keluarga inti & perwakilan keluarga besar Bride",
    },
    {
      id: "photo_reps",
      name: "Wakil Foto & Sesi Foto",
      description: "Daftar perwakilan atau kelompok untuk foto bersama",
    },
  ],
  form_data: {
    groom_family: [
      {
        id: "gf-1",
        name: "H. Ahmad Syafii",
        role: "Ayah Kandung Groom",
        phone: "081234567890",
        notes: "Duduk di baris VVIP 1",
        address: "Jl. Diponegoro No. 12, Surabaya",
      },
      {
        id: "gf-2",
        name: "Hj. Siti Aminah",
        role: "Ibu Kandung Groom",
        phone: "081234567891",
        notes: "Membawa kembar adik",
      },
    ],
    bride_family: [
      {
        id: "bf-1",
        name: "Ir. Bambang Wijaya",
        role: "Ayah Kandung Bride",
        phone: "081987654321",
        notes: "Wali nikah",
      },
    ],
    photo_reps: [
      {
        id: "pr-1",
        name: "Keluarga Besar Trah Kartodirjo",
        role: "Keluarga Besar Kakek",
        phone: "081333444555",
        notes: "Sesi foto ke-3 di panggung",
      },
    ],
  },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// TEST CASE 1: Only Sheets exported (Family Data excluded)
console.log("\n[Test 1] Exporting ONLY Excel sheets (includeFamilyData: false)...");
const docSheetsOnly = buildSpreadsheetPdf({
  eventTitle: "The Wedding of Dimas & Sarah",
  sheets: mockSheets,
  includeFamilyData: false,
});

assert.strictEqual(
  docSheetsOnly.getNumberOfPages(),
  1,
  "Should have exactly 1 page for single spreadsheet sheet"
);
console.log("✓ Test 1 passed: Sheets-only PDF has 1 page.");

// TEST CASE 2: Both Sheets AND Family Data exported
console.log("\n[Test 2] Exporting BOTH Sheets AND Family Data...");
const docCombined = buildSpreadsheetPdf({
  eventTitle: "The Wedding of Dimas & Sarah",
  sheets: mockSheets,
  includeFamilyData: true,
  familyData: mockFamilyData,
});

assert(
  docCombined.getNumberOfPages() >= 2,
  `Combined PDF must append Family Data on fresh page. Expected >= 2 pages, got: ${docCombined.getNumberOfPages()}`
);
console.log(`✓ Test 2 passed: Combined PDF has ${docCombined.getNumberOfPages()} pages (Family Data started on fresh page).`);

// TEST CASE 3: Only Family Data exported (no sheets selected)
console.log("\n[Test 3] Exporting ONLY Family Data (sheets: [])...");
const docFamilyOnly = buildSpreadsheetPdf({
  eventTitle: "The Wedding of Dimas & Sarah",
  sheets: [],
  includeFamilyData: true,
  familyData: mockFamilyData,
});

assert(
  docFamilyOnly.getNumberOfPages() >= 1,
  "Family Data-only PDF should generate at least 1 page"
);
console.log(`✓ Test 3 passed: Family Data-only PDF successfully rendered on page 1 with ${docFamilyOnly.getNumberOfPages()} page(s).`);

// TEST CASE 4: Empty Family Data handled gracefully
console.log("\n[Test 4] Handling empty Family Data gracefully...");
const docEmptyFamily = buildSpreadsheetPdf({
  eventTitle: "The Wedding of Dimas & Sarah",
  sheets: [],
  includeFamilyData: true,
  familyData: {
    ...mockFamilyData,
    form_data: {},
  },
});

assert.strictEqual(
  docEmptyFamily.getNumberOfPages(),
  1,
  "Empty family data should render friendly notice on 1 page"
);
console.log("✓ Test 4 passed: Empty Family Data handled gracefully.");

console.log("\n All 4 PDF integration tests PASSED successfully!");
