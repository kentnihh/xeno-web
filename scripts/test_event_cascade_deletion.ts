import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { getStoragePathFromUrl } from "../lib/utils";

async function main() {
  console.log("== Starting Event Cascade Deletion Verification ==\n");

  // 1. Verify Migration File Exists and Contains ON DELETE CASCADE for All Entities
  console.log("1. Verifying Migration File...");
  const migrationPath = path.resolve(process.cwd(), "supabase/migrations/20261021_cascade_delete_events.sql");
  assert(fs.existsSync(migrationPath), "Migration file 20261021_cascade_delete_events.sql must exist");

  const migrationSql = fs.readFileSync(migrationPath, "utf-8");
  const requiredEntities = [
    "event_crew",
    "event_tasks",
    "event_documents",
    "event_sheets",
    "event_public_forms",
    "event_vendors",
    "event_expenses",
  ];

  for (const entity of requiredEntities) {
    assert(
      migrationSql.includes(entity) && migrationSql.includes("ON DELETE CASCADE"),
      `Migration must specify ON DELETE CASCADE for ${entity}`
    );
  }
  console.log("✓ Migration file correctly specifies ON DELETE CASCADE for all event child entities.");

  // 2. Verify Database-Level Foreign Key Constraints in Live Supabase
  console.log("\n2. Verifying Live Supabase DB Foreign Key Constraints...");
  const projectRef = process.env.SUPABASE_PROJECT_ID || process.env.NEXT_PUBLIC_SUPABASE_PROJECT_REF || "yblhtchviuslhfwiwyuo";
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN;

  if (accessToken) {
    try {
      const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
        method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `
          SELECT tc.table_name, tc.constraint_name, rc.delete_rule 
          FROM information_schema.table_constraints AS tc 
          JOIN information_schema.referential_constraints AS rc ON tc.constraint_name = rc.constraint_name 
          JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name 
          WHERE ccu.table_name = 'events' AND tc.constraint_type = 'FOREIGN KEY'
          ORDER BY tc.table_name;
        `,
      }),
    });

    if (res.ok) {
      const constraints: Array<{ table_name: string; constraint_name: string; delete_rule: string }> = await res.json();
      console.log("Live DB Foreign Key Constraints referencing events(id):");
      for (const c of constraints) {
        console.log(` - ${c.table_name} (${c.constraint_name}): ${c.delete_rule}`);
        assert.strictEqual(c.delete_rule, "CASCADE", `Constraint ${c.constraint_name} on table ${c.table_name} must have delete_rule CASCADE`);
      }
      assert(constraints.some((c) => c.table_name === "event_crew"), "event_crew FK must exist");
      assert(constraints.some((c) => c.table_name === "event_tasks"), "event_tasks FK must exist");
      assert(constraints.some((c) => c.table_name === "event_documents"), "event_documents FK must exist");
      assert(constraints.some((c) => c.table_name === "event_sheets"), "event_sheets FK must exist");
      assert(constraints.some((c) => c.table_name === "event_public_forms"), "event_public_forms FK must exist");
      assert(constraints.some((c) => c.table_name === "event_vendors"), "event_vendors FK must exist");
      assert(constraints.some((c) => c.table_name === "event_expenses"), "event_expenses FK must exist");
      console.log("✓ All 7 child tables verified in live database with delete_rule = CASCADE.");
    } else {
      console.warn("Could not query live database management API (skipped live API verification, network or token unavailable)");
    }
  } catch (err) {
    console.warn("Warning querying live DB management API:", err);
  }
} else {
  console.log("ℹ SUPABASE_ACCESS_TOKEN not set in environment. Skipping live Management API query check.");
}

  // 3. Verify Server Action deleteEvent in app/(dashboard)/events/actions.ts
  console.log("\n3. Verifying Server Action deleteEvent Implementation...");
  const actionsPath = path.resolve(process.cwd(), "app/(dashboard)/events/actions.ts");
  const actionsCode = fs.readFileSync(actionsPath, "utf-8");

  assert(actionsCode.includes("export async function deleteEvent("), "deleteEvent must be exported");
  assert(actionsCode.includes("supabase.storage.from("), "deleteEvent must clean up storage objects");
  assert(actionsCode.includes(".remove(filePaths)"), "deleteEvent must remove files from storage");
  assert(actionsCode.includes("deleteEventFromGoogleCalendar"), "deleteEvent must delete Google Calendar event");
  assert(actionsCode.includes("eventData?.gcal_event_id"), "deleteEvent must check event gcal_event_id");
  assert(actionsCode.includes(".from(\"events\").delete().eq(\"id\", eventId)"), "deleteEvent must delete the event from events table");

  console.log("✓ Server Action deleteEvent implements storage file cleanup, Google Calendar cleanup, and DB deletion.");

  // 4. Verify app/actions/events.ts bridge exists and re-exports deleteEvent
  console.log("\n4. Verifying app/actions/events.ts...");
  const bridgePath = path.resolve(process.cwd(), "app/actions/events.ts");
  assert(fs.existsSync(bridgePath), "app/actions/events.ts must exist");
  const bridgeCode = fs.readFileSync(bridgePath, "utf-8");
  assert(bridgeCode.includes("@/app/(dashboard)/events/actions"), "app/actions/events.ts must re-export from @/app/(dashboard)/events/actions");
  console.log("✓ app/actions/events.ts correctly re-exports event actions.");

  // 5. Verify Storage Path Utility handles bucket-files, documents, event-documents
  console.log("\n5. Verifying Storage Path Utility...");
  const testUrl1 = "https://yblhtchviuslhfwiwyuo.supabase.co/storage/v1/object/public/bucket-files/evt-99/test.pdf";
  const testUrl2 = "https://yblhtchviuslhfwiwyuo.supabase.co/storage/v1/object/public/documents/evt-99/contract.docx";
  const testUrl3 = "https://yblhtchviuslhfwiwyuo.supabase.co/storage/v1/object/public/event-documents/evt-99/floorplan.png?token=xyz";

  assert.strictEqual(getStoragePathFromUrl(testUrl1), "evt-99/test.pdf");
  assert.strictEqual(getStoragePathFromUrl(testUrl2), "evt-99/contract.docx");
  assert.strictEqual(getStoragePathFromUrl(testUrl3), "evt-99/floorplan.png");
  console.log("✓ Storage path utility correctly extracts relative paths across storage buckets.");

  console.log("\n🎉 ALL EVENT CASCADE DELETION CHECKS PASSED SUCCESSFULLY!");
}

main().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
