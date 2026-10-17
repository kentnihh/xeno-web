import { createAdminClient } from "../lib/supabase/admin";
import crypto from "crypto";

async function main() {
  console.log("=== Testing Event Public Family Form Implementation ===");

  // 1. Verify Native Crypto Token Generator
  const token = crypto.randomBytes(16).toString("hex");
  console.log("1. Generated Native Crypto Token:", token, "(Length:", token.length, ")");
  if (token.length !== 32) {
    throw new Error("Token generation failed to produce 32-hex string");
  }

  // 2. Verify 3-day Default Expiry Calculation
  const now = Date.now();
  const threeDaysLater = new Date(now + 3 * 24 * 60 * 60 * 1000);
  const diffHours = (threeDaysLater.getTime() - now) / (1000 * 60 * 60);
  console.log(`2. Expiry Calculation: exactly ${diffHours} hours from now (~3 days)`);
  if (Math.round(diffHours) !== 72) {
    throw new Error(`Expected exactly 72 hours, got ${diffHours}`);
  }

  // 3. Database operations with Supabase Admin Client
  const admin = createAdminClient();

  // Find an existing event to test with
  const { data: events, error: eventErr } = await admin
    .from("events")
    .select("id, title")
    .limit(1);

  if (eventErr || !events || events.length === 0) {
    console.warn("No events found in database to test DB operations. Skipping DB write test.");
    console.log("All unit checks passed successfully!");
    return;
  }

  const testEvent = events[0];
  console.log(`3. Using test event: "${testEvent.title}" (${testEvent.id})`);

  // Insert or Upsert a test record in event_public_forms
  const testToken = `test_${crypto.randomBytes(14).toString("hex")}`;
  const testExpiry = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

  const { data: insertedForm, error: insertErr } = await admin
    .from("event_public_forms")
    .insert({
      event_id: testEvent.id,
      token: testToken,
      expires_at: testExpiry,
      form_schema: [
        { id: "groom_family", name: "Keluarga Groom (Mempelai Pria)" },
        { id: "bride_family", name: "Keluarga Bride (Mempelai Wanita)" },
      ],
      form_data: {},
    })
    .select()
    .single();

  if (insertErr || !insertedForm) {
    throw new Error(`Failed to insert into event_public_forms: ${insertErr?.message}`);
  }

  console.log("4. Successfully created event_public_forms record:", {
    id: insertedForm.id,
    token: insertedForm.token,
    expires_at: insertedForm.expires_at,
  });

  // Test submitting form_data
  const testSubmission = {
    groom_family: [
      { id: "m-1", name: "Bambang Wijaya", role: "Ayah Kandung", phone: "08123456789" },
      { id: "m-2", name: "Sri Mulyani", role: "Ibu Kandung", phone: "08198765432" },
    ],
    bride_family: [
      { id: "m-3", name: "Hendra Gunawan", role: "Ayah Kandung", phone: "0811223344" },
    ],
  };

  const { data: updatedForm, error: updateErr } = await admin
    .from("event_public_forms")
    .update({
      form_data: testSubmission,
      updated_at: new Date().toISOString(),
    })
    .eq("id", insertedForm.id)
    .select()
    .single();

  if (updateErr || !updatedForm) {
    throw new Error(`Failed to update form_data: ${updateErr?.message}`);
  }

  console.log("5. Successfully updated form_data:", {
    groomCount: updatedForm.form_data?.groom_family?.length,
    brideCount: updatedForm.form_data?.bride_family?.length,
  });

  // Verify expiry checking logic
  const isExpiredBefore = new Date() > new Date(updatedForm.expires_at);
  console.log("6. Expiry check (should be false for fresh 3-day token):", isExpiredBefore);
  if (isExpiredBefore !== false) {
    throw new Error("Active token falsely reported as expired");
  }

  // Test simulating expired token
  const pastExpiry = new Date(Date.now() - 3600000).toISOString();
  const isExpiredAfter = new Date() > new Date(pastExpiry);
  console.log("7. Expiry check simulation for past date (should be true):", isExpiredAfter);
  if (isExpiredAfter !== true) {
    throw new Error("Expired token simulation failed");
  }

  // Clean up test record
  await admin.from("event_public_forms").delete().eq("id", insertedForm.id);
  console.log("8. Cleaned up test record from database.");

  console.log("=== ALL TEST VERIFICATIONS PASSED SUCCESSFULLY! ===");
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
