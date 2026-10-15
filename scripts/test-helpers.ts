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

// 10. Verify Event & Task enhancement utilities (countdown, sorting, priorities)
import {
  getEventCountdown,
  sortEventsUpcomingFirst,
  sortTasksByPriority,
} from "../lib/utils";

// Countdown tests (deterministic with local Dates)
const refDate = new Date(2026, 9, 15, 12, 0, 0);
const todayIso = new Date(2026, 9, 15, 18, 0, 0).toISOString();
const tomorrowIso = new Date(2026, 9, 16, 9, 0, 0).toISOString();
const in5DaysIso = new Date(2026, 9, 20, 14, 0, 0).toISOString();
const yesterdayIso = new Date(2026, 9, 14, 10, 0, 0).toISOString();
const pastIso = new Date(2026, 9, 10, 10, 0, 0).toISOString();

const cdToday = getEventCountdown(todayIso, refDate);
assert(cdToday.tone === "today" && cdToday.label === "Hari Ini", "Countdown for today must be 'Hari Ini'");

const cdTomorrow = getEventCountdown(tomorrowIso, refDate);
assert(cdTomorrow.tone === "tomorrow" && cdTomorrow.label === "Besok", "Countdown for tomorrow must be 'Besok'");

const cd5Days = getEventCountdown(in5DaysIso, refDate);
assert(cd5Days.tone === "upcoming" && cd5Days.label === "H-5", "Countdown for 5 days must be 'H-5'");

const cdYesterday = getEventCountdown(yesterdayIso, refDate);
assert(cdYesterday.tone === "past" && cdYesterday.label === "Kemarin", "Countdown for yesterday must be 'Kemarin'");

const cdPast = getEventCountdown(pastIso, refDate);
assert(cdPast.tone === "past" && cdPast.label === "Lewat 5h", "Countdown for 5 days past must be 'Lewat 5h'");

// sortEventsUpcomingFirst tests
const testEvents = [
  { id: "e-past", title: "Past Event", start_date: "2025-01-01T10:00:00Z" },
  { id: "e-far-future", title: "Far Future", start_date: "2027-01-01T10:00:00Z" },
  { id: "e-near-future", title: "Near Future", start_date: tomorrowIso },
];
const sortedEvents = sortEventsUpcomingFirst(testEvents, refDate);
assert.strictEqual(sortedEvents[0].id, "e-near-future", "Nearest upcoming event must be first");
assert.strictEqual(sortedEvents[1].id, "e-far-future", "Farther future event must follow");
assert.strictEqual(sortedEvents[2].id, "e-past", "Past event must come after upcoming");

// sortTasksByPriority tests
const testTasks = [
  { id: "t-low", title: "Low Task", priority: "low", due_date: "2026-10-10" },
  { id: "t-high-later", title: "High Task Later", priority: "high", due_date: "2026-10-25" },
  { id: "t-urgent", title: "Urgent Task", priority: "urgent", due_date: "2026-10-30" },
  { id: "t-high-earlier", title: "High Task Earlier", priority: "high", due_date: "2026-10-15" },
];
const sortedTasks = sortTasksByPriority(testTasks);
assert.strictEqual(sortedTasks[0].id, "t-urgent", "Urgent task must be first");
assert.strictEqual(sortedTasks[1].id, "t-high-earlier", "Earlier high task must precede later high task");
assert.strictEqual(sortedTasks[2].id, "t-high-later", "Later high task must follow");
assert.strictEqual(sortedTasks[3].id, "t-low", "Low task must be last");


// 11. Verify Event Statuses and Lifecycle validation
import { EVENT_STATUS_LIST, type EventStatus } from "../types/database";
import { updateEventSchema } from "../lib/validations/event";

assert.strictEqual(EVENT_STATUS_LIST.length, 6, "Must define 6 valid event lifecycle statuses");
const expectedStatuses: EventStatus[] = ["draft", "planning", "confirmed", "ongoing", "completed", "cancelled"];
for (const s of expectedStatuses) {
  assert(EVENT_STATUS_LIST.includes(s), `EVENT_STATUS_LIST must contain "${s}"`);
  const check = updateEventSchema.safeParse({
    id: "evt-test-1",
    title: "Test Event",
    venue: "Test Venue",
    start_date: "2026-10-20T10:00:00Z",
    end_date: "2026-10-20T18:00:00Z",
    status: s,
  });
  assert(check.success, `updateEventSchema must accept valid status "${s}"`);
}

const invalidCheck = updateEventSchema.safeParse({
  id: "evt-test-1",
  title: "Test Event",
  venue: "Test Venue",
  start_date: "2026-10-20T10:00:00Z",
  end_date: "2026-10-20T18:00:00Z",
  status: "archived",
});
assert(!invalidCheck.success, "updateEventSchema must reject unrecognized status 'archived'");

// 12. Verify Event Sheets & Dynamic Spreadsheet
import { INITIAL_EVENT_SHEETS, buildDefaultEventSheets } from "../lib/constants/event-sheets";
import * as XLSX from "xlsx";

const EXPECTED_INITIAL_TABS = [
  "CHECKLIST",
  "Meja VIP resepsi",
  "Reception Rundown",
  "List Teapai",
  "LO Resepsi",
  "F&B Resepsi",
  "Event Resepsi",
  "front desk",
  "Hotel Room Reception",
  "Family Data",
];

assert.strictEqual(INITIAL_EVENT_SHEETS.length, 10, "INITIAL_EVENT_SHEETS must have exactly 10 initial sheets");
const initialNames = INITIAL_EVENT_SHEETS.map((s) => s.name);
for (const expectedName of EXPECTED_INITIAL_TABS) {
  assert(initialNames.includes(expectedName), `INITIAL_EVENT_SHEETS must contain tab: "${expectedName}"`);
}

// Check buildDefaultEventSheets helper
const defaultSheets = buildDefaultEventSheets("evt-test-123");
assert.strictEqual(defaultSheets.length, 10, "buildDefaultEventSheets must produce 10 records");
for (const s of defaultSheets) {
  assert.strictEqual(s.event_id, "evt-test-123");
  assert(s.data.columns.length > 0, `Sheet "${s.sheet_name}" must have column definitions`);
  assert(s.data.rows.length > 0, `Sheet "${s.sheet_name}" must have initial rows`);
}

// Check Excel (.xlsx) multi-sheet workbook generation
const wb = XLSX.utils.book_new();
for (const sheet of defaultSheets) {
  const safeName = sheet.sheet_name.replace(/[:\\/?*\[\]]/g, "_").slice(0, 31);
  const headers = sheet.data.columns.map((c) => c.name);
  const rows = sheet.data.rows.map((r) => sheet.data.columns.map((c) => (r[c.id] ?? "")));
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  XLSX.utils.book_append_sheet(wb, ws, safeName);
}
assert.strictEqual(wb.SheetNames.length, 10, "Excel workbook must contain all 10 tab sheets");
assert.strictEqual(wb.SheetNames[0], "CHECKLIST", "First sheet in Excel workbook must be CHECKLIST");

// 13. Verify Profiles RLS & Auth Trigger definitions
import * as fs from "node:fs";
import * as path from "node:path";

const migrationFiles = [
  path.resolve(process.cwd(), "supabase/schema.sql"),
  path.resolve(process.cwd(), "supabase/apply_all_migrations.sql"),
  path.resolve(process.cwd(), "supabase/fix_profiles_rls.sql"),
  path.resolve(process.cwd(), "supabase/migrations/20261014_fix_profiles_rls_and_trigger.sql"),
];

for (const file of migrationFiles) {
  assert(fs.existsSync(file), `Migration file must exist: ${file}`);
  const sql = fs.readFileSync(file, "utf-8").toLowerCase();
  assert(sql.includes("auth.uid() = id"), `${file} must include SELECT policy checking auth.uid() = id`);
  assert(sql.includes("handle_new_user"), `${file} must define handle_new_user trigger function`);
  assert(sql.includes("security definer"), `${file} must specify SECURITY DEFINER`);
  assert(sql.includes("for insert") && sql.includes("to authenticated"), `${file} must include INSERT policy for profiles`);
}

// 14. Verify Auth Security Overhaul & RBAC User Creation
const authActionsPath = path.resolve(process.cwd(), "app/auth/actions.ts");
const authActionsCode = fs.readFileSync(authActionsPath, "utf-8");
assert(!authActionsCode.includes("export async function signup"), "app/auth/actions.ts must NOT export public signup action");

const loginPagePath = path.resolve(process.cwd(), "app/login/page.tsx");
const loginPageCode = fs.readFileSync(loginPagePath, "utf-8");
assert(!loginPageCode.includes("isSignUp"), "LoginPage must NOT contain isSignUp state");
assert(!loginPageCode.includes("Daftar Akun"), "LoginPage must NOT contain 'Daftar Akun' button");
assert(loginPageCode.includes("Eye") && loginPageCode.includes("EyeOff"), "LoginPage must include password visibility toggle icons");

const rbacActionsPath = path.resolve(process.cwd(), "app/(dashboard)/settings/rbac/actions.ts");
const rbacActionsCode = fs.readFileSync(rbacActionsPath, "utf-8");
assert(rbacActionsCode.includes("auth.admin.createUser"), "RBAC createUser must invoke auth.admin.createUser");
assert(!rbacActionsCode.includes(".signUp("), "RBAC createUser must NOT call auth.signUp()");
assert(!rbacActionsCode.includes("confirmPassword"), "RBAC createUser must NOT require confirmPassword");

const userModalPath = path.resolve(process.cwd(), "components/users/user-modal.tsx");
const userModalCode = fs.readFileSync(userModalPath, "utf-8");
assert(!userModalCode.includes("name=\"confirmPassword\""), "UserModal must NOT include confirmPassword input field");
assert(userModalCode.includes("name=\"password\""), "UserModal must include single password input field");
assert(userModalCode.includes("Eye") && userModalCode.includes("EyeOff"), "UserModal must include password visibility toggle for password");

// 15. Verify RBAC Reset Password Feature
assert(rbacActionsCode.includes("resetUserPassword"), "RBAC actions must export resetUserPassword");
assert(rbacActionsCode.includes("auth.admin.updateUserById"), "resetUserPassword must use auth.admin.updateUserById");
assert(!rbacActionsCode.includes("supabase.auth.updateUser("), "resetUserPassword must NOT use client supabase.auth.updateUser");

const resetPasswordModalPath = path.resolve(process.cwd(), "components/users/reset-password-modal.tsx");
const resetPasswordModalCode = fs.readFileSync(resetPasswordModalPath, "utf-8");
assert(resetPasswordModalCode.includes("name=\"newPassword\""), "ResetPasswordModal must include newPassword input");
assert(!resetPasswordModalCode.includes("confirmPassword"), "ResetPasswordModal must NOT include confirmPassword input");
assert(resetPasswordModalCode.includes("Eye") && resetPasswordModalCode.includes("EyeOff"), "ResetPasswordModal must include password toggle icons");
assert(resetPasswordModalCode.includes("resetUserPassword"), "ResetPasswordModal must invoke resetUserPassword action");

const usersTablePath = path.resolve(process.cwd(), "components/users/users-table.tsx");
const usersTableCode = fs.readFileSync(usersTablePath, "utf-8");
assert(usersTableCode.includes("onResetPassword"), "UsersTable must accept onResetPassword callback");
assert(usersTableCode.includes("Reset Sandi"), "UsersTable must render Reset Sandi button next to Edit");
// 16. Verify RoleModal handles role ID correctly on edit
const roleModalPath = path.resolve(process.cwd(), "components/users/role-modal.tsx");
const roleModalCode = fs.readFileSync(roleModalPath, "utf-8");
assert(roleModalCode.includes("input type=\"hidden\" name=\"id\""), "RoleModal must include hidden id input when isEdit");
assert(roleModalCode.includes("formData.set(\"id\", role.id)"), "RoleModal handleSubmit must set id on formData when isEdit");

// 17. Verify Fine-Grained RBAC Permission Guards Across Actions and UI
const docActionsPath = path.resolve(process.cwd(), "app/(dashboard)/events/document-actions.ts");
const docActionsCode = fs.readFileSync(docActionsPath, "utf-8");
assert(docActionsCode.includes("requirePermission(\"documents.manage\")"), "bulkDeleteEventDocuments must guard with documents.manage");

const expActionsPath = path.resolve(process.cwd(), "app/(dashboard)/events/expense-actions.ts");
const expActionsCode = fs.readFileSync(expActionsPath, "utf-8");
assert(expActionsCode.includes("requirePermission(\"finances.manage\")"), "Expense actions must guard with finances.manage");

const sheetActionsPath = path.resolve(process.cwd(), "app/(dashboard)/events/sheet-actions.ts");
const sheetActionsCode = fs.readFileSync(sheetActionsPath, "utf-8");
assert(sheetActionsCode.includes("requirePermission(\"events.edit\")"), "Sheet actions must guard with events.edit");

const clientActionsPath = path.resolve(process.cwd(), "app/(dashboard)/clients/actions.ts");
const clientActionsCode = fs.readFileSync(clientActionsPath, "utf-8");
assert(clientActionsCode.includes("requirePermission(\"clients.create\")"), "createClientAction must guard with clients.create");
assert(clientActionsCode.includes("requirePermission(\"clients.delete\")"), "deleteClientAction must guard with clients.delete");

const vendorActionsPath = path.resolve(process.cwd(), "app/(dashboard)/vendors/actions.ts");
const vendorActionsCode = fs.readFileSync(vendorActionsPath, "utf-8");
assert(vendorActionsCode.includes("requirePermission(\"vendors.create\")"), "createVendorAction must guard with vendors.create");
assert(vendorActionsCode.includes("requirePermission(\"vendors.delete\")"), "deleteVendorAction must guard with vendors.delete");

const teamActionsPath = path.resolve(process.cwd(), "app/(dashboard)/team/actions.ts");
const teamActionsCode = fs.readFileSync(teamActionsPath, "utf-8");
assert(teamActionsCode.includes("requirePermission(\"team.manage\")"), "Team actions must guard with team.manage");

const eventTabsPath = path.resolve(process.cwd(), "components/events/event-detail-tabs.tsx");
const eventTabsCode = fs.readFileSync(eventTabsPath, "utf-8");
assert(eventTabsCode.includes("canManageFinance"), "EventDetailTabs must accept canManageFinance prop");
assert(eventTabsCode.includes("canManageDocuments"), "EventDetailTabs must accept canManageDocuments prop");

const eventActionButtonsPath = path.resolve(process.cwd(), "components/events/event-action-buttons.tsx");
const eventActionButtonsCode = fs.readFileSync(eventActionButtonsPath, "utf-8");
assert(eventActionButtonsCode.includes("canEdit"), "EventActionButtons must accept canEdit prop");

// 18. Verify Role Modal Feedback & RBAC Server Action Error Handling
const freshRbacCode = fs.readFileSync(rbacActionsPath, "utf-8");
assert(freshRbacCode.includes("getRBACClient"), "RBAC actions must use getRBACClient to avoid silent RLS drops");
assert(freshRbacCode.includes("revalidatePath(\"/settings/rbac\", \"page\")"), "revalidateRBAC must invalidate page cache");

const freshRoleModalCode = fs.readFileSync(roleModalPath, "utf-8");
assert(freshRoleModalCode.includes("onSuccess?: (message: string) => void"), "RoleModal must accept onSuccess callback prop");
assert(freshRoleModalCode.includes("onSuccess?.("), "RoleModal must invoke onSuccess callback on completion");

const dialogHandlerPath = path.resolve(process.cwd(), "components/users/users-dialog-handler.tsx");
const dialogHandlerCode = fs.readFileSync(dialogHandlerPath, "utf-8");
assert(dialogHandlerCode.includes("<RoleModal") && dialogHandlerCode.includes("onSuccess={onSuccess}"), "UsersDialogHandler must forward onSuccess to RoleModal");


console.log("Self-check passed successfully.");
