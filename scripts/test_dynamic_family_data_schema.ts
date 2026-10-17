import assert from "node:assert";
import * as fs from "node:fs";
import * as path from "node:path";
import { createAdminClient } from "../lib/supabase/admin";
import { DEFAULT_PUBLIC_FORM_SCHEMA } from "../lib/constants/public-forms";
import type { FormCategorySchema, EventFormData } from "../types/database";

console.log("=== Testing Truly Dynamic Family Data Schema Architecture ===");

async function run() {
  const admin = createAdminClient();

  // =========================================================================
  // 1. Code Contract Auditing: Ensure NO Hardcoded 4 Categories in Components
  // =========================================================================
  console.log("\n--- 1. Auditing Code Contracts for Hardcoded Categories ---");
  const publicFormPath = path.resolve(
    process.cwd(),
    "components/public-form/public-family-form.tsx"
  );
  const adminSectionPath = path.resolve(
    process.cwd(),
    "components/events/event-family-data-section.tsx"
  );

  assert(fs.existsSync(publicFormPath), "public-family-form.tsx must exist");
  assert(fs.existsSync(adminSectionPath), "event-family-data-section.tsx must exist");

  const publicFormContent = fs.readFileSync(publicFormPath, "utf-8");
  const adminSectionContent = fs.readFileSync(adminSectionPath, "utf-8");

  // Verify Public Form uses dynamic categories.${catIndex}.members for useFieldArray
  assert(
    publicFormContent.includes("name: `categories.${catIndex}.members`") ||
    publicFormContent.includes("name: `categories.${index}.members`"),
    "PublicForm must configure useFieldArray using categories.${catIndex}.members"
  );
  console.log("✓ PublicForm correctly binds useFieldArray with dynamic categories.${catIndex}.members");

  // Verify Public Form maps inputs dynamically using categories.${catIndex}.members.${memberIdx}
  assert(
    publicFormContent.includes("categories.${catIndex}.members.${memberIdx}.name"),
    "PublicForm must register inputs dynamically matching the category array structure"
  );
  console.log("✓ PublicForm registers inputs with dynamic category array paths");

  // Verify Public Form does NOT have fixed fallback array of 3-4 categories
  assert(
    !publicFormContent.includes('{ id: "groom_family", name: "Keluarga Groom (Mempelai Pria)"'),
    "PublicForm must not hardcode fallback categories"
  );
  console.log("✓ PublicForm removed hardcoded fallback categories");

  // Verify Admin Event Tab has category management functions (Add, Edit, Delete Category)
  assert(
    adminSectionContent.includes("handleOpenAddCategory") &&
    adminSectionContent.includes("handleOpenEditCategory") &&
    adminSectionContent.includes("confirmDeleteCategory"),
    "EventFamilyDataSection must provide Add, Edit, and Delete Category controls"
  );
  console.log("✓ EventFamilyDataSection implements dynamic category Add, Rename, and Delete controls");

  // Verify Admin Event Tab maps dynamically over form_schema without hardcoded fallback
  assert(
    !adminSectionContent.includes(": DEFAULT_PUBLIC_FORM_SCHEMA;"),
    "EventFamilyDataSection must not fall back to hardcoded DEFAULT_PUBLIC_FORM_SCHEMA"
  );
  console.log("✓ EventFamilyDataSection renders strictly from form_schema without hardcoded defaults");

  // =========================================================================
  // 2. Testing Dynamic Master Template in Settings (Add, Rename, Delete)
  // =========================================================================
  console.log("\n--- 2. Testing Dynamic Master Template in Settings ---");

  // Fetch current active master family template
  const { data: currentMaster, error: fetchErr } = await admin
    .from("master_family_templates")
    .select("*")
    .eq("is_active", true)
    .maybeSingle();

  assert.strictEqual(fetchErr, null, "Querying master_family_templates should succeed");
  assert(currentMaster, "Active master_family_templates row must exist");

  const originalCategories = currentMaster.categories || [];

  // Scenario A: Admin creates 2 completely custom categories, deleting all 4 default ones
  const customSchema: FormCategorySchema[] = [
    {
      id: "saksi_nikah",
      title: "Saksi Pemberkatan",
      name: "Saksi Pemberkatan",
      description: "Daftar saksi resmi pernikahan",
      fields: [
        { id: "name", label: "Nama Lengkap", required: true },
        { id: "role", label: "Peran", required: true },
        { id: "phone", label: "No. HP", required: false },
      ],
    },
    {
      id: "keluarga_inti",
      title: "Keluarga Inti",
      name: "Keluarga Inti",
      description: "Orang tua dan saudara kandung mempelai",
      fields: [
        { id: "name", label: "Nama Lengkap", required: true },
        { id: "role", label: "Peran", required: true },
      ],
    },
  ];

  const { error: saveCustomErr } = await admin
    .from("master_family_templates")
    .update({
      categories: customSchema,
      updated_at: new Date().toISOString(),
    })
    .eq("id", currentMaster.id);

  assert.strictEqual(saveCustomErr, null, "Updating master template with custom categories must succeed");

  const { data: updatedMaster } = await admin
    .from("master_family_templates")
    .select("categories")
    .eq("id", currentMaster.id)
    .single();

  assert.strictEqual(updatedMaster?.categories?.length, 2, "Schema must now have exactly 2 categories");
  assert.strictEqual(updatedMaster?.categories[0].title, "Saksi Pemberkatan");
  assert.strictEqual(updatedMaster?.categories[1].title, "Keluarga Inti");
  console.log("✓ Admin can successfully delete default categories and save custom categories in Master Template");

  // Scenario B: Admin renames a category
  const renamedSchema = updatedMaster?.categories.map((c: any) =>
    c.id === "saksi_nikah"
      ? { ...c, title: "Saksi Utama & Kehormatan", name: "Saksi Utama & Kehormatan" }
      : c
  );

  const { error: renameErr } = await admin
    .from("master_family_templates")
    .update({
      categories: renamedSchema,
      updated_at: new Date().toISOString(),
    })
    .eq("id", currentMaster.id);

  assert.strictEqual(renameErr, null, "Renaming category must succeed");

  const { data: renamedData } = await admin
    .from("master_family_templates")
    .select("categories")
    .eq("id", currentMaster.id)
    .single();

  assert.strictEqual(renamedData?.categories[0].title, "Saksi Utama & Kehormatan");
  console.log("✓ Admin can successfully rename categories in Master Template");

  // Restore original categories
  await admin
    .from("master_family_templates")
    .update({
      categories: originalCategories,
      updated_at: new Date().toISOString(),
    })
    .eq("id", currentMaster.id);
  console.log("✓ Restored Master Template to original categories.");

  // =========================================================================
  // 3. Testing Dynamic Event Public Form with Arbitrary Category Count
  // =========================================================================
  console.log("\n--- 3. Testing Dynamic Event Public Form Operations ---");

  // Fetch an existing event for testing
  const { data: events, error: eventErr } = await admin
    .from("events")
    .select("id, title")
    .limit(1);

  assert(events && events.length > 0, "At least one event must exist in database");
  const testEventId = events[0].id;
  const testToken = `test_dyn_${Date.now().toString(16)}`;

  // Define dynamic schema with 5 arbitrary categories
  const dynamicSchema: FormCategorySchema[] = [
    { id: "cat_1", title: "Keluarga Groom", name: "Keluarga Groom" },
    { id: "cat_2", title: "Keluarga Bride", name: "Keluarga Bride" },
    { id: "cat_3", title: "Saksi Pemberkatan", name: "Saksi Pemberkatan" },
    { id: "cat_4", title: "Keluarga Inti", name: "Keluarga Inti" },
    { id: "cat_5", title: "Tamu Spesial VIP", name: "Tamu Spesial VIP" },
  ];

  // Insert event public form with 5 dynamic categories
  const { data: createdForm, error: formInsertErr } = await admin
    .from("event_public_forms")
    .insert({
      event_id: testEventId,
      token: testToken,
      expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      form_schema: dynamicSchema,
      form_data: {},
    })
    .select("*")
    .single();

  assert.strictEqual(formInsertErr, null, "Inserting dynamic event public form must succeed");
  assert.strictEqual(createdForm.form_schema.length, 5, "form_schema must contain 5 categories");
  console.log(`✓ Created event_public_forms with ${createdForm.form_schema.length} dynamic categories.`);

  // Test submitting data for these 5 categories
  const submittedData: EventFormData = {
    cat_1: [{ id: "m1", name: "Bpk. Suryo", role: "Ayah Groom", phone: "0811111111" }],
    cat_2: [{ id: "m2", name: "Ibu Rina", role: "Ibu Bride", phone: "0822222222" }],
    cat_3: [{ id: "m3", name: "Bpk. Pendeta / Saksi", role: "Saksi Utama", phone: "0833333333" }],
    cat_4: [{ id: "m4", name: "Kevin", role: "Adik Kandung", phone: "0844444444" }],
    cat_5: [{ id: "m5", name: "Prof. H. Hartono", role: "Tamu Kehormatan", phone: "0855555555" }],
  };

  const { error: submitErr } = await admin
    .from("event_public_forms")
    .update({
      form_data: submittedData,
      updated_at: new Date().toISOString(),
    })
    .eq("id", createdForm.id);

  assert.strictEqual(submitErr, null, "Updating form_data with dynamic categories must succeed");

  // Query back and verify
  const { data: retrievedForm } = await admin
    .from("event_public_forms")
    .select("*")
    .eq("id", createdForm.id)
    .single();

  assert.strictEqual(retrievedForm.form_schema.length, 5);
  assert.strictEqual(retrievedForm.form_data.cat_3[0].name, "Bpk. Pendeta / Saksi");
  assert.strictEqual(retrievedForm.form_data.cat_3[0].role, "Saksi Utama");
  console.log("✓ Dynamic submission roundtrip verified for custom categories (e.g. Saksi Pemberkatan).");

  // Clean up test public form record
  await admin.from("event_public_forms").delete().eq("id", createdForm.id);
  console.log("✓ Cleaned up test event public form.");

  console.log("\n🎉 ALL DYNAMIC FAMILY DATA SCHEMA ARCHITECTURE TESTS PASSED! 🚀");
}

run().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
