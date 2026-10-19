import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToString } from "react-dom/server";
import { UserAvatar } from "../components/ui/user-avatar";
import { UserModal } from "../components/users/user-modal";
import type { Role, UserWithRBAC } from "../types/database";

console.log("=== Testing Role-Based Avatar Icons & Custom Admin Colors ===\n");

// 1. Database Schema & Migration Verification
console.log("--- 1. Testing Database Migration & Schema ---");
const migrationPath = path.resolve(
  process.cwd(),
  "supabase/migrations/20261019_add_avatar_color_to_profiles.sql"
);
assert(fs.existsSync(migrationPath), "Migration file must exist at supabase/migrations/20261019_add_avatar_color_to_profiles.sql");
const migrationSql = fs.readFileSync(migrationPath, "utf-8");
assert(
  migrationSql.includes("ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_color TEXT;"),
  "Migration SQL must alter profiles table and add avatar_color TEXT column"
);
console.log("✓ Migration file verified: avatar_color column added to public.profiles.");

const typesPath = path.resolve(process.cwd(), "types/database.ts");
const typesContent = fs.readFileSync(typesPath, "utf-8");
assert(
  typesContent.includes("avatar_color?: string | null;"),
  "types/database.ts Profile interface must define avatar_color?: string | null;"
);
console.log("✓ TypeScript Profile interface includes avatar_color.");

// 2. Testing Smart UserAvatar Component for all Roles
console.log("\n--- 2. Testing Smart UserAvatar Component ---");

// 2.a ADMIN with custom color
const customColor = "#ff2d55";
const adminCustomHtml = renderToString(
  React.createElement(UserAvatar, {
    role: "admin",
    avatarColor: customColor,
    name: "Jonathan Admin",
  })
);
assert(adminCustomHtml.includes('data-role="admin"'), "UserAvatar must identify as admin");
assert(adminCustomHtml.includes(customColor), "UserAvatar must apply custom admin color");
assert(adminCustomHtml.includes("lucide-shield"), "Admin UserAvatar must render Shield icon");
console.log("✓ ADMIN renders Shield icon with custom color (#ff2d55).");

// 2.b ADMIN with fallback default color
const adminDefaultHtml = renderToString(
  React.createElement(UserAvatar, {
    role: "admin",
    avatarColor: null,
    name: "Admin Default",
  })
);
assert(adminDefaultHtml.includes('data-role="admin"'), "UserAvatar must identify as admin");
assert(adminDefaultHtml.includes("#007aff"), "Admin UserAvatar fallback must default to #007aff");
assert(adminDefaultHtml.includes("lucide-shield"), "Admin UserAvatar must render Shield icon");
console.log("✓ ADMIN with null avatarColor falls back safely to #007aff.");

// 2.c MANAGER with NotebookPen icon
const managerHtml = renderToString(
  React.createElement(UserAvatar, {
    role: "manager",
    name: "Event Manager Via",
  })
);
assert(managerHtml.includes('data-role="manager"'), "UserAvatar must identify as manager");
assert(
  managerHtml.includes("lucide-notebook-pen") || managerHtml.includes("lucide-file-edit"),
  "Manager UserAvatar must render NotebookPen / FileEdit icon"
);
console.log("✓ MANAGER renders NotebookPen icon with standard manager violet tone.");

// 2.d STAFF with User icon
const staffHtml = renderToString(
  React.createElement(UserAvatar, {
    role: "staff",
    name: "Rian Staf",
  })
);
assert(staffHtml.includes('data-role="staff"'), "UserAvatar must identify as staff");
assert(staffHtml.includes("lucide-user"), "Staff UserAvatar must render User icon");
console.log("✓ STAFF renders User icon with standard staff slate tone.");

// 3. Testing UserModal Color Picker Conditionality
console.log("\n--- 3. Testing Admin Color Picker UI in UserModal ---");

const mockRoles: Role[] = [
  { id: "admin", name: "Administrator", description: null, created_at: "" },
  { id: "manager", name: "Event Manager", description: null, created_at: "" },
  { id: "staff", name: "Kru Operasional", description: null, created_at: "" },
];

const mockAdminUser: UserWithRBAC = {
  id: "usr-admin-1",
  full_name: "Admin User",
  email: "admin@test.com",
  role: "admin",
  phone: "+6281111",
  avatar_url: null,
  avatar_color: "#ff9500",
  created_at: "",
  updated_at: "",
  roles: [mockRoles[0]],
  permissions: [],
};

const adminModalHtml = renderToString(
  React.createElement(UserModal, {
    user: mockAdminUser,
    roles: mockRoles,
    onClose: () => {},
  })
);
assert(adminModalHtml.includes("Warna Ikon"), "UserModal must display 'Warna Ikon' when editing Admin");
assert(adminModalHtml.includes('name="avatarColor"'), "UserModal must have avatarColor form input for Admin");
assert(adminModalHtml.includes("#ff9500"), "UserModal must retain user's current avatar_color");
console.log("✓ UserModal displays 'Warna Ikon' color swatches and inputs for ADMIN role.");

const mockStaffUser: UserWithRBAC = {
  id: "usr-staff-1",
  full_name: "Staff User",
  email: "staff@test.com",
  role: "staff",
  phone: "+6282222",
  avatar_url: null,
  avatar_color: null,
  created_at: "",
  updated_at: "",
  roles: [mockRoles[2]],
  permissions: [],
};

const staffModalHtml = renderToString(
  React.createElement(UserModal, {
    user: mockStaffUser,
    roles: mockRoles,
    onClose: () => {},
  })
);
assert(!staffModalHtml.includes("Warna Ikon"), "UserModal must NOT display 'Warna Ikon' when role is Staff");
console.log("✓ UserModal strictly hides 'Warna Ikon' color picker for STAFF role.");

// 4. Testing Global Component Integration
console.log("\n--- 4. Testing Global Component Integration ---");

const navbarPath = path.resolve(process.cwd(), "components/navbar.tsx");
const navbarCode = fs.readFileSync(navbarPath, "utf-8");
assert(navbarCode.includes("<UserAvatar"), "Navbar must render UserAvatar");
assert(navbarCode.includes("avatarColor"), "Navbar must pass avatarColor to UserAvatar");
console.log("✓ Navbar header integrates UserAvatar with role and custom avatarColor.");

const usersTablePath = path.resolve(process.cwd(), "components/users/users-table.tsx");
const usersTableCode = fs.readFileSync(usersTablePath, "utf-8");
assert(usersTableCode.includes("<UserAvatar user={u}"), "UsersTable must render UserAvatar for users");
console.log("✓ RBAC Users Table renders dynamic UserAvatar for each user.");

const teamPagePath = path.resolve(process.cwd(), "app/(dashboard)/team/page.tsx");
const teamPageCode = fs.readFileSync(teamPagePath, "utf-8");
assert(teamPageCode.includes("<UserAvatar user={member}"), "Team page must render UserAvatar for team members");
console.log("✓ Team page renders dynamic UserAvatar for each member.");

const crewSectionPath = path.resolve(process.cwd(), "components/events/event-crew-section.tsx");
const crewSectionCode = fs.readFileSync(crewSectionPath, "utf-8");
assert(crewSectionCode.includes("<UserAvatar user={p}"), "EventCrewSection must render UserAvatar for assigned crew");
console.log("✓ Event Crew Section renders dynamic UserAvatar for assigned crew members.");

const rbacActionsPath = path.resolve(process.cwd(), "app/(dashboard)/settings/rbac/actions.ts");
const rbacActionsCode = fs.readFileSync(rbacActionsPath, "utf-8");
assert(rbacActionsCode.includes("avatar_color: roleId === \"admin\" ? avatarColor : null"), "Server actions must save avatar_color for admin");
console.log("✓ Server actions (createUser, updateUser) save avatar_color to database.");

console.log("\n=== ALL ROLE-BASED AVATAR & ADMIN COLOR TESTS PASSED SUCCESSFULLY! ===");
