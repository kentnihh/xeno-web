import assert from "node:assert";
import * as fs from "node:fs";
import * as path from "node:path";
import { createClient } from "@supabase/supabase-js";

console.log("==================================================================");
console.log("TEST SUITE: Permanently Drop Event Status from DB, Schema & Types");
console.log("==================================================================");

// 1. Auditing Migration & Schema Files
console.log("\n1. Auditing Migration and Schema Files...");
const schemaPath = path.resolve(process.cwd(), "supabase/schema.sql");
const schemaSql = fs.readFileSync(schemaPath, "utf-8");

assert(
  !schemaSql.includes("status public.event_status"),
  "supabase/schema.sql must NOT contain status column on events table"
);
assert(
  !schemaSql.includes("idx_events_status"),
  "supabase/schema.sql must NOT contain idx_events_status index"
);
assert(
  !schemaSql.includes("create type public.event_status"),
  "supabase/schema.sql must NOT contain event_status enum creation"
);
console.log("   ✓ Canonical schema.sql verified (no event_status enum, status column, or index).");

const migrationsDir = path.resolve(process.cwd(), "supabase/migrations");
const migrationFiles = fs.readdirSync(migrationsDir);
const dropMigration = migrationFiles.find((f) => f.includes("drop_event_status"));
assert(dropMigration, "Migration file for drop_event_status must exist");

const migrationContent = fs.readFileSync(path.join(migrationsDir, dropMigration), "utf-8");
assert(
  migrationContent.includes("DROP INDEX IF EXISTS public.idx_events_status"),
  "Migration must drop idx_events_status"
);
assert(
  migrationContent.includes("ALTER TABLE public.events DROP COLUMN IF EXISTS status"),
  "Migration must drop status column from events table"
);
assert(
  migrationContent.includes("DROP TYPE IF EXISTS public.event_status"),
  "Migration must drop event_status type"
);
console.log(`   ✓ Migration file verified: ${dropMigration}`);

// 2. Auditing TypeScript Models & Interfaces
console.log("\n2. Auditing TypeScript Interfaces...");
const dbTypesPath = path.resolve(process.cwd(), "types/database.ts");
const dbTypesCode = fs.readFileSync(dbTypesPath, "utf-8");

// Extract the Event interface definition block
const eventInterfaceMatch = dbTypesCode.match(/export interface Event \{([\s\S]*?)\}/);
assert(eventInterfaceMatch, "types/database.ts must define export interface Event");
assert(
  !eventInterfaceMatch[1].includes("status?:") && !eventInterfaceMatch[1].includes("status:"),
  "Event interface in types/database.ts must NOT have status property"
);
console.log("   ✓ Event interface verified without status field in types/database.ts.");

// 3. Auditing Server Actions & Queries
console.log("\n3. Auditing Server Actions and Supabase Queries...");
const actionsPath = path.resolve(process.cwd(), "app/(dashboard)/events/actions.ts");
const actionsCode = fs.readFileSync(actionsPath, "utf-8");

assert(
  !actionsCode.includes("status: null"),
  "createEvent must not insert status into events table"
);
assert(
  !actionsCode.includes("updatePayload.status"),
  "updateEvent must not update status in events table"
);
console.log("   ✓ createEvent and updateEvent verified without status payload.");

const eventsPagePath = path.resolve(process.cwd(), "app/(dashboard)/events/page.tsx");
const eventsPageCode = fs.readFileSync(eventsPagePath, "utf-8");
assert(
  !eventsPageCode.includes('select("id, title, start_date, venue, status, pic")'),
  "Events page must not select status column from events"
);
console.log("   ✓ Events page query verified without status column.");

const gcalSyncPath = path.resolve(process.cwd(), "app/actions/gcal-sync.ts");
const gcalSyncCode = fs.readFileSync(gcalSyncPath, "utf-8");
assert(
  !gcalSyncCode.includes('.neq("status", "completed")'),
  "gcal-sync must not query non-existent status column"
);
console.log("   ✓ gcal-sync verified without status filter.");

// 4. Live Supabase PostgreSQL Verification
console.log("\n4. Verifying Live Supabase PostgreSQL Schema...");
async function verifyLiveDatabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.log("   (Supabase credentials missing, skipping live DB checks)");
    return;
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  // Direct test: Try selecting 'status' column from events (must fail with column does not exist)
  const { data: selectStatusData, error: selectStatusErr } = await supabase
    .from("events")
    .select("status")
    .limit(1);

  assert(
    selectStatusErr && selectStatusErr.message.includes("does not exist"),
    "Selecting 'status' from events table must fail because column was dropped permanently"
  );
  console.log(`   ✓ Live PostgreSQL: events.status column confirmed permanently dropped (${selectStatusErr.message}).`);

  // Direct test: Create event without status column
  const { data: createdEvent, error: insertErr } = await supabase
    .from("events")
    .insert({
      title: "Test Status Drop Event " + Date.now(),
      venue: "Jakarta Test Venue",
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 3600000).toISOString(),
    })
    .select("id, title, venue, start_date")
    .single();

  assert(!insertErr && createdEvent, "Inserting event without status must succeed: " + insertErr?.message);
  console.log(`   ✓ Live PostgreSQL: Inserted event id=${createdEvent.id} successfully without status.`);

  // Cleanup test event
  await supabase.from("events").delete().eq("id", createdEvent.id);
  console.log("   ✓ Cleaned up test event.");
}

verifyLiveDatabase()
  .then(() => {
    console.log("\n==================================================================");
    console.log("🎉 ALL EVENT STATUS DROP VERIFICATION ASSERTIONS PASSED! 🚀");
    console.log("==================================================================");
  })
  .catch((err) => {
    console.error("\n❌ Verification failed:", err);
    process.exit(1);
  });
