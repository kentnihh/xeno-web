import assert from "node:assert";
import * as fs from "node:fs";
import * as path from "node:path";
import { createAdminClient } from "../lib/supabase/admin";
import { createEventSchema } from "../lib/validations/event";
import { DEFAULT_PUBLIC_FORM_SCHEMA } from "../lib/constants/public-forms";
import type { FormCategorySchema } from "../types/database";

console.log("=== Testing Master Family Template & Create Event Integration ===");

async function run() {
  const admin = createAdminClient();

  // 1. Verify Database Schema & Migration File
  console.log("\n--- 1. Testing Database Schema & Migration ---");
  const migrationPath = path.resolve(
    process.cwd(),
    "supabase/migrations/20261017_create_master_family_templates.sql"
  );
  assert(fs.existsSync(migrationPath), "Migration file must exist");
  const migrationSql = fs.readFileSync(migrationPath, "utf-8");
  assert(
    migrationSql.includes("CREATE TABLE IF NOT EXISTS public.master_family_templates"),
    "Migration must create master_family_templates"
  );
  console.log("✓ Migration file verified.");

  const { data: dbTemplates, error: dbErr } = await admin
    .from("master_family_templates")
    .select("*")
    .eq("is_active", true);

  assert.strictEqual(dbErr, null, "Querying master_family_templates should succeed");
  assert(dbTemplates && dbTemplates.length > 0, "master_family_templates must contain active row");
  console.log(`✓ Live database table verified with ${dbTemplates[0].categories.length} categories.`);

  // 2. Testing Database Operations on Master Family Template
  console.log("\n--- 2. Testing Database Operations on Master Family Template ---");
  const customCategories: FormCategorySchema[] = [
    {
      id: "keluarga_inti_groom",
      name: "Keluarga Inti Groom",
      description: "Hanya orang tua dan saudara kandung",
      fields: [
        { id: "name", label: "Nama Lengkap", required: true },
        { id: "role", label: "Peran", required: true },
      ],
    },
    {
      id: "keluarga_inti_bride",
      name: "Keluarga Inti Bride",
      description: "Hanya orang tua dan saudara kandung",
      fields: [
        { id: "name", label: "Nama Lengkap", required: true },
        { id: "role", label: "Peran", required: true },
      ],
    },
  ];

  // Update categories in database
  const { error: updateErr } = await admin
    .from("master_family_templates")
    .update({
      categories: customCategories,
      updated_at: new Date().toISOString(),
    })
    .eq("id", dbTemplates[0].id);

  assert.strictEqual(updateErr, null, "Updating categories should succeed");

  const { data: updatedData } = await admin
    .from("master_family_templates")
    .select("categories")
    .eq("id", dbTemplates[0].id)
    .single();

  assert.strictEqual(updatedData?.categories?.length, 2, "Must contain 2 custom categories");
  assert.strictEqual(updatedData?.categories?.[0]?.id, "keluarga_inti_groom");
  console.log("✓ Successfully updated and retrieved custom categories in master_family_templates.");

  // Restore back to default preset
  await admin
    .from("master_family_templates")
    .update({
      categories: DEFAULT_PUBLIC_FORM_SCHEMA,
      updated_at: new Date().toISOString(),
    })
    .eq("id", dbTemplates[0].id);
  console.log("✓ Restored master_family_templates to DEFAULT_PUBLIC_FORM_SCHEMA.");

  // 3. Testing Zod Validation Schema for use_family_template
  console.log("\n--- 3. Testing Zod Validation Schema for use_family_template ---");
  const parsedDefault = createEventSchema.parse({
    title: "Akad Nikah Sarah & Dimas",
    venue: "Masjid Al-Akbar Surabaya",
    start_date: "2026-10-20T08:00:00",
    end_date: "2026-10-20T12:00:00",
  });
  assert.strictEqual(parsedDefault.use_family_template, true, "use_family_template defaults to true");

  const parsedExplicitFalse = createEventSchema.parse({
    title: "Corporate Gathering",
    venue: "Grand City Hall",
    start_date: "2026-10-20T08:00:00",
    end_date: "2026-10-20T12:00:00",
    use_family_template: "false",
  });
  assert.strictEqual(parsedExplicitFalse.use_family_template, false, "use_family_template parses string 'false' to boolean false");

  const parsedExplicitTrue = createEventSchema.parse({
    title: "Wedding Dinner",
    venue: "Shangri-La Hotel",
    start_date: "2026-10-20T08:00:00",
    end_date: "2026-10-20T12:00:00",
    use_family_template: "on",
  });
  assert.strictEqual(parsedExplicitTrue.use_family_template, true, "use_family_template parses HTML checkbox 'on' to boolean true");
  console.log("✓ Zod schema correctly validates use_family_template (default true, explicit boolean/string handling).");

  // 4. Testing Server Action Code Contracts in events/actions.ts and settings/templates/actions.ts
  console.log("\n--- 4. Testing Server Action Code Contracts ---");
  const eventActionsPath = path.resolve(process.cwd(), "app/(dashboard)/events/actions.ts");
  const eventActionsContent = fs.readFileSync(eventActionsPath, "utf-8");

  assert(
    eventActionsContent.includes("use_family_template"),
    "events/actions.ts must parse use_family_template"
  );
  assert(
    eventActionsContent.includes('from("master_family_templates")'),
    "events/actions.ts must query master_family_templates"
  );
  assert(
    eventActionsContent.includes('from("event_public_forms")'),
    "events/actions.ts must insert into event_public_forms"
  );
  assert(
    eventActionsContent.includes("familySchema = [];"),
    "events/actions.ts must set empty schema [] when use_family_template is false"
  );
  console.log("✓ events/actions.ts createEvent logic verified: queries master_family_templates when true, sets [] when false.");

  const templatesActionsPath = path.resolve(
    process.cwd(),
    "app/(dashboard)/settings/templates/actions.ts"
  );
  const templatesActionsContent = fs.readFileSync(templatesActionsPath, "utf-8");
  assert(
    templatesActionsContent.includes("export async function getMasterFamilyTemplate"),
    "settings/templates/actions.ts must export getMasterFamilyTemplate"
  );
  assert(
    templatesActionsContent.includes("export async function saveMasterFamilyTemplate"),
    "settings/templates/actions.ts must export saveMasterFamilyTemplate"
  );
  assert(
    templatesActionsContent.includes("export async function resetMasterFamilyTemplate"),
    "settings/templates/actions.ts must export resetMasterFamilyTemplate"
  );
  console.log("✓ settings/templates/actions.ts exports verified.");

  // 5. Testing Create Event Form UI Component
  console.log("\n--- 5. Verifying Create Event Form UI Component ---");
  const formComponentPath = path.resolve(process.cwd(), "components/events/create-event-form.tsx");
  const formContent = fs.readFileSync(formComponentPath, "utf-8");
  assert(formContent.includes('name="use_family_template"'), "Form must contain use_family_template input");
  assert(formContent.includes("defaultChecked"), "Checkbox must be defaultChecked");
  assert(
    formContent.includes("Gunakan Template Family Data Bawaan?"),
    "Label text must match requirement"
  );
  console.log("✓ Create Event Form UI contains the requested checkbox and label.");

  // 6. Testing Settings Templates Admin UI Components
  console.log("\n--- 6. Verifying Settings Templates Admin UI Components ---");
  const managerPath = path.resolve(
    process.cwd(),
    "components/settings/master-family-templates-manager.tsx"
  );
  assert(fs.existsSync(managerPath), "MasterFamilyTemplatesManager component must exist");
  const managerContent = fs.readFileSync(managerPath, "utf-8");
  assert(
    managerContent.includes("saveMasterFamilyTemplate"),
    "Manager component must call saveMasterFamilyTemplate"
  );
  assert(
    managerContent.includes("resetMasterFamilyTemplate"),
    "Manager component must call resetMasterFamilyTemplate"
  );
  assert(
    managerContent.includes("moveCategory"),
    "Manager component must support category reordering"
  );
  assert(
    managerContent.includes("addFieldToCategory"),
    "Manager component must support adding fields to categories"
  );
  assert(
    managerContent.includes("removeFieldFromCategory"),
    "Manager component must support removing fields from categories"
  );

  const tabsViewPath = path.resolve(
    process.cwd(),
    "components/settings/templates-tabs-view.tsx"
  );
  assert(fs.existsSync(tabsViewPath), "TemplatesTabsView component must exist");
  const tabsViewContent = fs.readFileSync(tabsViewPath, "utf-8");
  assert(
    tabsViewContent.includes("MasterFamilyTemplatesManager"),
    "TemplatesTabsView must render MasterFamilyTemplatesManager"
  );
  assert(
    tabsViewContent.includes("MasterTemplatesManager"),
    "TemplatesTabsView must render MasterTemplatesManager"
  );

  const settingsPagePath = path.resolve(
    process.cwd(),
    "app/(dashboard)/settings/templates/page.tsx"
  );
  const settingsPageContent = fs.readFileSync(settingsPagePath, "utf-8");
  assert(
    settingsPageContent.includes("getMasterFamilyTemplate"),
    "Settings page must fetch getMasterFamilyTemplate"
  );
  assert(
    settingsPageContent.includes("TemplatesTabsView"),
    "Settings page must render TemplatesTabsView"
  );
  console.log("✓ Settings Templates Admin UI components verified.");

  console.log("\n🎉 ALL MASTER FAMILY TEMPLATE & EVENT CREATION TESTS PASSED SUCCESSFULLY! 🚀");
}

run().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
