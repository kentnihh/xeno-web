import assert from "assert";
import { isSuperAdminRole } from "../lib/auth";

async function runTests() {
  console.log("=== Testing Super Admin Role & Impersonation Logic ===");

  // 1. Test isSuperAdminRole normalization
  console.log("\n1. Testing isSuperAdminRole...");
  assert.strictEqual(isSuperAdminRole("super_admin"), true);
  assert.strictEqual(isSuperAdminRole("SUPER_ADMIN"), true);
  assert.strictEqual(isSuperAdminRole("Super_Admin"), true);
  assert.strictEqual(isSuperAdminRole("superadmin"), true);
  assert.strictEqual(isSuperAdminRole("SUPERADMIN"), true);
  assert.strictEqual(isSuperAdminRole("admin"), false);
  assert.strictEqual(isSuperAdminRole("manager"), false);
  assert.strictEqual(isSuperAdminRole("staff"), false);
  assert.strictEqual(isSuperAdminRole(null), false);
  assert.strictEqual(isSuperAdminRole(undefined), false);
  console.log("   ✓ Role detection passed.");

  // 2. Test Fallback Roles (Only manageable operational roles: admin, manager, staff)
  console.log("\n2. Testing Fallback Roles...");
  const { FALLBACK_ROLES, FALLBACK_USERS } = await import("../lib/rbac-fallbacks");
  const superAdminRole = FALLBACK_ROLES.find((r) => r.id === "super_admin" || r.id === "SUPER_ADMIN");
  assert.strictEqual(superAdminRole, undefined, "super_admin must NOT be in FALLBACK_ROLES (only operational roles: admin, manager, staff)");
  assert.strictEqual(FALLBACK_ROLES.length, 3, "FALLBACK_ROLES must strictly contain 3 operational roles");

  const jonathanUser = FALLBACK_USERS.find((u) => u.email === "admin@xenoent.com");
  assert(jonathanUser, "Jonathan user must exist in FALLBACK_USERS");
  assert.strictEqual(jonathanUser.role, "SUPER_ADMIN");
  console.log("   ✓ Fallback roles strictly contain 3 operational roles, and admin@xenoent.com holds SUPER_ADMIN.");

  // 3. Test Database Migration SQL file & Seed scripts
  console.log("\n3. Testing Database Migration Syntax & Explicit Assignment...");
  const fs = await import("fs");
  const migrationPath = "supabase/migrations/20261022_add_super_admin_role_and_impersonation.sql";
  assert(fs.existsSync(migrationPath), "Migration file must exist on disk");
  const migrationSql = fs.readFileSync(migrationPath, "utf-8");
  assert(migrationSql.includes("ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'super_admin'"), "Must alter enum user_role");
  assert(migrationSql.includes("ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'SUPER_ADMIN'"), "Must alter enum user_role for uppercase");
  assert(migrationSql.includes("INSERT INTO public.roles"), "Must insert super_admin into roles");
  assert(migrationSql.includes("UPDATE profiles\nSET role = 'SUPER_ADMIN'\nWHERE email = 'admin@xenoent.com';"), "Must explicitly assign SUPER_ADMIN to admin@xenoent.com");
  assert(migrationSql.includes("public.is_admin()"), "Must update is_admin() function");
  assert(migrationSql.includes("public.is_super_admin()"), "Must create is_super_admin() function");
  console.log("   ✓ Migration file contains explicit UPDATE for admin@xenoent.com as SUPER_ADMIN.");

  console.log("\n3b. Verifying Seeding Files...");
  const seedSql = fs.readFileSync("supabase/seed.sql", "utf-8");
  assert(seedSql.includes("'SUPER_ADMIN'::user_role"), "seed.sql must assign SUPER_ADMIN");

  const seedTs = fs.readFileSync("scripts/seed-database.ts", "utf-8");
  assert(seedTs.includes('email: "admin@xenoent.com"') && seedTs.includes('role: "SUPER_ADMIN"'), "seed-database.ts must assign SUPER_ADMIN to admin@xenoent.com");

  const seedPy = fs.readFileSync("scripts/seed_database.py", "utf-8");
  assert(seedPy.includes('"email": "admin@xenoent.com"') && seedPy.includes('"role": "SUPER_ADMIN"'), "seed_database.py must assign SUPER_ADMIN to admin@xenoent.com");
  console.log("   ✓ seed.sql, seed-database.ts, and seed_database.py properly assign SUPER_ADMIN to admin@xenoent.com.");

  console.log("\n3c. Verifying RBAC Cleanup Migration...");
  const cleanupMigrationPath = "supabase/migrations/20261023_cleanup_super_admin_roles.sql";
  assert(fs.existsSync(cleanupMigrationPath), "Cleanup migration file must exist");
  const cleanupSql = fs.readFileSync(cleanupMigrationPath, "utf-8");
  assert(cleanupSql.includes("DELETE FROM public.roles"), "Must delete SUPER_ADMIN from roles table");
  assert(cleanupSql.includes("DELETE FROM public.role_permissions"), "Must clean role_permissions");
  assert(cleanupSql.includes("UPDATE public.profiles \nSET role = 'SUPER_ADMIN'"), "Must preserve admin@xenoent.com as SUPER_ADMIN");
  console.log("   ✓ RBAC cleanup migration verified.");

  // 4. Test Types
  console.log("\n4. Testing TypeScript UserRole Type...");
  const typesContent = fs.readFileSync("types/database.ts", "utf-8");
  assert(typesContent.includes("'super_admin'"), "UserRole must include 'super_admin'");
  assert(typesContent.includes("'SUPER_ADMIN'"), "UserRole must include 'SUPER_ADMIN'");
  console.log("   ✓ UserRole type definitions verified.");

  // 5. Test Server Actions exports
  console.log("\n5. Testing Impersonate Server Actions File...");
  const actionFile = fs.readFileSync("app/actions/impersonate.ts", "utf-8");
  assert(actionFile.includes("export async function impersonateUser"), "Must export impersonateUser");
  assert(actionFile.includes("export async function stopImpersonating"), "Must export stopImpersonating");
  assert(actionFile.includes("isRealSuperAdmin"), "Must check isRealSuperAdmin");
  assert(actionFile.includes("x-impersonate-user-id"), "Must set x-impersonate-user-id cookie");
  assert(actionFile.includes("cookieStore.delete(\"x-impersonate-user-id\")"), "Must delete cookie on stopImpersonating");
  console.log("   ✓ impersonateUser and stopImpersonating server actions successfully verified.");

  // 6. Test Sticky Impersonation Banner
  console.log("\n6. Testing Impersonation Banner Component...");
  const bannerContent = fs.readFileSync("components/impersonation-banner.tsx", "utf-8");
  assert(bannerContent.includes("stopImpersonating"), "Banner must call stopImpersonating");
  assert(bannerContent.includes("Mode Impersonasi"), "Banner must display 'Mode Impersonasi'");
  assert(bannerContent.includes("Kembali ke Akun Super Admin"), "Banner must have button 'Kembali ke Akun Super Admin'");
  console.log("   ✓ Sticky Impersonation Alert Banner verified.");

  // 7. Test Impersonate Page & View
  console.log("\n7. Testing Impersonate View & Navigation...");
  const pageContent = fs.readFileSync("app/(dashboard)/settings/impersonate/page.tsx", "utf-8");
  assert(pageContent.includes("isRealSuperAdmin"), "Page must enforce isRealSuperAdmin guard");
  const viewContent = fs.readFileSync("components/impersonate/impersonate-view.tsx", "utf-8");
  assert(viewContent.includes("Combobox"), "View must render Combobox");
  assert(viewContent.includes("Masuk sebagai User Ini"), "View must have 'Masuk sebagai User Ini' button");
  const sidebarContent = fs.readFileSync("components/sidebar.tsx", "utf-8");
  assert(sidebarContent.includes("isSuperAdmin"), "Sidebar must support isSuperAdmin prop");
  assert(sidebarContent.includes("/settings/impersonate"), "Sidebar must link to /settings/impersonate");
  console.log("   ✓ Impersonate View and Sidebar navigation verified.");

  // 8. Test RoleBadge and SUPER_ADMIN visual styling
  console.log("\n8. Testing RoleBadge Component & Visual Enhancements...");
  const roleBadgePath = "components/ui/role-badge.tsx";
  assert(fs.existsSync(roleBadgePath), "RoleBadge component must exist");
  const roleBadgeContent = fs.readFileSync(roleBadgePath, "utf-8");
  assert(roleBadgeContent.includes("SUPER ADMIN"), "RoleBadge must render 'SUPER ADMIN'");
  assert(roleBadgeContent.includes("Crown"), "RoleBadge must use Crown icon for SUPER ADMIN");
  assert(roleBadgeContent.includes("amber"), "RoleBadge must feature gold/amber accent for SUPER ADMIN");

  const navbarContent = fs.readFileSync("components/navbar.tsx", "utf-8");
  assert(navbarContent.includes("<RoleBadge role={userRole}"), "Navbar must render RoleBadge for user role");

  const teamPageContent = fs.readFileSync("app/(dashboard)/team/page.tsx", "utf-8");
  assert(teamPageContent.includes("<RoleBadge role={member.role}"), "Team page must render RoleBadge");

  const usersTableContent = fs.readFileSync("components/users/users-table.tsx", "utf-8");
  assert(usersTableContent.includes("<RoleBadge role={u.roles?.[0]?.id || u.role}"), "RBAC UsersTable must render RoleBadge");

  const avatarContent = fs.readFileSync("components/ui/user-avatar.tsx", "utf-8");
  assert(avatarContent.includes("SUPER_ADMIN_DEFAULT_COLOR = \"#f59e0b\""), "UserAvatar must default SUPER_ADMIN to golden amber #f59e0b");
  console.log("   ✓ RoleBadge component and SUPER_ADMIN styling verified across Navbar, Team, RBAC, and Avatars.");

  console.log("\n✅ ALL SUPER ADMIN & IMPERSONATION CHECKS PASSED SUCCESSFULLY!\n");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
