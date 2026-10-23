import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToString } from "react-dom/server";
import { TeamMemberActions } from "../components/team/team-member-actions";
import { StaffCard } from "../components/team/staff-card";
import { UsersTable } from "../components/users/users-table";
import { UsersDialogHandler } from "../components/users/users-dialog-handler";
import type { Profile, UserWithRBAC, Role, Permission } from "../types/database";

const { AppRouterContext } = require("next/dist/shared/lib/app-router-context.shared-runtime");

console.log("===============================================================");
console.log("TEST SUITE: User Deletion Role Guards (UI & Backend Authorization)");
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

const mockStaffMember: Profile = {
  id: "staff-target-1",
  full_name: "Budi Santoso",
  email: "budi@xenoent.com",
  role: "staff",
  phone: "08123456789",
  avatar_url: null,
  avatar_color: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockRootAdminMember: Profile = {
  id: "root-admin-id",
  full_name: "Root Administrator",
  email: "admin@xenoent.com",
  role: "super_admin",
  phone: null,
  avatar_url: null,
  avatar_color: "#007aff",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockRoles: Role[] = [
  { id: "admin", name: "Administrator", description: "Admin", created_at: new Date().toISOString() },
  { id: "manager", name: "Manager", description: "Manager", created_at: new Date().toISOString() },
  { id: "staff", name: "Staff", description: "Staff", created_at: new Date().toISOString() },
];

const mockPermissions: Permission[] = [
  { id: "users.manage", name: "Manage Users", description: null, module: "users", created_at: new Date().toISOString() },
];

// --- 1. TeamMemberActions UI Component Tests ---
console.log("1. Verifying TeamMemberActions Delete (Trash) Button Visibility...");

// Case A: ADMIN viewing a staff member card -> Trash button MUST be present
const adminActionsHtml = renderWithRouter(
  React.createElement(TeamMemberActions, {
    member: mockStaffMember,
    memberId: mockStaffMember.id,
    memberName: mockStaffMember.full_name,
    currentRole: mockStaffMember.role,
    isSelf: false,
    currentUserRole: "ADMIN",
    currentUserId: "admin-caller-id",
    roles: mockRoles,
  })
);
assert(
  adminActionsHtml.includes("Hapus Akun Staf"),
  "TeamMemberActions must show delete button for ADMIN"
);
console.log("   ✓ ADMIN can see trash delete button on staff card.");

// Case B: SUPER_ADMIN viewing a staff member card -> Trash button MUST be present
const superAdminActionsHtml = renderWithRouter(
  React.createElement(TeamMemberActions, {
    member: mockStaffMember,
    memberId: mockStaffMember.id,
    memberName: mockStaffMember.full_name,
    currentRole: mockStaffMember.role,
    isSelf: false,
    currentUserRole: "SUPER_ADMIN",
    currentUserId: "super-caller-id",
    roles: mockRoles,
  })
);
assert(
  superAdminActionsHtml.includes("Hapus Akun Staf"),
  "TeamMemberActions must show delete button for SUPER_ADMIN"
);
console.log("   ✓ SUPER_ADMIN can see trash delete button on staff card.");

// Case C: MANAGER viewing a staff member card -> Trash button MUST BE STRICTLY HIDDEN
const managerActionsHtml = renderWithRouter(
  React.createElement(TeamMemberActions, {
    member: mockStaffMember,
    memberId: mockStaffMember.id,
    memberName: mockStaffMember.full_name,
    currentRole: mockStaffMember.role,
    isSelf: false,
    currentUserRole: "MANAGER",
    currentUserId: "manager-caller-id",
    roles: mockRoles,
  })
);
assert(
  !managerActionsHtml.includes("Hapus Akun Staf"),
  "TeamMemberActions must STRICTLY HIDE delete button for MANAGER"
);
console.log("   ✓ MANAGER strictly CANNOT see trash delete button on any staff card.");

// Case D: STAFF viewing another staff member card -> Trash button MUST BE STRICTLY HIDDEN
const staffActionsHtml = renderWithRouter(
  React.createElement(TeamMemberActions, {
    member: mockStaffMember,
    memberId: mockStaffMember.id,
    memberName: mockStaffMember.full_name,
    currentRole: mockStaffMember.role,
    isSelf: false,
    currentUserRole: "STAFF",
    currentUserId: "other-staff-id",
    roles: mockRoles,
  })
);
assert(
  !staffActionsHtml.includes("Hapus Akun Staf"),
  "TeamMemberActions must STRICTLY HIDE delete button for STAFF"
);
console.log("   ✓ STAFF strictly CANNOT see trash delete button on any staff card.");

// Case E: Null/unauthenticated role -> Trash button MUST BE STRICTLY HIDDEN
const nullRoleActionsHtml = renderWithRouter(
  React.createElement(TeamMemberActions, {
    member: mockStaffMember,
    memberId: mockStaffMember.id,
    memberName: mockStaffMember.full_name,
    currentRole: mockStaffMember.role,
    isSelf: false,
    currentUserRole: null,
    currentUserId: null,
    roles: mockRoles,
  })
);
assert(
  !nullRoleActionsHtml.includes("Hapus Akun Staf"),
  "TeamMemberActions must HIDE delete button when currentUserRole is null"
);
console.log("   ✓ Null/unauthenticated role strictly CANNOT see trash delete button.");

// Case F: Viewing self account (even as ADMIN) -> Trash button MUST BE HIDDEN
const selfAdminActionsHtml = renderWithRouter(
  React.createElement(TeamMemberActions, {
    member: mockStaffMember,
    memberId: mockStaffMember.id,
    memberName: mockStaffMember.full_name,
    currentRole: mockStaffMember.role,
    isSelf: true,
    currentUserRole: "ADMIN",
    currentUserId: mockStaffMember.id,
    roles: mockRoles,
  })
);
assert(
  !selfAdminActionsHtml.includes("Hapus Akun Staf"),
  "TeamMemberActions must NEVER show delete button on self account"
);
console.log("   ✓ Viewing self account correctly omits delete button.");

// Case G: Root admin account (admin@xenoent.com) -> Trash button MUST BE HIDDEN
const rootAdminActionsHtml = renderWithRouter(
  React.createElement(TeamMemberActions, {
    member: mockRootAdminMember,
    memberId: mockRootAdminMember.id,
    memberName: mockRootAdminMember.full_name,
    currentRole: mockRootAdminMember.role,
    isSelf: false,
    isRootAdmin: true,
    currentUserRole: "ADMIN",
    currentUserId: "some-admin-id",
    roles: mockRoles,
  })
);
assert(
  !rootAdminActionsHtml.includes("Hapus Akun Staf"),
  "TeamMemberActions must NEVER show delete button for root admin (admin@xenoent.com)"
);
console.log("   ✓ Root admin account (admin@xenoent.com) delete button is permanently hidden.");

// --- 2. StaffCard UI Component Tests ---
console.log("\n2. Verifying StaffCard Delete Button Visibility...");

const adminStaffCardHtml = renderWithRouter(
  React.createElement(StaffCard, {
    staff: mockStaffMember,
    currentUserRole: "ADMIN",
    currentUserId: "admin-id",
    roles: mockRoles,
  })
);
assert(adminStaffCardHtml.includes("text-red-500"), "StaffCard must render trash icon for ADMIN");

const managerStaffCardHtml = renderWithRouter(
  React.createElement(StaffCard, {
    staff: mockStaffMember,
    currentUserRole: "MANAGER",
    currentUserId: "manager-id",
    roles: mockRoles,
  })
);
assert(!managerStaffCardHtml.includes("text-red-500"), "StaffCard must HIDE trash icon for MANAGER");

const staffStaffCardHtml = renderWithRouter(
  React.createElement(StaffCard, {
    staff: mockStaffMember,
    currentUserRole: "STAFF",
    currentUserId: "staff-id",
    roles: mockRoles,
  })
);
assert(!staffStaffCardHtml.includes("text-red-500"), "StaffCard must HIDE trash icon for STAFF");

console.log("   ✓ StaffCard correctly displays delete button for ADMIN and completely hides it for MANAGER & STAFF.");

// --- 3. UsersTable UI Component Tests ---
console.log("\n3. Verifying UsersTable Delete Button Visibility...");

const mockUserWithRBAC: UserWithRBAC = {
  ...mockStaffMember,
  roles: mockRoles,
  permissions: mockPermissions,
};

const adminTableHtml = renderToString(
  React.createElement(UsersTable, {
    users: [mockUserWithRBAC],
    currentUserId: "admin-id",
    currentUserRole: "ADMIN",
    onEdit: () => {},
    onResetPassword: () => {},
    onDelete: () => {},
  })
);
assert(adminTableHtml.includes("Hapus Pengguna"), "UsersTable must render delete button for ADMIN");

const managerTableHtml = renderToString(
  React.createElement(UsersTable, {
    users: [mockUserWithRBAC],
    currentUserId: "manager-id",
    currentUserRole: "MANAGER",
    onEdit: () => {},
    onResetPassword: () => {},
    onDelete: () => {},
  })
);
assert(!managerTableHtml.includes("Hapus Pengguna"), "UsersTable must HIDE delete button for MANAGER");

const staffTableHtml = renderToString(
  React.createElement(UsersTable, {
    users: [mockUserWithRBAC],
    currentUserId: "staff-id",
    currentUserRole: "STAFF",
    onEdit: () => {},
    onResetPassword: () => {},
    onDelete: () => {},
  })
);
assert(!staffTableHtml.includes("Hapus Pengguna"), "UsersTable must HIDE delete button for STAFF");

console.log("   ✓ UsersTable correctly displays delete button for ADMIN and completely hides it for MANAGER & STAFF.");

// --- 4. UsersDialogHandler Delete Dialog Guard ---
console.log("\n4. Verifying UsersDialogHandler delete_user Dialog Mounting Guard...");

const staffDeleteDialogHtml = renderToString(
  React.createElement(UsersDialogHandler, {
    dialog: { type: "delete_user", user: mockUserWithRBAC },
    onClose: () => {},
    roles: mockRoles,
    permissions: mockPermissions,
    rolePermissionsMap: {},
    currentUserRole: "STAFF",
  })
);
assert.strictEqual(
  staffDeleteDialogHtml,
  "",
  "UsersDialogHandler must return empty/null when STAFF triggers delete_user"
);

const managerDeleteDialogHtml = renderToString(
  React.createElement(UsersDialogHandler, {
    dialog: { type: "delete_user", user: mockUserWithRBAC },
    onClose: () => {},
    roles: mockRoles,
    permissions: mockPermissions,
    rolePermissionsMap: {},
    currentUserRole: "MANAGER",
  })
);
assert.strictEqual(
  managerDeleteDialogHtml,
  "",
  "UsersDialogHandler must return empty/null when MANAGER triggers delete_user"
);

const adminDeleteDialogHtml = renderToString(
  React.createElement(UsersDialogHandler, {
    dialog: { type: "delete_user", user: mockUserWithRBAC },
    onClose: () => {},
    roles: mockRoles,
    permissions: mockPermissions,
    rolePermissionsMap: {},
    currentUserRole: "ADMIN",
  })
);
assert(
  adminDeleteDialogHtml.includes("Konfirmasi Hapus Staf"),
  "UsersDialogHandler must render delete confirmation dialog for ADMIN"
);

console.log("   ✓ UsersDialogHandler blocks delete modal mounting for unauthorized roles.");

// --- 5. Server Action Guards in team/actions.ts and settings/team/actions.ts ---
console.log("\n5. Verifying Server Action Authorization Guards in team/actions.ts...");

const teamActionsPath = path.resolve(process.cwd(), "app/(dashboard)/team/actions.ts");
const teamActionsCode = fs.readFileSync(teamActionsPath, "utf-8");

assert(
  teamActionsCode.includes("export async function deleteMemberAction"),
  "team/actions.ts must export deleteMemberAction"
);
assert(
  teamActionsCode.includes("export async function deleteStaff"),
  "team/actions.ts must export deleteStaff"
);
assert(
  teamActionsCode.includes("![\"SUPER_ADMIN\", \"ADMIN\"].includes(callerRole)"),
  "team/actions.ts delete actions must verify callerRole in ['SUPER_ADMIN', 'ADMIN']"
);
assert(
  teamActionsCode.includes("Akses ditolak: Hanya Administrator yang berwenang menghapus pengguna."),
  "team/actions.ts must reject unauthorized callers with exact error message"
);
assert(
  teamActionsCode.includes("currentUser.id === validId") || teamActionsCode.includes("userId === currentUser.id"),
  "team/actions.ts must prevent self-deletion"
);

const settingsTeamActionsPath = path.resolve(process.cwd(), "app/(dashboard)/settings/team/actions.ts");
assert(fs.existsSync(settingsTeamActionsPath), "app/(dashboard)/settings/team/actions.ts must exist");
const settingsTeamActionsCode = fs.readFileSync(settingsTeamActionsPath, "utf-8");
assert(
  settingsTeamActionsCode.includes('@/app/(dashboard)/team/actions'),
  "settings/team/actions.ts must re-export from team/actions.ts"
);

console.log("   ✓ team/actions.ts and settings/team/actions.ts enforce strict deletion guards.");

// --- 6. Server Action Guards in settings/rbac/actions.ts ---
console.log("\n6. Verifying Server Action Authorization Guards in settings/rbac/actions.ts...");

const rbacActionsPath = path.resolve(process.cwd(), "app/(dashboard)/settings/rbac/actions.ts");
const rbacActionsCode = fs.readFileSync(rbacActionsPath, "utf-8");

assert(
  rbacActionsCode.includes("export async function deleteUser"),
  "rbac/actions.ts must export deleteUser action"
);
assert(
  rbacActionsCode.includes("export const deleteStaff = deleteUser;"),
  "rbac/actions.ts must export deleteStaff alias"
);
assert(
  rbacActionsCode.includes("![\"SUPER_ADMIN\", \"ADMIN\"].includes(callerRole)"),
  "deleteUser must check callerRole against ['SUPER_ADMIN', 'ADMIN']"
);
assert(
  rbacActionsCode.includes("Akses ditolak: Hanya Administrator yang berwenang menghapus pengguna."),
  "deleteUser must reject non-admins with exact error message"
);
assert(
  rbacActionsCode.includes("currentUser.id === userId"),
  "deleteUser must prevent self-deletion"
);
assert(
  rbacActionsCode.includes('targetProfile?.email?.toLowerCase() === "admin@xenoent.com"'),
  "deleteUser must protect root admin account"
);

console.log("   ✓ settings/rbac/actions.ts enforces role authorization, self-delete prevention, and root admin protection.");

console.log("\n===============================================================");
console.log("🎉 ALL USER DELETION ROLE GUARD TESTS PASSED SUCCESSFULLY! 🚀");
console.log("===============================================================");
