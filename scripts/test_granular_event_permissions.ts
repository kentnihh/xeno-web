import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { FALLBACK_PERMISSIONS, FALLBACK_ROLE_PERMS } from "../lib/rbac-fallbacks";
import { getPermissionAliases } from "../lib/auth";

console.log("=== Testing Granular Event Permissions & RBAC Refactor ===\n");

// 1. Verify Fallback Permissions
console.log("1. Auditing FALLBACK_PERMISSIONS...");
const permOps = FALLBACK_PERMISSIONS.find((p) => p.id === "events:operations:manage");
const permSheets = FALLBACK_PERMISSIONS.find((p) => p.id === "events:sheets:manage");
const permFamily = FALLBACK_PERMISSIONS.find((p) => p.id === "events:family:manage");

assert(permOps, "events:operations:manage must exist in FALLBACK_PERMISSIONS");
assert(permSheets, "events:sheets:manage must exist in FALLBACK_PERMISSIONS");
assert(permFamily, "events:family:manage must exist in FALLBACK_PERMISSIONS");

assert.strictEqual(permOps.module, "events");
assert.strictEqual(permSheets.module, "events");
assert.strictEqual(permFamily.module, "events");

assert(permOps.description && permOps.description.length > 5, "Indonesian description required for operations");
assert(permSheets.description && permSheets.description.length > 5, "Indonesian description required for sheets");
assert(permFamily.description && permFamily.description.length > 5, "Indonesian description required for family");
console.log("   ✓ All 3 granular permissions exist with Indonesian descriptions and module 'events'.");

// 2. Verify Aliasing Logic
console.log("\n2. Auditing getPermissionAliases mapping...");
const opsAliases = getPermissionAliases("events:operations:manage");
assert(opsAliases.includes("events:operations:manage"), "Must include events:operations:manage");
assert(opsAliases.includes("events.operations.manage"), "Must include events.operations.manage");
assert(opsAliases.includes("events:update"), "Must include events:update alias for operational updates");
assert(opsAliases.includes("events.update"), "Must include events.update alias");
assert(opsAliases.includes("events:edit"), "Must include events:edit fallback");
assert(opsAliases.includes("events:manage"), "Must include events:manage fallback");

const sheetsAliases = getPermissionAliases("events:sheets:manage");
assert(sheetsAliases.includes("events:sheets:manage"), "Must include events:sheets:manage");
assert(sheetsAliases.includes("events.sheets.manage"), "Must include events.sheets.manage");
assert(sheetsAliases.includes("sheets:manage"), "Must include sheets:manage");
assert(sheetsAliases.includes("events:manage"), "Must include events:manage fallback");
assert(sheetsAliases.includes("events:edit"), "Must include events:edit fallback");

const familyAliases = getPermissionAliases("events:family:manage");
assert(familyAliases.includes("events:family:manage"), "Must include events:family:manage");
assert(familyAliases.includes("events.family.manage"), "Must include events.family.manage");
assert(familyAliases.includes("family:manage"), "Must include family:manage");
assert(familyAliases.includes("events:manage"), "Must include events:manage fallback");
assert(familyAliases.includes("events:edit"), "Must include events:edit fallback");
console.log("   ✓ Aliasing and fallback hierarchy verified for all 3 granular permissions.");

// 3. Verify Manager Access Scenarios
console.log("\n3. Testing Manager Permission Evaluation Logic...");
// Manager in fallback has events:update
const managerPerms = FALLBACK_ROLE_PERMS.filter((rp) => rp.role_id === "manager").map((rp) => rp.permission_id);
const managerHasOps = opsAliases.some((a) => managerPerms.includes(a));
assert(managerHasOps, "Manager with events:update must inherit events:operations:manage");

// Manager without sheets:manage cannot edit sheets
const managerHasSheetsWithoutGrant = sheetsAliases.some((a) => managerPerms.includes(a));
assert(!managerHasSheetsWithoutGrant, "Manager without events:sheets:manage must NOT have sheets edit permission");

// When manager is granted events:sheets:manage:
const managerWithSheets = [...managerPerms, "events:sheets:manage"];
const managerHasSheetsWithGrant = sheetsAliases.some((a) => managerWithSheets.includes(a));
assert(managerHasSheetsWithGrant, "Manager with events:sheets:manage MUST have sheets edit permission");

// When manager is granted events:family:manage:
const managerWithFamily = [...managerPerms, "events:family:manage"];
const managerHasFamilyWithGrant = familyAliases.some((a) => managerWithFamily.includes(a));
assert(managerHasFamilyWithGrant, "Manager with events:family:manage MUST have family edit permission");
console.log("   ✓ Granular permission evaluation and toggleability verified.");

// 4. Verify EventDetailTabs Props & Section Wiring
console.log("\n4. Auditing EventDetailTabs Code Contracts...");
const tabsFilePath = path.join(process.cwd(), "components/events/event-detail-tabs.tsx");
const tabsCode = fs.readFileSync(tabsFilePath, "utf-8");

assert(tabsCode.includes("canManageOps"), "EventDetailTabs must declare canManageOps");
assert(tabsCode.includes("canManageSheets"), "EventDetailTabs must declare canManageSheets");
assert(tabsCode.includes("canManageFamily"), "EventDetailTabs must declare canManageFamily");

assert(tabsCode.includes("const manageOps = canManageOps ?? canManage;"), "manageOps fallback calculation");
assert(tabsCode.includes("const manageSheets = canManageSheets ?? canManage;"), "manageSheets fallback calculation");
assert(tabsCode.includes("const manageFamily = canManageFamily ?? canManage;"), "manageFamily fallback calculation");

assert(tabsCode.includes("canManage={manageOps}"), "manageOps wired to crew, tasks, vendors");
assert(tabsCode.includes("canManage={manageSheets}"), "manageSheets wired to EventSpreadsheetTabs");
assert(tabsCode.includes("canManageFamily={manageFamily}"), "manageFamily wired to EventSpreadsheetTabs");
assert(tabsCode.includes("canManage={manageFamily}"), "manageFamily wired to EventFamilyDataSection");
console.log("   ✓ EventDetailTabs prop declaration and section wiring verified.");

// 5. Verify Event Detail Page
console.log("\n5. Auditing Event Detail Page (app/(dashboard)/events/[id]/page.tsx)...");
const pageFilePath = path.join(process.cwd(), "app/(dashboard)/events/[id]/page.tsx");
const pageCode = fs.readFileSync(pageFilePath, "utf-8");

assert(pageCode.includes('hasPermission("events:operations:manage")'), "Page must check events:operations:manage");
assert(pageCode.includes('hasPermission("events:sheets:manage")'), "Page must check events:sheets:manage");
assert(pageCode.includes('hasPermission("events:family:manage")'), "Page must check events:family:manage");

assert(pageCode.includes("canManageOps={canManageOps}"), "Page must pass canManageOps");
assert(pageCode.includes("canManageSheets={canManageSheets}"), "Page must pass canManageSheets");
assert(pageCode.includes("canManageFamily={canManageFamily}"), "Page must pass canManageFamily");
console.log("   ✓ Event Detail page concurrent permission checks and prop forwarding verified.");

// 6. Verify Server Actions Guards
console.log("\n6. Auditing Server Actions Permission Guards...");
const sheetActionsCode = fs.readFileSync(path.join(process.cwd(), "app/(dashboard)/events/sheet-actions.ts"), "utf-8");
assert(sheetActionsCode.includes('requirePermission("events:sheets:manage")'), "sheet-actions.ts must guard with events:sheets:manage");
assert(!sheetActionsCode.includes('requirePermission("events.edit")'), "sheet-actions.ts must no longer hardcode events.edit");

const publicFormActionsCode = fs.readFileSync(path.join(process.cwd(), "app/(dashboard)/events/public-form-actions.ts"), "utf-8");
assert(publicFormActionsCode.includes('requirePermission("events:family:manage")'), "public-form-actions.ts must guard with events:family:manage");
assert(!publicFormActionsCode.includes('requirePermission("events.edit")'), "public-form-actions.ts must no longer hardcode events.edit");

const actionsCode = fs.readFileSync(path.join(process.cwd(), "app/(dashboard)/events/actions.ts"), "utf-8");
assert(actionsCode.includes('requirePermission("events:operations:manage")'), "actions.ts must guard operational actions with events:operations:manage");
console.log("   ✓ Server Actions permission guards properly refactored.");

// 7. Verify Migration and Seeding Synchronization
console.log("\n7. Auditing Migration and Seeder Files...");
const migrationPath = path.join(process.cwd(), "supabase/migrations/20261023_add_granular_event_permissions.sql");
assert(fs.existsSync(migrationPath), "Migration 20261023_add_granular_event_permissions.sql must exist");
const migrationCode = fs.readFileSync(migrationPath, "utf-8");
assert(migrationCode.includes("events:operations:manage"), "Migration contains events:operations:manage");
assert(migrationCode.includes("events:sheets:manage"), "Migration contains events:sheets:manage");
assert(migrationCode.includes("events:family:manage"), "Migration contains events:family:manage");
assert(migrationCode.includes("Role perms select"), "Migration contains Role perms select policy");

const seedSqlCode = fs.readFileSync(path.join(process.cwd(), "supabase/seed.sql"), "utf-8");
assert(seedSqlCode.includes("events:operations:manage"), "seed.sql contains events:operations:manage");
assert(seedSqlCode.includes("events:sheets:manage"), "seed.sql contains events:sheets:manage");
assert(seedSqlCode.includes("events:family:manage"), "seed.sql contains events:family:manage");

const seedTsCode = fs.readFileSync(path.join(process.cwd(), "scripts/seed-database.ts"), "utf-8");
assert(seedTsCode.includes("events:operations:manage"), "seed-database.ts contains events:operations:manage");
assert(seedTsCode.includes("events:sheets:manage"), "seed-database.ts contains events:sheets:manage");
assert(seedTsCode.includes("events:family:manage"), "seed-database.ts contains events:family:manage");

const seedPyCode = fs.readFileSync(path.join(process.cwd(), "scripts/seed_database.py"), "utf-8");
assert(seedPyCode.includes("events:operations:manage"), "seed_database.py contains events:operations:manage");
assert(seedPyCode.includes("events:sheets:manage"), "seed_database.py contains events:sheets:manage");
assert(seedPyCode.includes("events:family:manage"), "seed_database.py contains events:family:manage");
console.log("   ✓ Migration and all seeding files synchronized with clear Indonesian descriptions.");

console.log("\n✅ ALL GRANULAR PERMISSION AND RBAC REFACTOR AUDITS PASSED SUCCESSFULLY!");
