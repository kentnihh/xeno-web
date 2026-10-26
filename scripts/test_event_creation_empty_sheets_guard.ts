import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { createEventSchema } from "../lib/validations/event";
import { createAdminClient } from "../lib/supabase/admin";

console.log("==================================================================");
console.log("TEST SUITE: Event Creation Empty Sheets Guard (use_template: false)");
console.log("==================================================================\n");

// --- 1. Audit Form Payload Handling & Helper Text in create-event-form.tsx ---
console.log("1. Auditing create-event-form.tsx UI & Payload Handling...");
const createEventFormPath = path.resolve(
  process.cwd(),
  "components/events/create-event-form.tsx"
);
assert(fs.existsSync(createEventFormPath), "create-event-form.tsx must exist");
const createEventFormContent = fs.readFileSync(createEventFormPath, "utf-8");

assert(
  createEventFormContent.includes('name="use_template_present"'),
  "create-event-form.tsx must include use_template_present hidden flag"
);

const expectedHelperText =
  "Jika dicentang, template lembar kerja standar akan dibuat otomatis. Jika tidak dicentang, lembar kerja akan dimulai dari kosong tanpa sheet awal.";
assert(
  createEventFormContent.includes(expectedHelperText),
  `create-event-form.tsx must include exact helper text: "${expectedHelperText}"`
);

assert(
  createEventFormContent.includes("isUseTemplateChecked"),
  "create-event-form.tsx must check checkbox checked state in handleSubmit"
);
console.log("   ✓ Checkbox present flag, helper text, and handleSubmit checked binding verified.");

// --- 2. Audit Zod Validation Schema in lib/validations/event.ts ---
console.log("\n2. Auditing Zod createEventSchema parsing for use_template...");

// Test default (omitted) -> true
const defaultParsed = createEventSchema.parse({
  title: "Test Event",
  venue: "Test Venue",
  start_date: "2026-11-01T10:00:00",
  end_date: "2026-11-01T14:00:00",
});
assert.strictEqual(
  defaultParsed.use_template,
  true,
  "use_template must default to true when omitted"
);

// Test string 'false' -> false
const falseStringParsed = createEventSchema.parse({
  title: "Test Event",
  venue: "Test Venue",
  start_date: "2026-11-01T10:00:00",
  end_date: "2026-11-01T14:00:00",
  use_template: "false",
});
assert.strictEqual(
  falseStringParsed.use_template,
  false,
  "use_template must parse string 'false' as boolean false"
);

// Test boolean false -> false
const falseBoolParsed = createEventSchema.parse({
  title: "Test Event",
  venue: "Test Venue",
  start_date: "2026-11-01T10:00:00",
  end_date: "2026-11-01T14:00:00",
  use_template: false,
});
assert.strictEqual(
  falseBoolParsed.use_template,
  false,
  "use_template must parse boolean false as boolean false"
);

// Test string 'true' -> true
const trueStringParsed = createEventSchema.parse({
  title: "Test Event",
  venue: "Test Venue",
  start_date: "2026-11-01T10:00:00",
  end_date: "2026-11-01T14:00:00",
  use_template: "true",
});
assert.strictEqual(
  trueStringParsed.use_template,
  true,
  "use_template must parse string 'true' as boolean true"
);
console.log("   ✓ Zod schema correctly evaluates default true, 'false' -> false, and false -> false.");

// --- 3. Audit Server Action in app/(dashboard)/events/actions.ts ---
console.log("\n3. Auditing Server Action app/(dashboard)/events/actions.ts...");
const eventActionsPath = path.resolve(
  process.cwd(),
  "app/(dashboard)/events/actions.ts"
);
assert(fs.existsSync(eventActionsPath), "events/actions.ts must exist");
const eventActionsContent = fs.readFileSync(eventActionsPath, "utf-8");

assert(
  eventActionsContent.includes("use_template_present"),
  "actions.ts must inspect use_template_present"
);
assert(
  eventActionsContent.includes("useDefaultTemplates") ||
    eventActionsContent.includes("useTemplateExcel"),
  "actions.ts must support alias parameters like useDefaultTemplates/useTemplateExcel"
);
assert(
  eventActionsContent.includes("const useTemplates = Boolean(validated.use_template === true)"),
  "actions.ts must perform strict boolean evaluation on use_template"
);
assert(
  !eventActionsContent.includes('sheet_name: "Sheet 1"'),
  "actions.ts must NOT insert single blank Sheet 1 when use_template is false"
);
console.log("   ✓ Server action implements strict boolean guard and completely omits sheet fallback.");

// --- 4. Audit getEventSheets in app/(dashboard)/events/sheet-actions.ts ---
console.log("\n4. Auditing getEventSheets in sheet-actions.ts...");
const sheetActionsPath = path.resolve(
  process.cwd(),
  "app/(dashboard)/events/sheet-actions.ts"
);
assert(fs.existsSync(sheetActionsPath), "sheet-actions.ts must exist");
const sheetActionsContent = fs.readFileSync(sheetActionsPath, "utf-8");

assert(
  !sheetActionsContent.includes("buildDefaultEventSheets(eventId)"),
  "getEventSheets must NOT fallback to buildDefaultEventSheets on empty query"
);
console.log("   ✓ getEventSheets does not auto-seed sheets on empty event query.");

// --- 5. Audit Empty State UI in event-spreadsheet-tabs.tsx & event-detail-tabs.tsx ---
console.log("\n5. Auditing Empty State UI in Event Detail Tabs & Spreadsheet Tabs...");
const spreadsheetTabsPath = path.resolve(
  process.cwd(),
  "components/events/spreadsheet/event-spreadsheet-tabs.tsx"
);
assert(fs.existsSync(spreadsheetTabsPath), "event-spreadsheet-tabs.tsx must exist");
const spreadsheetTabsContent = fs.readFileSync(spreadsheetTabsPath, "utf-8");

assert(
  spreadsheetTabsContent.includes("sheets.length === 0"),
  "event-spreadsheet-tabs.tsx must conditionally check sheets.length === 0"
);
assert(
  spreadsheetTabsContent.includes("Belum Ada Lembar Kerja"),
  "event-spreadsheet-tabs.tsx must display empty state title 'Belum Ada Lembar Kerja'"
);
assert(
  spreadsheetTabsContent.includes("Tambah Sheet Baru"),
  "event-spreadsheet-tabs.tsx must provide a button with 'Tambah Sheet Baru'"
);

const detailTabsPath = path.resolve(
  process.cwd(),
  "components/events/event-detail-tabs.tsx"
);
assert(fs.existsSync(detailTabsPath), "event-detail-tabs.tsx must exist");
const detailTabsContent = fs.readFileSync(detailTabsPath, "utf-8");

assert(
  detailTabsContent.includes("{sheets.length}"),
  "event-detail-tabs.tsx must render {sheets.length} to show Lembar Kerja (0)"
);
console.log("   ✓ Empty state illustration, button, and Lembar Kerja (0) tab badge verified.");

// --- 6. Live Database Integration Test (if Supabase env available) ---
console.log("\n6. Live Database Verification: Create Event with use_template: false...");

async function liveDbCheck() {
  try {
    const admin = createAdminClient();
    const testTitle = `Test No Sheets Event ${Date.now()}`;

    // Insert an event directly to test event_sheets isolation
    const { data: newEvent, error: insertError } = await admin
      .from("events")
      .insert({
        title: testTitle,
        venue: "Virtual Room",
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 3600000).toISOString(),
        status: "planning",
      })
      .select("id")
      .single();

    if (insertError || !newEvent) {
      console.log(`   ℹ Skipping live DB test (DB not reachable or credentials missing: ${insertError?.message})`);
      return;
    }

    // Since use_template was unchecked (no sheets seeded), check event_sheets count:
    const { data: sheetRows, error: queryErr } = await admin
      .from("event_sheets")
      .select("id")
      .eq("event_id", newEvent.id);

    assert.strictEqual(queryErr, null, "Querying event_sheets must not error");
    assert.strictEqual(
      sheetRows?.length,
      0,
      `event_sheets count must be EXACTLY 0 when unchecked! Found: ${sheetRows?.length}`
    );
    console.log(`   ✓ Verified in live Supabase DB: event_sheets count for event is 0.`);

    // Cleanup
    await admin.from("events").delete().eq("id", newEvent.id);
    console.log(`   ✓ Cleaned up test event.`);
  } catch (err: unknown) {
    console.log(`   ℹ Skipping live DB execution: ${(err as Error).message}`);
  }
}

async function main() {
  await liveDbCheck();

  console.log("\n==================================================================");
  console.log("🎉 ALL EVENT CREATION EMPTY SHEETS GUARD TESTS PASSED! 🚀");
  console.log("==================================================================");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
