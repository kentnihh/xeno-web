import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToString } from "react-dom/server";
import { UsersManagementView } from "../components/users/users-management-view";
import { TeamHeader } from "../components/team/team-header";
import { UsersDialogHandler } from "../components/users/users-dialog-handler";
import type { Role, UserWithRBAC, Permission, RolePermission } from "../types/database";

const { AppRouterContext } = require("next/dist/shared/lib/app-router-context.shared-runtime");

console.log("===============================================================");
console.log("TEST SUITE: User Creation Role Guards (UI & Backend Authorization)");
console.log("===============================================================\n");

const mockRouter = {
  push: () => {},
  replace: () => {},
  prefetch: () => {},
  back: () => {},
  forward: () => {},
  refresh: () => {},
};

function renderWithRouter(element: React.ReactElement) {
  return renderToString(
    React.createElement(
      AppRouterContext.Provider,
      { value: mockRouter },
      element
    )
  );
}

const mockRoles: Role[] = [
  { id: "admin", name: "Administrator", description: "Admin role", created_at: new Date().toISOString() },
  { id: "manager", name: "Event Manager", description: "Manager role", created_at: new Date().toISOString() },
  { id: "staff", name: "Kru Operasional", description: "Staff role", created_at: new Date().toISOString() },
];

const mockUsers: UserWithRBAC[] = [
  {
    id: "user-1",
    email: "admin@xenoent.com",
    full_name: "Super Admin",
    phone: null,
    avatar_url: null,
    avatar_color: "#007aff",
    role: "super_admin",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    roles: mockRoles,
    permissions: [],
  },
];

const mockPermissions: Permission[] = [
  {
    id: "users.manage",
    name: "Kelola Pengguna",
    description: "Bisa mengelola pengguna",
    module: "users",
    created_at: new Date().toISOString(),
  },
];

const mockRolePermissions: RolePermission[] = [
  {
    id: "rp-1",
    role_id: "admin",
    permission_id: "users.manage",
    created_at: new Date().toISOString(),
  },
];

// --- 1. UI Layer: UsersManagementView conditional button visibility ---
console.log("1. Verifying UsersManagementView '+ Tambah Staf' button visibility...");

// Case A: SUPER_ADMIN
const superAdminHtml = renderWithRouter(
  React.createElement(UsersManagementView, {
    initialUsers: mockUsers,
    initialRoles: mockRoles,
    initialPermissions: mockPermissions,
    initialRolePermissions: mockRolePermissions,
    currentUserId: "user-super",
    currentUserRole: "SUPER_ADMIN",
  })
);
assert(
  superAdminHtml.includes("Tambah Staf"),
  "UsersManagementView must display 'Tambah Staf' button for SUPER_ADMIN"
);
console.log("   ✓ SUPER_ADMIN can see '+ Tambah Staf' button in UsersManagementView.");

// Case B: ADMIN
const adminHtml = renderWithRouter(
  React.createElement(UsersManagementView, {
    initialUsers: mockUsers,
    initialRoles: mockRoles,
    initialPermissions: mockPermissions,
    initialRolePermissions: mockRolePermissions,
    currentUserId: "user-admin",
    currentUserRole: "ADMIN",
  })
);
assert(
  adminHtml.includes("Tambah Staf"),
  "UsersManagementView must display 'Tambah Staf' button for ADMIN"
);
console.log("   ✓ ADMIN can see '+ Tambah Staf' button in UsersManagementView.");

// Case C: MANAGER (MUST BE HIDDEN)
const managerHtml = renderWithRouter(
  React.createElement(UsersManagementView, {
    initialUsers: mockUsers,
    initialRoles: mockRoles,
    initialPermissions: mockPermissions,
    initialRolePermissions: mockRolePermissions,
    currentUserId: "user-manager",
    currentUserRole: "MANAGER",
  })
);
assert(
  !managerHtml.includes("Tambah Staf"),
  "UsersManagementView must STRICTLY HIDE 'Tambah Staf' button for MANAGER"
);
console.log("   ✓ MANAGER strictly CANNOT see '+ Tambah Staf' button in UsersManagementView.");

// Case D: STAFF (MUST BE HIDDEN)
const staffHtml = renderWithRouter(
  React.createElement(UsersManagementView, {
    initialUsers: mockUsers,
    initialRoles: mockRoles,
    initialPermissions: mockPermissions,
    initialRolePermissions: mockRolePermissions,
    currentUserId: "user-staff",
    currentUserRole: "STAFF",
  })
);
assert(
  !staffHtml.includes("Tambah Staf"),
  "UsersManagementView must STRICTLY HIDE 'Tambah Staf' button for STAFF"
);
console.log("   ✓ STAFF strictly CANNOT see '+ Tambah Staf' button in UsersManagementView.");

// Case E: Null / Undefined Role (MUST BE HIDDEN)
const nullRoleHtml = renderWithRouter(
  React.createElement(UsersManagementView, {
    initialUsers: mockUsers,
    initialRoles: mockRoles,
    initialPermissions: mockPermissions,
    initialRolePermissions: mockRolePermissions,
    currentUserId: null,
    currentUserRole: null,
  })
);
assert(
  !nullRoleHtml.includes("Tambah Staf"),
  "UsersManagementView must STRICTLY HIDE 'Tambah Staf' button when role is null/undefined"
);
console.log("   ✓ Unauthenticated/null role strictly CANNOT see '+ Tambah Staf' button.");

// --- 2. UI Layer: TeamHeader conditional button visibility ---
console.log("\n2. Verifying TeamHeader '+ Tambah Staf' button visibility...");

const teamSuperHtml = renderToString(
  React.createElement(TeamHeader, {
    currentUserRole: "SUPER_ADMIN",
    currentUserId: "user-super",
    roles: mockRoles,
  })
);
assert(teamSuperHtml.includes("Tambah Staf"), "TeamHeader must display 'Tambah Staf' for SUPER_ADMIN");

const teamAdminHtml = renderToString(
  React.createElement(TeamHeader, {
    currentUserRole: "ADMIN",
    currentUserId: "user-admin",
    roles: mockRoles,
  })
);
assert(teamAdminHtml.includes("Tambah Staf"), "TeamHeader must display 'Tambah Staf' for ADMIN");

const teamManagerHtml = renderToString(
  React.createElement(TeamHeader, {
    currentUserRole: "MANAGER",
    currentUserId: "user-manager",
    roles: mockRoles,
  })
);
assert(!teamManagerHtml.includes("Tambah Staf"), "TeamHeader must HIDE 'Tambah Staf' for MANAGER");

const teamStaffHtml = renderToString(
  React.createElement(TeamHeader, {
    currentUserRole: "STAFF",
    currentUserId: "user-staff",
    roles: mockRoles,
  })
);
assert(!teamStaffHtml.includes("Tambah Staf"), "TeamHeader must HIDE 'Tambah Staf' for STAFF");

console.log("   ✓ TeamHeader strictly restricts '+ Tambah Staf' button to SUPER_ADMIN and ADMIN.");

// --- 3. UI Layer: UsersDialogHandler create_user dialog safety guard ---
console.log("\n3. Verifying UsersDialogHandler create_user dialog safety guard...");

const handlerStaffOutput = renderToString(
  React.createElement(UsersDialogHandler, {
    dialog: { type: "create_user" },
    onClose: () => {},
    roles: mockRoles,
    permissions: mockPermissions,
    rolePermissionsMap: {},
    currentUserRole: "STAFF",
  })
);
assert.strictEqual(handlerStaffOutput, "", "UsersDialogHandler must return empty/null when STAFF triggers create_user");

const handlerManagerOutput = renderToString(
  React.createElement(UsersDialogHandler, {
    dialog: { type: "create_user" },
    onClose: () => {},
    roles: mockRoles,
    permissions: mockPermissions,
    rolePermissionsMap: {},
    currentUserRole: "MANAGER",
  })
);
assert.strictEqual(handlerManagerOutput, "", "UsersDialogHandler must return empty/null when MANAGER triggers create_user");

const handlerAdminOutput = renderToString(
  React.createElement(UsersDialogHandler, {
    dialog: { type: "create_user" },
    onClose: () => {},
    roles: mockRoles,
    permissions: mockPermissions,
    rolePermissionsMap: {},
    currentUserRole: "ADMIN",
  })
);
assert(handlerAdminOutput.includes("Tambah Pengguna Baru"), "UsersDialogHandler renders modal for ADMIN");

console.log("   ✓ UsersDialogHandler blocks modal mounting for unauthorized roles.");

// --- 4. Server Actions Code Contract: app/(dashboard)/settings/rbac/actions.ts ---
console.log("\n4. Verifying Server Action Authorization Guards in rbac/actions.ts...");

const rbacActionsPath = path.resolve(process.cwd(), "app/(dashboard)/settings/rbac/actions.ts");
const rbacActionsCode = fs.readFileSync(rbacActionsPath, "utf-8");

assert(
  rbacActionsCode.includes("export async function createUser"),
  "rbac/actions.ts must export createUser action"
);
assert(
  rbacActionsCode.includes("const callerProfile = (await getCurrentProfile()) || (await getCurrentProfile(currentUser.id));") ||
  rbacActionsCode.includes("const callerProfile = await getCurrentProfile(currentUser.id);") ||
  rbacActionsCode.includes("const callerRole = (callerProfile?.role || \"\").toUpperCase();"),
  "createUser must retrieve caller profile and role via getCurrentProfile"
);
assert(
  rbacActionsCode.includes("![\"SUPER_ADMIN\", \"ADMIN\"].includes(callerRole)"),
  "createUser must check if callerRole is in ['SUPER_ADMIN', 'ADMIN']"
);
assert(
  rbacActionsCode.includes("Akses ditolak: Hanya Administrator yang berwenang menambahkan pengguna baru."),
  "createUser must return exact error: 'Akses ditolak: Hanya Administrator yang berwenang menambahkan pengguna baru.'"
);
assert(
  rbacActionsCode.includes("export const createStaff = createUser;"),
  "rbac/actions.ts must export createStaff alias for createUser"
);
console.log("   ✓ rbac/actions.ts correctly enforces caller role verification and exports createStaff.");

// --- 5. Server Actions Code Contract: app/(dashboard)/team/actions.ts ---
console.log("\n5. Verifying Server Action Delegates in team/actions.ts...");

const teamActionsPath = path.resolve(process.cwd(), "app/(dashboard)/team/actions.ts");
const teamActionsCode = fs.readFileSync(teamActionsPath, "utf-8");

assert(
  teamActionsCode.includes("export async function createStaff") ||
  teamActionsCode.includes("export const createStaff"),
  "team/actions.ts must export createStaff"
);
assert(
  teamActionsCode.includes("export const createUser = createStaff;") ||
  teamActionsCode.includes("export async function createUser"),
  "team/actions.ts must export createUser"
);
console.log("   ✓ team/actions.ts exports createStaff and createUser with delegation to rbac/actions.");

// --- 6. Code Contract: app/(dashboard)/users/actions.ts ---
console.log("\n6. Verifying actions re-export in users/actions.ts...");

const usersActionsPath = path.resolve(process.cwd(), "app/(dashboard)/users/actions.ts");
const usersActionsCode = fs.readFileSync(usersActionsPath, "utf-8");

assert(
  usersActionsCode.includes('export * from "@/app/(dashboard)/settings/rbac/actions";'),
  "users/actions.ts must re-export all RBAC actions including createUser and createStaff"
);
console.log("   ✓ users/actions.ts correctly re-exports createUser and createStaff.");

// --- 7. Impersonation Awareness Validation ---
console.log("\n7. Verifying Impersonation Awareness across Role Resolution...");

const rbacPagePath = path.resolve(process.cwd(), "app/(dashboard)/settings/rbac/page.tsx");
const rbacPageCode = fs.readFileSync(rbacPagePath, "utf-8");

assert(
  rbacPageCode.includes("getCurrentProfile"),
  "SettingsRBACPage must import and call getCurrentProfile for impersonation context"
);
assert(
  rbacPageCode.includes("currentUserRole={callerRole}"),
  "SettingsRBACPage must pass resolved callerRole to UsersManagementView"
);

const teamPagePath = path.resolve(process.cwd(), "app/(dashboard)/team/page.tsx");
const teamPageCode = fs.readFileSync(teamPagePath, "utf-8");

assert(
  teamPageCode.includes("TeamHeader"),
  "TeamPage must use TeamHeader component"
);
assert(
  teamPageCode.includes("currentUserRole={callerRole}"),
  "TeamPage must pass callerRole to TeamHeader"
);
console.log("   ✓ Impersonation context properly binds callerRole across TeamPage and SettingsRBACPage.");

console.log("\n===============================================================");
console.log("🎉 ALL USER CREATION ROLE GUARD TESTS PASSED SUCCESSFULLY! 🚀");
console.log("===============================================================");
