import assert from "node:assert";
import fs from "node:fs";
import { createEventSchema, updateEventSchema } from "../lib/validations/event";

console.log("=== Testing Event Pax (Jumlah Undangan) Feature ===\n");

// 1. Zod Schema Validation Tests for Pax
console.log("1. Testing createEventSchema with Pax...");
const validCreation = createEventSchema.parse({
  title: "Gala Dinner 2026",
  venue: "Grand Ballroom Hotel Mulia",
  start_date: "2026-11-20 18:00",
  end_date: "2026-11-20 22:00",
  pic: "Jonathan Kent",
  pax: "750",
});
assert.strictEqual(validCreation.pax, 750, "String '750' should parse to number 750");

const emptyPaxCreation = createEventSchema.parse({
  title: "Gala Dinner 2026",
  venue: "Grand Ballroom Hotel Mulia",
  start_date: "2026-11-20 18:00",
  end_date: "2026-11-20 22:00",
  pax: "",
});
assert.strictEqual(emptyPaxCreation.pax, null, "Empty string pax should parse to null");

const nullPaxCreation = createEventSchema.parse({
  title: "Gala Dinner 2026",
  venue: "Grand Ballroom Hotel Mulia",
  start_date: "2026-11-20 18:00",
  end_date: "2026-11-20 22:00",
  pax: null,
});
assert.strictEqual(nullPaxCreation.pax, null, "Null pax should remain null");

let negativePaxThrew = false;
try {
  createEventSchema.parse({
    title: "Gala Dinner 2026",
    venue: "Grand Ballroom Hotel Mulia",
    start_date: "2026-11-20 18:00",
    end_date: "2026-11-20 22:00",
    pax: -10,
  });
} catch {
  negativePaxThrew = true;
}
assert.strictEqual(negativePaxThrew, true, "Negative pax should throw validation error");
console.log("✓ createEventSchema correctly validates and parses pax.");

console.log("2. Testing updateEventSchema with Pax...");
const validUpdate = updateEventSchema.parse({
  id: "test-event-id",
  title: "Updated Gala Dinner",
  venue: "Grand Ballroom Hotel Mulia",
  start_date: "2026-11-20 18:00",
  end_date: "2026-11-20 22:00",
  pax: 1200,
});
assert.strictEqual(validUpdate.pax, 1200, "Number 1200 should be preserved");

const emptyUpdatePax = updateEventSchema.parse({
  id: "test-event-id",
  title: "Updated Gala Dinner",
  venue: "Grand Ballroom Hotel Mulia",
  start_date: "2026-11-20 18:00",
  end_date: "2026-11-20 22:00",
  pax: "",
});
assert.strictEqual(emptyUpdatePax.pax, null, "Empty string should become null in update");
console.log("✓ updateEventSchema correctly validates and parses pax.");

// 2. Audit UI Files
console.log("3. Auditing UI components and detail header...");
const detailPage = fs.readFileSync("app/(dashboard)/events/[id]/page.tsx", "utf-8");
assert(detailPage.includes("md:grid-cols-4") || detailPage.includes("md:grid-cols-5"), "Detail header must have clean grid layout (md:grid-cols-4 or md:grid-cols-5)");
assert(detailPage.includes("Pax"), "Detail header must render 'Pax' label");
assert(detailPage.includes("event.pax ? `${event.pax.toLocaleString(\"id-ID\")} Pax` : \"-\"") ||
       detailPage.includes("event.pax ? `${event.pax.toLocaleString('id-ID')} Pax` : '-'"),
       "Detail header must format pax using toLocaleString('id-ID') with '-' fallback");
assert(detailPage.includes("<Users className=\"w-3.5 h-3.5 text-[#007aff]\" />"),
       "Detail header must render Users icon with blue styling text-[#007aff]");

const createForm = fs.readFileSync("components/events/create-event-form.tsx", "utf-8");
assert(createForm.includes('name="pax"'), "CreateEventForm must contain input name=\"pax\"");
assert(createForm.includes('type="number"'), "CreateEventForm pax input must be type=\"number\"");

const editForm = fs.readFileSync("components/events/edit-event-form.tsx", "utf-8");
assert(editForm.includes('name="pax"'), "EditEventForm must contain input name=\"pax\"");
assert(editForm.includes('defaultValue={event.pax ?? ""}'), "EditEventForm must bind defaultValue to event.pax");

const editModal = fs.readFileSync("components/events/edit-event-modal.tsx", "utf-8");
assert(editModal.includes('name="pax"'), "EditEventModal must contain input name=\"pax\"");
assert(editModal.includes('defaultValue={event.pax ?? ""}'), "EditEventModal must bind defaultValue to event.pax");
console.log("✓ All UI components verified with Pax inputs and 5th header column.");

// 3. Audit Schema & Migration
console.log("4. Auditing schema.sql and migrations...");
const schemaSql = fs.readFileSync("supabase/schema.sql", "utf-8");
assert(schemaSql.includes("pax integer default null"), "schema.sql must include pax integer default null in events table");

const migrationFiles = fs.readdirSync("supabase/migrations");
const paxMigration = migrationFiles.find(f => f.includes("pax"));
assert(paxMigration, "Must have migration file for pax");
const migrationContent = fs.readFileSync(`supabase/migrations/${paxMigration}`, "utf-8");
assert(migrationContent.includes("ALTER TABLE public.events ADD COLUMN IF NOT EXISTS pax INTEGER DEFAULT NULL;"),
       "Migration must include ALTER TABLE statement for pax");
console.log("✓ Schema and migration files verified.");

console.log("\n🎉 ALL EVENT PAX AUDIT & VALIDATION ASSERTIONS PASSED! 🚀");
