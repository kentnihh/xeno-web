import assert from "assert";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { createAdminClient } from "../lib/supabase/admin";
import { getOrCreateEventPublicForm } from "../app/(dashboard)/events/public-form-actions";

async function main() {
  console.log("==================================================================");
  console.log("TEST SUITE: Public Form Upsert, RLS Policies, & Error Handling");
  console.log("==================================================================\n");

  // 1. Static Audit of public-form-actions.ts & EventDetailPage
  console.log("1. Auditing public-form-actions.ts error logging and upsert pattern...");
  const publicFormActionsPath = path.resolve(
    process.cwd(),
    "app/(dashboard)/events/public-form-actions.ts"
  );
  const actionsContent = fs.readFileSync(publicFormActionsPath, "utf-8");

  // Check that console.warn is used instead of console.error to prevent Next.js red server error overlay
  assert(
    actionsContent.includes('console.warn(') &&
    actionsContent.includes('[getOrCreateEventPublicForm] Insert notice:'),
    "Must use console.warn to log insert notices without triggering Turbopack red error overlay"
  );
  assert(
    actionsContent.includes("JSON.stringify"),
    "Must serialize error with JSON.stringify so it is not printed as an empty object {}"
  );
  assert(
    actionsContent.includes("createAdminClient"),
    "Must use createAdminClient for background system form initialization"
  );
  assert(
    actionsContent.includes("slug:") &&
    actionsContent.includes('title: "Formulir Data Keluarga"') &&
    actionsContent.includes("is_active: true"),
    "Must provide defaults for slug, title, and is_active"
  );
  assert(
    actionsContent.includes('.upsert(') &&
    actionsContent.includes('{ onConflict: "event_id" }'),
    "Must use upsert with onConflict: 'event_id'"
  );

  // Check EventDetailPage graceful guard
  const eventDetailPagePath = path.resolve(
    process.cwd(),
    "app/(dashboard)/events/[id]/page.tsx"
  );
  const eventDetailPageContent = fs.readFileSync(eventDetailPagePath, "utf-8");
  assert(
    eventDetailPageContent.includes("getOrCreateEventPublicForm(id)") &&
    (eventDetailPageContent.includes("catch") || eventDetailPageContent.includes("?? null")),
    "EventDetailPage must gracefully guard getOrCreateEventPublicForm so unhandled rejections never break page rendering"
  );
  console.log("   ✓ public-form-actions.ts and EventDetailPage correctly implement resilient defaults and error suppression.");

  // 2. Audit of supabase/schema.sql and migration policies
  console.log("\n2. Auditing supabase/schema.sql and migration policies...");
  const schemaPath = path.resolve(process.cwd(), "supabase/schema.sql");
  const schemaContent = fs.readFileSync(schemaPath, "utf-8");

  assert(
    schemaContent.includes('"Allow authenticated all event_public_forms"'),
    "schema.sql must define 'Allow authenticated all event_public_forms'"
  );
  assert(
    schemaContent.includes("is_active boolean") || schemaContent.includes("is_active"),
    "schema.sql must define is_active column"
  );
  assert(
    schemaContent.includes('event_public_forms_event_id_unique') ||
    schemaContent.includes('unique (event_id)'),
    "schema.sql must enforce unique (event_id) on event_public_forms"
  );

  const migrationPath = path.resolve(
    process.cwd(),
    "supabase/migrations/20261026_event_public_forms_rls_and_unique.sql"
  );
  assert(fs.existsSync(migrationPath), "Migration file 20261026_event_public_forms_rls_and_unique.sql must exist");
  console.log("   ✓ schema.sql and migration file contain required RLS policies and unique constraint.");

  // 3. Live Supabase Database Constraints and Policies Verification
  console.log("\n3. Verifying Live Database Constraints & RLS Policies in Supabase...");
  const admin = createAdminClient();

  // Check unique constraint on event_public_forms(event_id)
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (token) {
    const res = await fetch("https://api.supabase.com/v1/projects/yblhtchviuslhfwiwyuo/database/query", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        query: `
          SELECT conname FROM pg_constraint c
          JOIN pg_class t ON c.conrelid = t.oid
          WHERE t.relname = 'event_public_forms' AND c.conname = 'event_public_forms_event_id_unique';
        `
      })
    });
    const constraints = await res.json();
    assert(
      Array.isArray(constraints) && constraints.length > 0,
      "event_public_forms_event_id_unique constraint must exist in database"
    );
    console.log("   ✓ Live constraint 'event_public_forms_event_id_unique' confirmed in PostgreSQL.");

    const policyRes = await fetch("https://api.supabase.com/v1/projects/yblhtchviuslhfwiwyuo/database/query", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        query: `
          SELECT policyname FROM pg_policies
          WHERE tablename = 'event_public_forms' AND policyname LIKE 'Allow authenticated %';
        `
      })
    });
    const livePolicies = (await policyRes.json()) || [];
    const policyNames = livePolicies.map((p: any) => p.policyname);
    assert(policyNames.includes("Allow authenticated all event_public_forms") || policyNames.includes("Allow authenticated read event_public_forms"), "Read/All policy missing");
    console.log("   ✓ Live RLS policies confirmed:", policyNames.join(", "));
  } else {
    console.log("   (Skipped direct query, SUPABASE_ACCESS_TOKEN not present)");
  }

  // 4. End-to-End Live Creation & Resolution Test
  console.log("\n4. Live Database Verification: Authenticated client SELECT & UPSERT...");
  const { data: users } = await admin.auth.admin.listUsers();
  const testUser = users?.users?.find(u => u.email === "manager@xenoent.com") || users?.users?.[0];

  if (testUser && testUser.email) {
    const { data: linkData } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: testUser.email,
    });

    assert(linkData?.properties?.hashed_token, "Magic link hashed token must exist");

    const { createClient: createSupabaseClient } = await import("@supabase/supabase-js");
    const authedClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    await authedClient.auth.verifyOtp({
      token_hash: linkData.properties.hashed_token,
      type: "magiclink",
    });

    // Create a temporary event for authenticated test
    const { data: authEvent } = await admin
      .from("events")
      .insert({
        title: `Auth Test Event ${Date.now()}`,
        venue: "Skyline Ballroom",
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 3600000).toISOString(),
        pax: 80,
      })
      .select("id, title")
      .single();

    assert(authEvent, "Must create test event for auth test");

    try {
      // 1. Test Authenticated Select
      const { data: existingSelect, error: authedSelectErr } = await authedClient
        .from("event_public_forms")
        .select("*")
        .eq("event_id", authEvent.id)
        .maybeSingle();

      assert(!authedSelectErr, `Authenticated SELECT must not fail: ${authedSelectErr?.message}`);
      assert(existingSelect === null, "Initially should be null");

      // 2. Test Authenticated Upsert
      const { data: authedUpserted, error: authedUpsertErr } = await authedClient
        .from("event_public_forms")
        .upsert({
          event_id: authEvent.id,
          token: "auth_token_" + crypto.randomBytes(8).toString("hex"),
          expires_at: new Date(Date.now() + 86400000).toISOString(),
          form_schema: [],
          form_data: {},
          updated_at: new Date().toISOString(),
        }, { onConflict: "event_id" })
        .select()
        .single();

      assert(!authedUpsertErr, `Authenticated UPSERT must succeed: ${authedUpsertErr?.message}`);
      assert(authedUpserted && authedUpserted.event_id === authEvent.id, "Upserted form must match event_id");
      console.log(`   ✓ Authenticated client (${testUser.email}) successfully performed UPSERT on event_public_forms without error.`);
    } finally {
      await admin.from("events").delete().eq("id", authEvent.id);
    }
  }

  console.log("\n5. Live Database Verification: getOrCreateEventPublicForm idempotency & fallback recovery...");
  // Create a temporary event
  const tempEventTitle = `Test Form Event ${Date.now()}`;
  const { data: tempEvent, error: eventCreateErr } = await admin
    .from("events")
    .insert({
      title: tempEventTitle,
      venue: "Grand Ballroom",
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 3600000).toISOString(),
      pax: 100,
    })
    .select("id, title")
    .single();

  if (eventCreateErr || !tempEvent) {
    throw new Error(`Failed to create temporary event: ${eventCreateErr?.message}`);
  }

  try {
    console.log(`   Created temporary test event: "${tempEvent.title}" (${tempEvent.id})`);

    // Ensure no form exists initially
    await admin.from("event_public_forms").delete().eq("event_id", tempEvent.id);

    // Spy on console.error to ensure no error is logged to server console
    let consoleErrorCalled = false;
    const origError = console.error;
    console.error = (...args: any[]) => {
      consoleErrorCalled = true;
      origError(...args);
    };

    // Call getOrCreateEventPublicForm - First execution (creation)
    const form1 = await getOrCreateEventPublicForm(tempEvent.id);
    console.error = origError;

    assert(!consoleErrorCalled, "getOrCreateEventPublicForm must never trigger console.error so Turbopack error overlay is avoided");
    assert(form1 && form1.event_id === tempEvent.id, "Form 1 should be created for event");
    assert(typeof form1.token === "string" && form1.token.length >= 16, "Form 1 should have valid token");
    assert(form1.title === "Formulir Data Keluarga", "Form 1 should have default title");
    assert(form1.is_active === true, "Form 1 should be active by default");
    console.log(`   ✓ Successfully created public form with token: ${form1.token.substring(0, 8)}... (slug: ${form1.slug}, title: "${form1.title}")`);

    // Call getOrCreateEventPublicForm - Second execution (lookup/idempotent resolution)
    const form2 = await getOrCreateEventPublicForm(tempEvent.id);
    assert(form2 && form2.id === form1.id, "Form 2 must resolve to the identical existing record");
    assert(form2.token === form1.token, "Form 2 token must match Form 1 token");
    console.log("   ✓ Second call safely resolved existing form without duplicate creation.");

    // Concurrent execution test
    const [concurrent1, concurrent2] = await Promise.all([
      getOrCreateEventPublicForm(tempEvent.id),
      getOrCreateEventPublicForm(tempEvent.id),
    ]);
    assert(concurrent1 && concurrent2, "Concurrent calls must return valid form objects");
    assert(concurrent1.id === form1.id && concurrent2.id === form1.id, "Concurrent calls must both resolve to same form");
    console.log("   ✓ Concurrent calls successfully resolved without conflict or duplicate key errors.");
  } finally {
    // Cleanup temporary event (cascades to event_public_forms)
    await admin.from("events").delete().eq("id", tempEvent.id);
    console.log("   ✓ Cleaned up temporary test event.");
  }

  console.log("\n==================================================================");
  console.log("🎉 ALL PUBLIC FORM UPSERT & RLS TESTS PASSED SUCCESSFULLY! 🚀");
  console.log("==================================================================\n");
}

main().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
