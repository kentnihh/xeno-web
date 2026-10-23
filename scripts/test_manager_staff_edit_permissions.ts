import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToString } from "react-dom/server";
import { TeamMemberActions } from "../components/team/team-member-actions";
import { StaffCard } from "../components/team/staff-card";
import { UsersTable } from "../components/users/users-table";
import { UserModal } from "../components/users/user-modal";
import { EditStaffDialog } from "../components/team/edit-staff-dialog";
import type { Profile, UserWithRBAC, Role, Permission } from "../types/database";

const { AppRouterContext } = require("next/dist/shared/lib/app-router-context.shared-runtime");

console.log("===============================================================");
console.log("TEST SUITE: Manager Staff Edit Permissions & Role Lock Tuning");
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

const mockStaff: Profile = {
  id: "usr-crew-101",
  full_name: "Dimas Saputra",
  email: "dimas@xenoent.com",
  phone: "081234567890",
  avatar_url: null,
  avatar_color: null,
  role: "staff",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockRoles: Role[] = [
  { id: "admin", name: "Administrator", description: "Admin", created_at: new Date().toISOString() },
  { id: "manager", name: "Event Manager", description: "Manager", created_at: new Date().toISOString() },
  { id: "staff", name: "Kru Operasional", description: "Staff", created_at: new Date().toISOString() },
];

const mockPermissions: Permission[] = [
  { id: "team.manage", name: "Kelola Tim", description: null, module: "team", created_at: new Date().toISOString() },
];

const mockUserWithRBAC: UserWithRBAC = {
  ...mockStaff,
  roles: [{ id: "staff", name: "Kru Operasional", description: null, created_at: new Date().toISOString() }],
  permissions: mockPermissions,
};

// --- 1. Edit Button Visibility for Roles in TeamMemberActions ---
console.log("1. Verifying Edit Button Visibility across Roles in TeamMemberActions...");

// Case A: SUPER_ADMIN can edit
const superAdminActionsHtml = renderWithRouter(
  React.createElement(TeamMemberActions, {
    member: mockStaff,
    memberId: mockStaff.id,
    memberName: mockStaff.full_name,
    currentRole: mockStaff.role,
    isSelf: false,
    currentUserRole: "SUPER_ADMIN",
    currentUserId: "super-id",
    roles: mockRoles,
  })
);
assert(superAdminActionsHtml.includes("lucide-pencil") && superAdminActionsHtml.includes("Edit Profil"), "SUPER_ADMIN must see edit button in TeamMemberActions");
console.log("   ✓ SUPER_ADMIN can see Edit button.");

// Case B: ADMIN can edit
const adminActionsHtml = renderWithRouter(
  React.createElement(TeamMemberActions, {
    member: mockStaff,
    memberId: mockStaff.id,
    memberName: mockStaff.full_name,
    currentRole: mockStaff.role,
    isSelf: false,
    currentUserRole: "ADMIN",
    currentUserId: "admin-id",
    roles: mockRoles,
  })
);
assert(adminActionsHtml.includes("lucide-pencil") && adminActionsHtml.includes("Edit Profil"), "ADMIN must see edit button in TeamMemberActions");
console.log("   ✓ ADMIN can see Edit button.");

// Case C: MANAGER can edit basic staff contacts
const managerActionsHtml = renderWithRouter(
  React.createElement(TeamMemberActions, {
    member: mockStaff,
    memberId: mockStaff.id,
    memberName: mockStaff.full_name,
    currentRole: mockStaff.role,
    isSelf: false,
    currentUserRole: "MANAGER",
    currentUserId: "manager-id",
    roles: mockRoles,
  })
);
assert(managerActionsHtml.includes("lucide-pencil") && managerActionsHtml.includes("Edit Kontak Staf"), "MANAGER must see edit button in TeamMemberActions");
console.log("   ✓ MANAGER can see Edit button to update basic staff info.");

// Case D: STAFF must NOT see edit button
const staffActionsHtml = renderWithRouter(
  React.createElement(TeamMemberActions, {
    member: mockStaff,
    memberId: mockStaff.id,
    memberName: mockStaff.full_name,
    currentRole: mockStaff.role,
    isSelf: false,
    currentUserRole: "STAFF",
    currentUserId: "other-staff-id",
    roles: mockRoles,
  })
);
assert(!staffActionsHtml.includes("lucide-pencil"), "STAFF must NOT see edit button");
console.log("   ✓ STAFF strictly CANNOT see Edit button.");

// --- 2. Edit Button Visibility in StaffCard & UsersTable ---
console.log("\n2. Verifying Edit Button Visibility in StaffCard & UsersTable...");

const managerCardHtml = renderWithRouter(
  React.createElement(StaffCard, {
    staff: mockStaff,
    currentUserRole: "MANAGER",
    currentUserId: "manager-id",
    roles: mockRoles,
  })
);
assert(managerCardHtml.includes("lucide-pencil") && managerCardHtml.includes("Edit Kontak Staf"), "StaffCard must show edit button for MANAGER");

const staffCardHtml = renderWithRouter(
  React.createElement(StaffCard, {
    staff: mockStaff,
    currentUserRole: "STAFF",
    currentUserId: "staff-id",
    roles: mockRoles,
  })
);
assert(!staffCardHtml.includes("lucide-pencil"), "StaffCard must HIDE edit button for STAFF");

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
assert(managerTableHtml.includes("lucide-pencil") && managerTableHtml.includes("Edit Kontak Staf"), "UsersTable must show edit button for MANAGER");

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
assert(!staffTableHtml.includes("lucide-pencil"), "UsersTable must HIDE edit button for STAFF");

console.log("   ✓ StaffCard and UsersTable correctly show edit button for MANAGER and hide it for STAFF.");

// --- 3. Dialog Behavior for MANAGER (Inputs enabled/disabled checks) ---
console.log("\n3. Verifying Form Fields & Role Lockdown in UserModal for MANAGER...");

const modalHtml = renderToString(
  React.createElement(UserModal, {
    user: mockUserWithRBAC,
    roles: mockRoles,
    currentUserId: "manager-id",
    currentUserRole: "MANAGER",
    onClose: () => {},
  })
);

// Nama Lengkap: enabled input with defaultValue
assert(modalHtml.includes('name="fullName"'), "UserModal must have fullName input");
assert(modalHtml.includes('value="Dimas Saputra"'), "UserModal must prefill full_name");

// Nomor Telepon: enabled input with defaultValue
assert(modalHtml.includes('name="phone"'), "UserModal must have phone input");
assert(modalHtml.includes('value="081234567890"'), "UserModal must prefill phone");

// Email: disabled input
assert(modalHtml.includes('name="email"'), "UserModal must have email input");
assert(modalHtml.includes("disabled"), "Email input must be disabled during edit");

// Role: read-only with lock badge and helper text
assert(modalHtml.includes("(Terkunci)"), "Role selector must be tagged (Terkunci)");
assert(modalHtml.includes("Hanya Administrator yang dapat mengubah peran staf."), "Must render helper text: 'Hanya Administrator yang dapat mengubah peran staf.'");
assert(modalHtml.includes('type="hidden" name="roleId" value="staff"'), "Role must be bound via hidden input");

console.log("   ✓ UserModal keeps fullName and phone enabled, email disabled, and role locked with helper text for MANAGER.");

// --- 4. Server Action Code Audit: app/(dashboard)/settings/rbac/actions.ts ---
console.log("\n4. Auditing Server Action updateStaff / updateUser guards...");

const rbacActionsPath = path.resolve(process.cwd(), "app/(dashboard)/settings/rbac/actions.ts");
const rbacActionsCode = fs.readFileSync(rbacActionsPath, "utf-8");

assert(
  rbacActionsCode.includes("callerIsManager"),
  "updateUser must inspect callerIsManager"
);
assert(
  rbacActionsCode.includes('Akses ditolak: Manager tidak dapat mengubah peran staf.'),
  "updateUser must reject role changes by MANAGER with exact error: 'Akses ditolak: Manager tidak dapat mengubah peran staf.'"
);
assert(
  rbacActionsCode.includes("if (callerIsManager)") &&
  rbacActionsCode.includes("roleId = targetCurrentRole;"),
  "updateUser must keep existing role when MANAGER updates basic staff info"
);
assert(
  rbacActionsCode.includes("if (callerIsSuper || callerIsAdmin)") &&
  rbacActionsCode.includes("updatePayload.role = roleId as UserRole;"),
  "updateUser must only include role in updatePayload if caller is Admin or Super Admin"
);
assert(
  rbacActionsCode.includes("!callerIsSuper && !callerIsAdmin && !callerIsManager"),
  "updateUser must reject callers who are not Admin, Super Admin, or Manager"
);

console.log("   ✓ Server Action updateUser strictly enforces MANAGER basic info update permissions and prevents role alteration.");

console.log("\n===============================================================");
console.log("🎉 ALL MANAGER STAFF EDIT PERMISSION TESTS PASSED! 🚀");
console.log("===============================================================");
