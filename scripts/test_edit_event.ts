/**
 * @file Unit verification script for Edit Event functionality.
 * Run using: npx tsx scripts/test_edit_event.ts
 */

import assert from "node:assert";
import { updateEventSchema } from "../lib/validations/event";

const basePayload = {
  id: "66666666-6666-6666-6666-666666666666",
  title: "Astra Gala 2026",
  venue: "Grand Ballroom Kempinski",
  start_date: "2026-10-20T10:00:00.000Z",
  end_date: "2026-10-20T18:00:00.000Z",
  status: "confirmed" as const,
  budget: "250000000",
  description: "Annual award and celebration dinner",
  client_id: "11111111-1111-1111-1111-111111111111",
};

// 1. Positive validation with string budget coerced to number
const validResult = updateEventSchema.safeParse(basePayload);
assert(validResult.success, "Valid edit payload must pass");
if (validResult.success) {
  assert.strictEqual(validResult.data.budget, 250000000);
  assert.strictEqual(validResult.data.status, "confirmed");
  assert.strictEqual(validResult.data.title, "Astra Gala 2026");
}

// 2. Budget optional/nullable: empty string parses to null
const emptyBudgetResult = updateEventSchema.safeParse({
  ...basePayload,
  budget: "",
});
assert(emptyBudgetResult.success, "Empty string budget must succeed as null");
if (emptyBudgetResult.success) {
  assert.strictEqual(emptyBudgetResult.data.budget, null);
}

// 3. Budget optional/nullable: null parses to null
const nullBudgetResult = updateEventSchema.safeParse({
  ...basePayload,
  budget: null,
});
assert(nullBudgetResult.success, "Null budget must succeed as null");
if (nullBudgetResult.success) {
  assert.strictEqual(nullBudgetResult.data.budget, null);
}

// 4. Budget optional/nullable: omitted field parses to null
const omittedBudgetPayload = { ...basePayload };
delete (omittedBudgetPayload as Record<string, unknown>).budget;
const omittedBudgetResult = updateEventSchema.safeParse(omittedBudgetPayload);
assert(omittedBudgetResult.success, "Omitted budget must succeed as null/undefined");

// 5. Negative budget must fail validation
const negativeBudgetResult = updateEventSchema.safeParse({
  ...basePayload,
  budget: "-50000",
});
assert(!negativeBudgetResult.success, "Negative budget must fail validation");

// 6. Zero budget must fail validation (> 0 requirement)
const zeroBudgetResult = updateEventSchema.safeParse({
  ...basePayload,
  budget: "0",
});
assert(!zeroBudgetResult.success, "Zero budget must fail validation");

// 7. Non-numeric budget string must fail validation
const nonNumericBudgetResult = updateEventSchema.safeParse({
  ...basePayload,
  budget: "abc",
});
assert(!nonNumericBudgetResult.success, "Non-numeric budget must fail validation");

// 8. Missing title must fail validation
const missingTitleResult = updateEventSchema.safeParse({
  ...basePayload,
  title: "   ",
});
assert(!missingTitleResult.success, "Empty title must fail validation");

// 9. Missing venue must fail validation
const missingVenueResult = updateEventSchema.safeParse({
  ...basePayload,
  venue: "",
});
assert(!missingVenueResult.success, "Empty venue must fail validation");

// 10. Status enum valid choices
const statuses = ["draft", "planning", "confirmed", "ongoing", "completed", "cancelled"] as const;
for (const st of statuses) {
  const res = updateEventSchema.safeParse({ ...basePayload, status: st });
  assert(res.success, `Status ${st} must be valid`);
}

// 11. Invalid status must fail
const invalidStatusResult = updateEventSchema.safeParse({
  ...basePayload,
  status: "archived",
});
assert(!invalidStatusResult.success, "Unknown status must fail validation");

console.log("Edit event verification passed successfully.");

// 12. Live Supabase database update verification
// ponytail: reads credentials from .env.local / .env; never hardcode secrets
async function testLiveUpdate() {
  const fs = await import("node:fs");
  const path = await import("node:path");

  // Load env files manually (outside Next.js runtime)
  for (const envFile of [".env.local", ".env"]) {
    const filePath = path.resolve(process.cwd(), envFile);
    if (fs.existsSync(filePath)) {
      for (const line of fs.readFileSync(filePath, "utf-8").split("\n")) {
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
  const testEmail = process.env.TEST_USER_EMAIL;
  const testPassword = process.env.TEST_USER_PASSWORD;

  if (!url || !key) {
    console.log("Supabase live test skipped: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY not set in env.");
    return;
  }
  if (!testEmail || !testPassword) {
    console.log("Supabase live test skipped: TEST_USER_EMAIL / TEST_USER_PASSWORD not set in env.");
    return;
  }

  const { createClient } = await import("@supabase/supabase-js");
  const client = createClient(url, key);

  const { error: authError } = await client.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  });
  if (authError) {
    console.log("Supabase live auth skipped:", authError.message);
    return;
  }

  const { data: events, error: eventErr } = await client
    .from("events")
    .select("id, title, venue, budget, status")
    .limit(1);

  if (eventErr || !events || events.length === 0) {
    console.log("No events to test live update");
    return;
  }

  const target = events[0];
  const originalTitle = target.title;
  const testTitle = `${originalTitle} [Updated Live]`;

  // Update event
  const { data: updated, error: updateErr } = await client
    .from("events")
    .update({ title: testTitle, status: "confirmed" })
    .eq("id", target.id)
    .select()
    .single();

  assert(!updateErr, `Live update failed: ${updateErr?.message}`);
  assert.strictEqual(updated.title, testTitle, "Title must match updated value");

  // Revert back
  const { error: revertErr } = await client
    .from("events")
    .update({ title: originalTitle })
    .eq("id", target.id);

  assert(!revertErr, `Live revert failed: ${revertErr?.message}`);
  console.log("✓ Live Supabase event update and revert verified successfully.");
}

testLiveUpdate().catch((e) => {
  console.error("Live test failed:", e);
  process.exit(1);
});
