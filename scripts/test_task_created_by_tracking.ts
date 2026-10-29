import assert from "node:assert";
import * as fs from "node:fs";
import * as path from "node:path";
import { createClient } from "@supabase/supabase-js";

console.log("==================================================================");
console.log("TEST SUITE: Crew Task 'created_by' Tracking (DB, Actions, UI)");
console.log("==================================================================");

// 1. Auditing Database Schema & Migration files
console.log("\n1. Auditing Database Schema & Migration Files...");
const schemaPath = path.resolve(process.cwd(), "supabase/schema.sql");
const schemaSql = fs.readFileSync(schemaPath, "utf-8");

assert(
  schemaSql.includes("created_by uuid references public.profiles(id) on delete set null"),
  "supabase/schema.sql must define created_by column in event_tasks"
);
assert(
  schemaSql.includes("alter table public.event_tasks add column if not exists created_by"),
  "supabase/schema.sql must have idempotent alter table for created_by"
);
assert(
  schemaSql.includes("idx_event_tasks_created_by"),
  "supabase/schema.sql must define index on event_tasks(created_by)"
);
console.log("   ✓ schema.sql verified with created_by column, alter table, and index.");

const migrationsDir = path.resolve(process.cwd(), "supabase/migrations");
const migrationFiles = fs.readdirSync(migrationsDir);
const taskMigration = migrationFiles.find((f) => f.includes("add_created_by_to_event_tasks"));
assert(taskMigration, "Migration file for add_created_by_to_event_tasks must exist");

const migrationContent = fs.readFileSync(path.join(migrationsDir, taskMigration), "utf-8");
assert(
  migrationContent.includes("ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id)"),
  "Migration must include ADD COLUMN IF NOT EXISTS created_by"
);
assert(
  migrationContent.includes("CREATE INDEX IF NOT EXISTS idx_event_tasks_created_by"),
  "Migration must include index creation"
);
console.log(`   ✓ Migration verified: ${taskMigration}`);

// 2. Auditing TypeScript Types
console.log("\n2. Auditing TypeScript Types in types/database.ts...");
const typesPath = path.resolve(process.cwd(), "types/database.ts");
const typesCode = fs.readFileSync(typesPath, "utf-8");

assert(
  typesCode.includes("created_by?: string | null;"),
  "EventTask interface must include created_by field"
);
assert(
  typesCode.includes("creator?: Profile | null;"),
  "EventTask interface must include creator profile relation"
);
console.log("   ✓ EventTask interface verified in types/database.ts.");

// 3. Auditing Server Actions in app/(dashboard)/events/actions.ts
console.log("\n3. Auditing Server Actions in app/(dashboard)/events/actions.ts...");
const actionsPath = path.resolve(process.cwd(), "app/(dashboard)/events/actions.ts");
const actionsCode = fs.readFileSync(actionsPath, "utf-8");

assert(
  actionsCode.includes("getCurrentProfile") && actionsCode.includes("getCurrentUser"),
  "events/actions.ts must import getCurrentProfile and getCurrentUser"
);
assert(
  actionsCode.includes("created_by: createdBy"),
  "createEventTask must insert created_by column"
);
assert(
  actionsCode.includes("creator:profiles!created_by(*)"),
  "createEventTask and updateEventTask must disambiguate creator profile relation"
);
assert(
  actionsCode.includes("assignee:profiles!assigned_to(*)"),
  "createEventTask and updateEventTask must disambiguate assignee profile relation"
);
console.log("   ✓ Server action createEventTask and updateEventTask verified.");

// 4. Auditing UI Components
console.log("\n4. Auditing UI Components...");

// 4a. Event detail tasks section
const tasksSectionPath = path.resolve(process.cwd(), "components/events/event-tasks-section.tsx");
const tasksSectionCode = fs.readFileSync(tasksSectionPath, "utf-8");
assert(
  tasksSectionCode.includes("task.creator?.full_name"),
  "EventTasksSection must check task.creator?.full_name"
);
assert(
  tasksSectionCode.includes("Dibuat oleh:"),
  "EventTasksSection must display 'Dibuat oleh:' label"
);
console.log("   ✓ EventTasksSection displays 'Dibuat oleh:' with creator name.");

// 4b. Task modal
const taskModalPath = path.resolve(process.cwd(), "components/events/task-modal.tsx");
const taskModalCode = fs.readFileSync(taskModalPath, "utf-8");
assert(
  taskModalCode.includes("task?.creator?.full_name"),
  "TaskModal must check task?.creator?.full_name"
);
assert(
  taskModalCode.includes("Dibuat oleh:"),
  "TaskModal must display 'Dibuat oleh:' in editing mode"
);
console.log("   ✓ TaskModal displays creator information during edit.");

// 4c. Dashboard Priority Tasks widget
const dashboardWidgetPath = path.resolve(process.cwd(), "components/dashboard/priority-tasks-widget.tsx");
const dashboardWidgetCode = fs.readFileSync(dashboardWidgetPath, "utf-8");
assert(
  dashboardWidgetCode.includes("creator?: { id?: string; full_name: string; role?: string } | null;"),
  "ConsolidatedTask interface must include creator profile"
);
assert(
  dashboardWidgetCode.includes("task.creator?.full_name"),
  "PriorityTasksWidget must render task.creator?.full_name"
);
assert(
  dashboardWidgetCode.includes("Dibuat oleh:") || dashboardWidgetCode.includes("Dibuat:"),
  "PriorityTasksWidget must render creator indicator"
);
console.log("   ✓ PriorityTasksWidget displays creator information.");

// 4d. Dashboard and Event detail queries
const dashboardPagePath = path.resolve(process.cwd(), "app/(dashboard)/dashboard/page.tsx");
const dashboardPageCode = fs.readFileSync(dashboardPagePath, "utf-8");
assert(
  dashboardPageCode.includes("creator:profiles!created_by(id, full_name, role)"),
  "Dashboard tasksQuery must select creator relation"
);
assert(
  dashboardPageCode.includes("assignee:profiles!assigned_to(id, full_name, role)"),
  "Dashboard tasksQuery must select assignee relation with disambiguation"
);

const eventDetailPagePath = path.resolve(process.cwd(), "app/(dashboard)/events/[id]/page.tsx");
const eventDetailPageCode = fs.readFileSync(eventDetailPagePath, "utf-8");
assert(
  eventDetailPageCode.includes("creator:profiles!created_by(*)"),
  "Event detail page must query creator relation"
);
assert(
  eventDetailPageCode.includes("assignee:profiles!assigned_to(*)"),
  "Event detail page must query assignee relation with disambiguation"
);
console.log("   ✓ Dashboard and Event detail pages query disambiguated creator and assignee relations.");

// 5. Live Database Integration Test
console.log("\n5. Running Live Database Integration Test...");
async function runLiveDbTest() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.log("   (Supabase credentials missing from env, skipping live network call)");
    return;
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  // Pick an existing profile for creator
  const { data: profiles, error: profError } = await supabase
    .from("profiles")
    .select("id, full_name")
    .limit(1);

  assert(!profError && profiles && profiles.length > 0, "Must have at least one profile in DB");
  const creatorProfile = profiles[0];

  // Create temporary test event
  const { data: testEvent, error: eventErr } = await supabase
    .from("events")
    .insert({
      title: "Test Created By Event " + Date.now(),
      venue: "Jakarta Test Arena",
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 3600000).toISOString(),
    })
    .select("id")
    .single();

  assert(!eventErr && testEvent, "Failed to create test event: " + eventErr?.message);

  try {
    // Insert a task with created_by set to creatorProfile.id
    const { data: insertedTask, error: taskErr } = await supabase
      .from("event_tasks")
      .insert({
        event_id: testEvent.id,
        title: "Test Operational Task with Created By",
        description: "Checking creator attribution",
        priority: "high",
        status: "todo",
        created_by: creatorProfile.id,
        assigned_to: creatorProfile.id,
      })
      .select("*, assignee:profiles!assigned_to(*), creator:profiles!created_by(*)")
      .single();

    assert(!taskErr && insertedTask, "Failed to insert task with created_by: " + taskErr?.message);
    assert.strictEqual(insertedTask.created_by, creatorProfile.id, "created_by must match creator ID");
    assert.strictEqual(insertedTask.creator?.id, creatorProfile.id, "creator profile relation must be hydrated");
    assert.strictEqual(insertedTask.creator?.full_name, creatorProfile.full_name, "creator full_name must match");
    assert.strictEqual(insertedTask.assignee?.id, creatorProfile.id, "assignee profile relation must be hydrated");
    console.log(`   ✓ Task successfully inserted with created_by=${insertedTask.created_by}`);
    console.log(`   ✓ Creator profile resolved: "${insertedTask.creator?.full_name}"`);
    console.log(`   ✓ Assignee profile resolved: "${insertedTask.assignee?.full_name}"`);

    // Test query as executed in dashboard page
    const { data: dashboardTask, error: dashErr } = await supabase
      .from("event_tasks")
      .select("*, event:events(id, title), assignee:profiles!assigned_to(id, full_name, role), creator:profiles!created_by(id, full_name, role)")
      .eq("id", insertedTask.id)
      .single();

    assert(!dashErr && dashboardTask, "Dashboard task query failed: " + dashErr?.message);
    assert.strictEqual(dashboardTask.creator?.id, creatorProfile.id, "Dashboard query resolves creator correctly");
    console.log("   ✓ Dashboard task query resolves creator relation cleanly.");

  } finally {
    // Cleanup temporary event (cascades to event_tasks)
    await supabase.from("events").delete().eq("id", testEvent.id);
    console.log("   ✓ Cleaned up temporary test event and tasks.");
  }
}

runLiveDbTest()
  .then(() => {
    console.log("\n==================================================================");
    console.log("🎉 ALL CREW TASK 'created_by' TRACKING TESTS PASSED! 🚀");
    console.log("==================================================================");
  })
  .catch((err) => {
    console.error("\n❌ Test failed with error:", err);
    process.exit(1);
  });
