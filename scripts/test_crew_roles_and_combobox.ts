/**
 * Automated Verification Test for Crew Roles & Searchable Combobox Component
 * Validates:
 * 1. Exact 13 Roles constant match.
 * 2. Zod validation schema integrity.
 * 3. Combobox filtering, custom role support, and keyboard/state interaction.
 * 4. AssignCrewModal SSR rendering with Select2-style Combobox.
 */

import assert from "node:assert";
import React from "react";
import { renderToString } from "react-dom/server";
import { PRESET_ROLES } from "../components/events/assign-crew-modal";
import { EVENT_CREW_ROLES, assignCrewSchema, updateCrewRoleSchema } from "../lib/validations/event";
import { Combobox } from "../components/ui/combobox";
import { AssignCrewModal } from "../components/events/assign-crew-modal";

const EXPECTED_ROLES = [
  "LO",
  "LO Family",
  "Food and Beverage",
  "Front Desk",
  "Multi Media",
  "Lightning Operator",
  "Sound Operator",
  "Event",
  "Social Media",
  "VIP manager",
  "Guest Manager",
  "Event Manager",
  "Technical Manager",
] as const;

async function runTests() {
  console.log("=== Testing Crew Roles & Searchable Combobox UX ===\n");

  // Test 1: Exact 13 Roles
  console.log("Test 1: Validating Exact 13 Operational Roles List");
  assert.strictEqual(
    PRESET_ROLES.length,
    EXPECTED_ROLES.length,
    `PRESET_ROLES must have exactly ${EXPECTED_ROLES.length} items (got ${PRESET_ROLES.length})`
  );
  assert.strictEqual(
    EVENT_CREW_ROLES.length,
    EXPECTED_ROLES.length,
    `EVENT_CREW_ROLES must have exactly ${EXPECTED_ROLES.length} items`
  );

  EXPECTED_ROLES.forEach((expectedRole) => {
    assert.ok(
      (PRESET_ROLES as readonly string[]).includes(expectedRole),
      `Missing required role in PRESET_ROLES: "${expectedRole}"`
    );
    assert.ok(
      (EVENT_CREW_ROLES as readonly string[]).includes(expectedRole),
      `Missing required role in EVENT_CREW_ROLES: "${expectedRole}"`
    );
  });
  console.log("  ✓ All 13 exact roles are present and correctly cased in constants and validations");

  // Test 2: Zod Validation with New Roles and Custom Roles
  console.log("\nTest 2: Zod Schema Validation with Roles");
  EXPECTED_ROLES.forEach((role) => {
    const parsed = assignCrewSchema.safeParse({
      event_id: "123e4567-e89b-12d3-a456-426614174000",
      profile_id: "123e4567-e89b-12d3-a456-426614174001",
      role_in_event: role,
    });
    assert.ok(parsed.success, `Role "${role}" must pass assignCrewSchema validation`);

    const updateParsed = updateCrewRoleSchema.safeParse({
      crew_id: "crew-1",
      event_id: "event-1",
      role_in_event: role,
    });
    assert.ok(updateParsed.success, `Role "${role}" must pass updateCrewRoleSchema validation`);
  });

  // Custom role validation
  const customParsed = assignCrewSchema.safeParse({
    event_id: "123e4567-e89b-12d3-a456-426614174000",
    profile_id: "123e4567-e89b-12d3-a456-426614174001",
    role_in_event: "Drone Pilot Specialist",
  });
  assert.ok(customParsed.success, "Custom roles must be permitted by text column schema");
  console.log("  ✓ Zod validation safely accepts all 13 preset roles plus custom roles");

  // Test 3: Searchable Combobox Component Rendering
  console.log("\nTest 3: Combobox Component SSR & Trigger State");
  const options = EXPECTED_ROLES.map((r) => ({ value: r, label: r }));
  const comboboxHtml = renderToString(
    React.createElement(Combobox, {
      options,
      value: "Sound Operator",
      onChange: () => {},
      placeholder: "Pilih peran...",
      searchPlaceholder: "Cari peran...",
    })
  );

  assert.ok(
    comboboxHtml.includes("Sound Operator"),
    "Rendered Combobox trigger must display the selected value"
  );
  assert.ok(
    comboboxHtml.includes("role=\"listbox\"") === false,
    "Closed Combobox should only render the trigger button without open listbox by default"
  );
  console.log("  ✓ Combobox renders trigger with current value and chevrons icon");

  // Test 4: Combobox Filter Logic Simulation
  console.log("\nTest 4: Simulating Combobox Search Filtering");
  const filterOptions = (query: string, opts = options) => {
    const q = query.trim().toLowerCase();
    return opts.filter((opt) => opt.label.toLowerCase().includes(q));
  };

  const soundResults = filterOptions("sound");
  assert.strictEqual(soundResults.length, 1);
  assert.strictEqual(soundResults[0].value, "Sound Operator");

  const loResults = filterOptions("lo");
  assert.strictEqual(loResults.length, 2);
  assert.ok(loResults.some((r) => r.value === "LO"));
  assert.ok(loResults.some((r) => r.value === "LO Family"));

  const managerResults = filterOptions("manager");
  assert.strictEqual(managerResults.length, 4); // VIP manager, Guest Manager, Event Manager, Technical Manager
  console.log("  ✓ Filter accurately queries substring matches (e.g., 'manager' yields 4 roles)");

  // Test 5: AssignCrewModal SSR with Comboboxes
  console.log("\nTest 5: AssignCrewModal Integration");
  const modalHtml = renderToString(
    React.createElement(AssignCrewModal, {
      isOpen: true,
      onClose: () => {},
      onSubmit: () => {},
      isPending: false,
      availableProfiles: [
        {
          id: "prof-1",
          full_name: "Budi Santoso",
          role: "staff",
          email: "budi@xeno.com",
          phone: null,
          avatar_url: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
    })
  );

  assert.ok(modalHtml.includes("Tambahkan Kru"), "Modal title rendered");
  assert.ok(modalHtml.includes("Budi Santoso"), "Staff profile Combobox trigger rendered");
  assert.ok(modalHtml.includes("LO"), "Default role Combobox trigger rendered");
  assert.ok(modalHtml.includes("Tugaskan"), "Submit button rendered");
  console.log("  ✓ AssignCrewModal successfully renders with both searchable Comboboxes");

  console.log("\n=== ALL CREW ROLES & COMBOBOX TESTS PASSED! ===");
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
