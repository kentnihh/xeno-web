import * as fs from "node:fs";
import * as path from "node:path";
import assert from "node:assert";
import { createClient } from "@supabase/supabase-js";

console.log("=== Testing Drag-and-Drop Tab Reordering & Master Template Sync ===");

// 1. Verify Migration File
const migrationPath = path.resolve(
  process.cwd(),
  "supabase/migrations/20261017_add_sort_order_to_event_sheets_and_master_templates.sql"
);
assert(fs.existsSync(migrationPath), "Migration file must exist");
const migrationSql = fs.readFileSync(migrationPath, "utf-8");
assert(
  migrationSql.includes("ALTER TABLE public.event_sheets"),
  "Migration must alter event_sheets"
);
assert(
  migrationSql.includes("ALTER TABLE public.master_templates"),
  "Migration must alter master_templates"
);
assert(
  migrationSql.includes("sort_order INTEGER NOT NULL DEFAULT 0"),
  "Migration must add sort_order INTEGER NOT NULL DEFAULT 0"
);
console.log("✔ 1. Migration file verified.");

// 2. Verify Schema & Types
const schemaPath = path.resolve(process.cwd(), "supabase/schema.sql");
const schemaSql = fs.readFileSync(schemaPath, "utf-8").toLowerCase();
assert(
  schemaSql.includes("sort_order integer not null default 0"),
  "schema.sql must contain sort_order definition"
);

const typesPath = path.resolve(process.cwd(), "types/database.ts");
const typesContent = fs.readFileSync(typesPath, "utf-8");
assert(
  typesContent.includes("sort_order?: number;"),
  "types/database.ts must define sort_order?: number"
);
console.log("✔ 2. Schema and TypeScript interfaces verified.");

// 3. Verify Server Actions
const eventSheetActionsPath = path.resolve(
  process.cwd(),
  "app/(dashboard)/events/sheet-actions.ts"
);
const eventSheetActionsContent = fs.readFileSync(eventSheetActionsPath, "utf-8");
assert(
  eventSheetActionsContent.includes("export async function reorderEventSheets"),
  "sheet-actions.ts must export reorderEventSheets"
);
assert(
  eventSheetActionsContent.includes('.order("sort_order", { ascending: true })'),
  "getEventSheets must order by sort_order"
);
assert(
  eventSheetActionsContent.includes("sort_order: i"),
  "reorderEventSheets must update sort_order"
);

const masterTemplatesActionsPath = path.resolve(
  process.cwd(),
  "app/(dashboard)/settings/templates/actions.ts"
);
const masterTemplatesActionsContent = fs.readFileSync(
  masterTemplatesActionsPath,
  "utf-8"
);
assert(
  masterTemplatesActionsContent.includes("export async function reorderMasterTemplates"),
  "actions.ts must export reorderMasterTemplates"
);
assert(
  masterTemplatesActionsContent.includes('.order("sort_order", { ascending: true })'),
  "getMasterTemplates must order by sort_order"
);
assert(
  masterTemplatesActionsContent.includes("sort_order: i"),
  "reorderMasterTemplates must update sort_order"
);
console.log("✔ 3. Server Actions for reordering and fetching verified.");

// 4. Verify EventSpreadsheetTabs UI
const eventTabsPath = path.resolve(
  process.cwd(),
  "components/events/spreadsheet/event-spreadsheet-tabs.tsx"
);
const eventTabsContent = fs.readFileSync(eventTabsPath, "utf-8");
assert(
  eventTabsContent.includes("DragDropContext"),
  "event-spreadsheet-tabs.tsx must import DragDropContext"
);
assert(
  eventTabsContent.includes("Droppable"),
  "event-spreadsheet-tabs.tsx must import Droppable"
);
assert(
  eventTabsContent.includes("Draggable"),
  "event-spreadsheet-tabs.tsx must import Draggable"
);
assert(
  eventTabsContent.includes("handleDragEnd"),
  "event-spreadsheet-tabs.tsx must implement handleDragEnd"
);
assert(
  eventTabsContent.includes("reorderEventSheets"),
  "event-spreadsheet-tabs.tsx must call reorderEventSheets"
);
assert(
  eventTabsContent.includes("GripVertical"),
  "event-spreadsheet-tabs.tsx must include drag grip handle"
);
assert(
  eventTabsContent.includes("showGridLines"),
  "event-spreadsheet-tabs.tsx must include showGridLines toggle"
);
assert(
  eventTabsContent.includes("handleRefresh"),
  "event-spreadsheet-tabs.tsx must include handleRefresh"
);
console.log("✔ 4. Event Spreadsheet Tabs DnD implementation verified.");

// 5. Verify MasterTemplatesManager UI
const masterManagerPath = path.resolve(
  process.cwd(),
  "components/settings/master-templates-manager.tsx"
);
const masterManagerContent = fs.readFileSync(masterManagerPath, "utf-8");
assert(
  masterManagerContent.includes("DragDropContext"),
  "master-templates-manager.tsx must import DragDropContext"
);
assert(
  masterManagerContent.includes("Droppable"),
  "master-templates-manager.tsx must import Droppable"
);
assert(
  masterManagerContent.includes("Draggable"),
  "master-templates-manager.tsx must import Draggable"
);
assert(
  masterManagerContent.includes("handleDragEnd"),
  "master-templates-manager.tsx must implement handleDragEnd"
);
assert(
  masterManagerContent.includes("reorderMasterTemplates"),
  "master-templates-manager.tsx must call reorderMasterTemplates"
);
assert(
  masterManagerContent.includes("handleToggleGridlines"),
  "master-templates-manager.tsx must include handleToggleGridlines"
);
assert(
  masterManagerContent.includes("handleRefresh"),
  "master-templates-manager.tsx must include handleRefresh"
);
assert(
  masterManagerContent.includes("GripVertical"),
  "master-templates-manager.tsx must render GripVertical handle"
);
assert(
  masterManagerContent.includes("showGridLines={showGridLines}"),
  "master-templates-manager.tsx must pass showGridLines to DynamicSheetGrid"
);
assert(
  masterManagerContent.includes("_grid${showGridLines ? 1 : 0}"),
  "master-templates-manager.tsx key must include showGridLines state"
);
console.log("✔ 5. Master Templates Manager DnD and Toolbar Sync verified.");

// 6. Verify Database Live Connectivity & Columns
async function verifyLiveDb() {
  const envFiles = [".env.local", ".env"];
  for (const envFile of envFiles) {
    const filePath = path.resolve(process.cwd(), envFile);
    if (fs.existsSync(filePath)) {
      const lines = fs.readFileSync(filePath, "utf-8").split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const [key, ...values] = trimmed.split("=");
        if (key && !process.env[key.trim()]) {
          process.env[key.trim()] = values.join("=").trim();
        }
      }
    }
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.log("Skipping live DB check: Missing credentials.");
    return;
  }

  const client = createClient(url, key);
  const { error: err1 } = await client
    .from("event_sheets")
    .select("id, sheet_name, sort_order")
    .limit(1);
  assert(!err1, `event_sheets query failed: ${err1?.message}`);

  const { error: err2 } = await client
    .from("master_templates")
    .select("id, sheet_name, sort_order")
    .limit(1);
  assert(!err2, `master_templates query failed: ${err2?.message}`);

  console.log("✔ 6. Live Supabase database query verified: sort_order column is active!");
  console.log("\nALL VERIFICATION TESTS PASSED SUCCESSFULLY! 🚀");
}

verifyLiveDb().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
