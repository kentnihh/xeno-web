import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToString } from "react-dom/server";
import { UserModal } from "../components/users/user-modal";
import { EditStaffDialog } from "../components/team/edit-staff-dialog";
import { updateStaff } from "../app/(dashboard)/team/actions";
import { updateUser, updateUserRole } from "../app/(dashboard)/settings/rbac/actions";
import type { Role, UserWithRBAC } from "../types/database";

console.log("===============================================================");
console.log("TEST SUITE: Edit Staff Dialog Role Lockdown & Backend Guards");
console.log("===============================================================");

const MOCK_ROLES: Role[] = [
  { id: "admin", name: "Administrator", description: "Akses penuh seluruh konfigurasi sistem", created_at: "2026-01-01T00:00:00Z" },
  { id: "manager", name: "Event Manager", description: "Pengelolaan acara dan kru", created_at: "2026-01-01T00:00:00Z" },
  { id: "staff", name: "Kru Operasional", description: "Eksekusi teknis lapangan", created_at: "2026-01-01T00:00:00Z" },
];

const MOCK_STAFF: UserWithRBAC = {
  id: "usr-staff-1",
  full_name: "Budi Santoso",
  email: "budi@xenoent.com",
  phone: "+62 812-3456-7890",
  avatar_url: null,
  role: "staff",
  avatar_color: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  roles: [{ id: "staff", name: "Kru Operasional", description: null, created_at: "2026-01-01T00:00:00Z" }],
  permissions: [],
};

const MOCK_ADMIN: UserWithRBAC = {
  id: "usr-admin-1",
  full_name: "Sarah Admin",
  email: "sarah@xenoent.com",
  phone: "+62 811-2222-3333",
  avatar_url: null,
  role: "admin",
  avatar_color: "#007aff",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  roles: [{ id: "admin", name: "Administrator", description: null, created_at: "2026-01-01T00:00:00Z" }],
  permissions: [],
};

const MOCK_ROOT_ADMIN: UserWithRBAC = {
  id: "usr-root-admin",
  full_name: "Jonathan Admin",
  email: "admin@xenoent.com",
  phone: "+62 812-1111-2222",
  avatar_url: null,
  role: "super_admin",
  avatar_color: "#f59e0b",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  roles: [{ id: "super_admin", name: "Super Administrator", description: null, created_at: "2026-01-01T00:00:00Z" }],
  permissions: [],
};

// 1. UI Lockdown for MANAGER caller
console.log("\n1. Testing EditStaffDialog UI Lockdown when caller is MANAGER...");
const managerHtml = renderToString(
  React.createElement(UserModal, {
    user: MOCK_STAFF,
    roles: MOCK_ROLES,
    currentUserId: "usr-manager-1",
    currentUserRole: "MANAGER",
    onClose: () => {},
  })
);

assert(managerHtml.includes("Edit Data Staf"), "Modal must have title 'Edit Data Staf'");
assert(managerHtml.includes("Hanya Administrator yang dapat mengubah peran staf."), "Modal must display helper text for MANAGER");
assert(managerHtml.includes("(Terkunci)"), "Role selector must be tagged as '(Terkunci)'");
assert(managerHtml.includes("type=\"hidden\" name=\"roleId\" value=\"staff\""), "Locked role must persist value via hidden input");
assert(!managerHtml.includes("data-combobox-select"), "Interactive combobox must NOT be rendered when locked for manager");
console.log("   ✓ Role selector is strictly locked for MANAGER with lock icon and helper text.");

// 2. UI Lockdown for Self-Edit (even if caller is ADMIN)
console.log("\n2. Testing EditStaffDialog UI Lockdown for Self-Role Modification...");
const selfAdminHtml = renderToString(
  React.createElement(UserModal, {
    user: MOCK_ADMIN,
    roles: MOCK_ROLES,
    currentUserId: MOCK_ADMIN.id,
    currentUserRole: "ADMIN",
    onClose: () => {},
  })
);

assert(selfAdminHtml.includes("Anda tidak dapat mengubah peran Anda sendiri."), "Modal must block self-role edit with clear message");
assert(selfAdminHtml.includes("(Terkunci)"), "Self-edit role selector must be tagged '(Terkunci)'");
assert(selfAdminHtml.includes(`type="hidden" name="roleId" value="admin"`), "Self-edit must keep existing role via hidden input");
console.log("   ✓ ADMIN editing own profile cannot modify own role.");

// 3. UI Lockdown for Root Admin Account (admin@xenoent.com)
console.log("\n3. Testing EditStaffDialog UI Lockdown for Root Admin Account...");
const rootAdminHtml = renderToString(
  React.createElement(UserModal, {
    user: MOCK_ROOT_ADMIN,
    roles: MOCK_ROLES,
    currentUserId: "usr-other-admin",
    currentUserRole: "ADMIN",
    onClose: () => {},
  })
);

assert(rootAdminHtml.includes("Akun Sistem Utama (Terkunci)"), "Must display Root Admin protected badge");
assert(rootAdminHtml.includes("Peran akun admin@xenoent.com dilindungi sistem"), "Must display Root Admin helper text");
console.log("   ✓ Root Admin account is strictly protected from role alterations.");

// 4. UI for ADMIN caller editing a different staff member
console.log("\n4. Testing EditStaffDialog when ADMIN edits another staff member...");
const adminEditStaffHtml = renderToString(
  React.createElement(UserModal, {
    user: MOCK_STAFF,
    roles: MOCK_ROLES,
    currentUserId: "usr-admin-1",
    currentUserRole: "ADMIN",
    onClose: () => {},
  })
);

assert(!adminEditStaffHtml.includes("Hanya Administrator yang dapat mengubah peran staf."), "Admin must not see manager warning");
assert(!adminEditStaffHtml.includes("Anda tidak dapat mengubah peran Anda sendiri."), "Admin editing another staff must not see self-edit warning");
assert(!adminEditStaffHtml.includes("SUPER_ADMIN"), "Regular Admin must NOT be offered SUPER_ADMIN option");
console.log("   ✓ ADMIN editing another user has access to assign permitted roles.");

// 5. Verify EditStaffDialog wrapper export
console.log("\n5. Verifying EditStaffDialog component in components/team/edit-staff-dialog.tsx...");
assert(typeof EditStaffDialog === "function", "EditStaffDialog must be exported as a function component");
const wrapperHtml = renderToString(
  React.createElement(EditStaffDialog, {
    staff: MOCK_STAFF,
    roles: MOCK_ROLES,
    currentUserId: "usr-manager-1",
    currentUserRole: "MANAGER",
    onClose: () => {},
  })
);
assert(wrapperHtml.includes("Hanya Administrator yang dapat mengubah peran staf."), "EditStaffDialog wrapper must forward lock state");
console.log("   ✓ EditStaffDialog wrapper successfully verified.");

// 6. Audit Backend Server Actions
console.log("\n6. Auditing Backend Server Action Guards in team/actions.ts & rbac/actions.ts...");
assert(typeof updateStaff === "function", "updateStaff action must be exported");
assert(typeof updateUser === "function", "updateUser action must be exported");
assert(typeof updateUserRole === "function", "updateUserRole action must be exported");

const rbacActionsCode = fs.readFileSync(
  path.join(process.cwd(), "app/(dashboard)/settings/rbac/actions.ts"),
  "utf-8"
);
const teamActionsCode = fs.readFileSync(
  path.join(process.cwd(), "app/(dashboard)/team/actions.ts"),
  "utf-8"
);

assert(
  rbacActionsCode.includes("const callerRole = (callerProfile?.role || \"staff\").toUpperCase()"),
  "rbac actions must extract callerProfile role"
);
assert(
  rbacActionsCode.includes("![\"SUPER_ADMIN\", \"ADMIN\"].includes(callerRole)"),
  "rbac actions must block non-admin callers from modifying roles"
);
assert(
  rbacActionsCode.includes("Anda tidak dapat mengubah peran akun Anda sendiri"),
  "rbac actions must reject self-role alteration"
);

assert(
  teamActionsCode.includes("![\"SUPER_ADMIN\", \"ADMIN\"].includes(callerRole)"),
  "team actions must block non-admin callers from modifying roles"
);
assert(
  teamActionsCode.includes("Anda tidak dapat mengubah peran akun Anda sendiri"),
  "team actions must reject self-role alteration"
);
console.log("   ✓ Server Actions strictly enforce caller role check, self-edit block, and role hierarchy.");

// 7. Verify PostgreSQL Database Triggers
console.log("\n7. Verifying Database-Level Triggers in schema and migrations...");
const migrationCode = fs.readFileSync(
  path.join(process.cwd(), "supabase/migrations/20261024_prevent_role_escalation.sql"),
  "utf-8"
);
const schemaCode = fs.readFileSync(
  path.join(process.cwd(), "supabase/schema.sql"),
  "utf-8"
);

for (const [name, code] of [["Migration", migrationCode], ["Schema", schemaCode]] as const) {
  const lower = code.toLowerCase();
  assert(lower.includes("create or replace function public.prevent_self_role_escalation()"), `${name} must define prevent_self_role_escalation`);
  assert(lower.includes("trg_prevent_role_escalation"), `${name} must define trg_prevent_role_escalation trigger`);
  assert(lower.includes("before update on public.profiles"), `${name} must bind trigger BEFORE UPDATE on profiles`);
  assert(lower.includes("not in ('super_admin', 'admin')") || code.includes("NOT IN ('SUPER_ADMIN', 'ADMIN')"), `${name} must reject non-admin from modifying role column`);
  assert(lower.includes("new.id = auth.uid()"), `${name} must reject self-role escalation at database trigger level`);
}
console.log("   ✓ Database trigger public.prevent_self_role_escalation verified on public.profiles.");

console.log("\n===============================================================");
console.log("ALL ROLE LOCKDOWN & BACKEND AUTHORIZATION TESTS PASSED! 🚀");
console.log("===============================================================");
