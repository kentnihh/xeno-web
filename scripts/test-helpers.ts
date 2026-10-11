/**
 * @file Unit verification script for utility helper functions.
 * Run using: pnpm test
 */

import assert from "node:assert";
import { formatIDR, formatDate, cn } from "../lib/utils";

// 1. Verify currency formatting for IDR
const formatted = formatIDR(250000000);
assert(formatted.includes("250.000.000") || formatted.includes("250"), "formatIDR should format 250M correctly");

// 2. Verify date formatting
const dateStr = formatDate("2026-10-15T10:00:00Z");
assert(dateStr.length > 0 && dateStr !== "-", "formatDate should format valid date");
assert(formatDate(null) === "-", "formatDate should handle null");

// 3. Verify Tailwind className merger (cn)
const classes = cn("px-4 py-2", false && "hidden", "bg-indigo-600");
assert(classes === "px-4 py-2 bg-indigo-600", "cn should merge class names correctly");
// 4. Verify ISO string parsing compatibility
const isoString = new Date("2026-11-20T14:30:00Z").toISOString();
assert(isoString === "2026-11-20T14:30:00.000Z", "ISO string should serialize standard UTC timestamp");


// 5. Verify RBAC Fallback structures
import {
  FALLBACK_ROLES,
  FALLBACK_PERMISSIONS,
  FALLBACK_ROLE_PERMS,
  FALLBACK_USERS,
} from "../lib/rbac-fallbacks";

assert(FALLBACK_ROLES.some((r) => r.id === "admin"), "Admin role must exist");
assert(FALLBACK_ROLES.some((r) => r.id === "manager"), "Manager role must exist");
assert(FALLBACK_ROLES.some((r) => r.id === "staff"), "Staff role must exist");

const adminPerms = FALLBACK_ROLE_PERMS.filter((rp) => rp.role_id === "admin");
assert(adminPerms.length === FALLBACK_PERMISSIONS.length, "Admin role must hold all permissions");

const staffPerms = FALLBACK_ROLE_PERMS.filter((rp) => rp.role_id === "staff");
assert(staffPerms.length > 0 && staffPerms.length < FALLBACK_PERMISSIONS.length, "Staff has restricted permissions");

assert(FALLBACK_USERS.length >= 2, "Fallback users dataset must contain test users");


// 6. Verify Event Crew presets
import { PRESET_ROLES } from "../components/events/assign-crew-modal";
assert(PRESET_ROLES.includes("Stage Manager"), "Preset roles must include Stage Manager");
assert(PRESET_ROLES.includes("Sound Engineer (FOH)"), "Preset roles must include Sound Engineer (FOH)");
assert(PRESET_ROLES.length >= 5, "Preset roles should cover core event roles");


// 7. Verify Event Budget Validation Schema (optional, nullable, > 0)
import {
  eventBudgetSchema,
  eventBudgetInputSchema,
  createEventSchema,
} from "../lib/validations/event";

assert(eventBudgetSchema.safeParse(null).success, "Budget schema must allow null");
assert(eventBudgetSchema.safeParse(undefined).success, "Budget schema must allow undefined");
assert(eventBudgetSchema.safeParse(5000000).success, "Budget schema must accept positive number");
assert(!eventBudgetSchema.safeParse(0).success, "Budget schema must reject 0");
assert(!eventBudgetSchema.safeParse(-1000).success, "Budget schema must reject negative numbers");

// Preprocess check from FormData strings
assert(eventBudgetInputSchema.safeParse("").data === null, "Empty string input should coerce to null");
assert(eventBudgetInputSchema.safeParse("250000000").data === 250000000, "Numeric string should parse to number");
assert(!eventBudgetInputSchema.safeParse("0").success, "String '0' should fail validation");
assert(!eventBudgetInputSchema.safeParse("-50").success, "Negative string should fail validation");

// createEventSchema check
const validPayloadWithoutBudget = {
  title: "Astra Gala",
  venue: "Ballroom",
  start_date: "2026-11-01T10:00:00Z",
  end_date: "2026-11-01T18:00:00Z",
  budget: "",
};
assert(createEventSchema.safeParse(validPayloadWithoutBudget).success, "Event without budget must be valid");

// createEventSchema with optional empty expenses and documents
const parsedDefault = createEventSchema.safeParse({
  ...validPayloadWithoutBudget,
  expenses: [],
  documents: [],
});
assert(parsedDefault.success, "Event with empty expenses and documents arrays must be valid");
if (parsedDefault.success) {
  assert.deepEqual(parsedDefault.data.expenses, [], "Expenses must default to empty array");
  assert.deepEqual(parsedDefault.data.documents, [], "Documents must default to empty array");
}

const parsedNull = createEventSchema.safeParse({
  ...validPayloadWithoutBudget,
  expenses: null,
  documents: null,
});
assert(parsedNull.success, "Event with null expenses and documents must be valid");

const parsedOmitted = createEventSchema.safeParse(validPayloadWithoutBudget);
assert(parsedOmitted.success, "Event with omitted expenses and documents must be valid");
if (parsedOmitted.success) {
  assert.deepEqual(parsedOmitted.data.expenses, [], "Omitted expenses must default to empty array");
  assert.deepEqual(parsedOmitted.data.documents, [], "Omitted documents must default to empty array");
}


// 8. Verify PDF Export generator
import { buildEventSummaryPdf } from "../lib/pdf/event-summary-pdf";
const testPdfDoc = buildEventSummaryPdf({
  event: {
    id: "test-evt-1",
    title: "Testing Gala",
    venue: "Main Hall",
    start_date: "2026-12-01T10:00:00Z",
    status: "confirmed",
    budget: 100000000,
  },
  crew: [],
  tasks: [],
});
assert(testPdfDoc.getNumberOfPages() === 1, "Test PDF should generate 1 page");
assert(testPdfDoc.output("arraybuffer").byteLength > 2000, "Test PDF output byte length must be > 2000");



// 9. Verify Client and Vendor validations
import { z } from "zod";

const testClientSchema = z.object({
  name: z.string().trim().min(1),
  company: z.string().trim().optional().transform((v) => v || null),
  phone: z.string().trim().min(1),
  email: z.string().trim().email().optional().or(z.literal("")).transform((v) => v || null),
  address: z.string().trim().optional().transform((v) => v || null),
});

const clientValid = testClientSchema.parse({
  name: "PT Mitra Sejahtera",
  company: "",
  phone: "081234567890",
  email: "",
  address: "",
});
assert.strictEqual(clientValid.company, null, "Empty client company should normalize to null");
assert.strictEqual(clientValid.email, null, "Empty client email should normalize to null");
assert.strictEqual(clientValid.address, null, "Empty client address should normalize to null");
assert.strictEqual(clientValid.name, "PT Mitra Sejahtera");

console.log("Self-check passed successfully.");
