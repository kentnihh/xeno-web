import assert from "node:assert";
import { createClient } from "@supabase/supabase-js";
import * as fs from "node:fs";
import * as path from "node:path";
import { INITIAL_EVENT_SHEETS } from "../lib/constants/event-sheets";

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

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
assert(url, "URL required");
assert(key, "KEY required");

const supabase = createClient(url, key);

async function runTests() {
  console.log("1. Authenticating as admin...");
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: "admin@xenoent.com",
    password: "Password123!",
  });
  assert(!authError, `Auth failed: ${authError?.message}`);
  console.log("   ✓ Authenticated:", authData.user?.email);

  console.log("2. Verifying master_templates table...");
  const { data: templates, error: tplErr } = await supabase
    .from("master_templates")
    .select("id, sheet_name, order_index, jsonb_structure")
    .order("order_index", { ascending: true });

  assert(!tplErr, `Query master_templates failed: ${tplErr?.message}`);
  assert(templates && templates.length >= 10, `Expected at least 10 master templates, got ${templates?.length}`);
  console.log(`   ✓ Found ${templates.length} master templates in database.`);

  console.log("3. Verifying event_sheets upsert & dynamic save...");
  const { data: events } = await supabase.from("events").select("id").limit(1);
  assert(events && events.length > 0, "No events available for test");
  const testEventId = events[0].id;

  const testPayload = {
    columns: [
      { id: "col_1", name: "No" },
      { id: "col_2", name: "Nama Item Test" },
    ],
    rows: [{ id: "r_1", col_1: "1", col_2: "Pengetesan Dinamis" }],
  };

  const { error: upsertErr } = await supabase
    .from("event_sheets")
    .upsert(
      {
        event_id: testEventId,
        sheet_name: "TEST_SHEET_AUTOMATION",
        order_index: 99,
        data: testPayload,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "event_id,sheet_name" }
    );

  assert(!upsertErr, `Upsert into event_sheets failed: ${upsertErr?.message}`);
  console.log("   ✓ Upsert into event_sheets succeeded.");

  const { data: readSheet, error: readErr } = await supabase
    .from("event_sheets")
    .select("*")
    .eq("event_id", testEventId)
    .eq("sheet_name", "TEST_SHEET_AUTOMATION")
    .single();

  assert(!readErr, `Read sheet failed: ${readErr?.message}`);
  assert.strictEqual(readSheet.sheet_name, "TEST_SHEET_AUTOMATION");
  assert.strictEqual(readSheet.data.rows[0].col_2, "Pengetesan Dinamis");
  console.log("   ✓ Read-back validated: JSONB preserved correctly.");

  // Cleanup test sheet
  await supabase
    .from("event_sheets")
    .delete()
    .eq("event_id", testEventId)
    .eq("sheet_name", "TEST_SHEET_AUTOMATION");
  console.log("   ✓ Test sheet cleaned up.");

  console.log("4. Verifying RBAC actions re-export compatibility...");
  const rbacActions = await import("../app/(dashboard)/settings/rbac/actions");
  const usersActions = await import("../app/(dashboard)/users/actions");
  assert(typeof rbacActions.createUser === "function", "createUser must exist in settings/rbac/actions");
  assert(typeof usersActions.createUser === "function", "createUser must be re-exported from users/actions");
  console.log("   ✓ RBAC actions exported and backward-compatible.");

  console.log("ALL VERIFICATION CHECKS PASSED SUCCESSFULLY!");
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
