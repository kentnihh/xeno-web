import assert from "node:assert";
import * as fs from "node:fs";
import * as path from "node:path";
import { isSuperAdminRole } from "../lib/auth";

async function runTests() {
  console.log("===============================================================");
  console.log("TEST SUITE: Privilege Escalation & Self-Role Elevation Guards");
  console.log("===============================================================");

  // ---------------------------------------------------------------------------
  // 1. Database-Level Trigger Definitions & Canonical Schema
  // ---------------------------------------------------------------------------
  console.log("\n1. Verifying Database Migration & Canonical Schema Triggers...");
  const migrationPath = path.resolve(process.cwd(), "supabase/migrations/20261024_prevent_role_escalation.sql");
  assert(fs.existsSync(migrationPath), "Migration file 20261024_prevent_role_escalation.sql must exist.");
  const migrationSql = fs.readFileSync(migrationPath, "utf-8");

  const schemaPath = path.resolve(process.cwd(), "supabase/schema.sql");
  assert(fs.existsSync(schemaPath), "Canonical schema supabase/schema.sql must exist.");
  const schemaSql = fs.readFileSync(schemaPath, "utf-8");

  for (const [name, content] of [["Migration", migrationSql], ["Schema", schemaSql]] as const) {
    // Check function & trigger on profiles
    assert(
      content.includes("prevent_self_role_escalation()"),
      `${name} must define prevent_self_role_escalation() function.`
    );
    assert(
      content.includes("trg_prevent_role_escalation"),
      `${name} must define trg_prevent_role_escalation trigger on public.profiles.`
    );
    assert(
      content.includes("BEFORE UPDATE ON public.profiles") || content.includes("before update on public.profiles"),
      `${name} must bind trigger BEFORE UPDATE on public.profiles.`
    );
    assert(
      content.includes("jwt_role = 'service_role'") || content.includes("jwt_role = 'service_role'"),
      `${name} must permit service_role bypass for automated backend maintenance.`
    );
    assert(
      content.includes("IF NEW.id = auth.uid() THEN") || content.includes("if NEW.id = auth.uid() then"),
      `${name} must reject self-role modification when auth.uid() = id.`
    );
    assert(
      content.includes("Anda tidak dapat mengubah peran akun Anda sendiri"),
      `${name} must return clear Indonesian error message on self-role modification.`
    );
    assert(
      content.includes("NOT IN ('SUPER_ADMIN', 'ADMIN')") || content.includes("not in ('SUPER_ADMIN', 'ADMIN')"),
      `${name} must reject non-admin/manager callers from modifying roles.`
    );

    // Check function & trigger on user_roles
    assert(
      content.includes("prevent_user_roles_escalation()"),
      `${name} must define prevent_user_roles_escalation() function.`
    );
    assert(
      content.includes("trg_prevent_user_roles_escalation"),
      `${name} must define trg_prevent_user_roles_escalation trigger on public.user_roles.`
    );
    assert(
      content.includes("BEFORE INSERT OR UPDATE ON public.user_roles") || content.includes("before insert or update on public.user_roles"),
      `${name} must bind trigger BEFORE INSERT OR UPDATE on public.user_roles.`
    );
    assert(
      content.includes("IF NEW.user_id = auth.uid() THEN") || content.includes("if NEW.user_id = auth.uid() then"),
      `${name} must reject self-role assignment when auth.uid() = user_id.`
    );
  }
  console.log("   ✓ Database triggers verified in migration and canonical schema.");

  // ---------------------------------------------------------------------------
  // 2. Server Action Guards (RBAC & Team Actions)
  // ---------------------------------------------------------------------------
  console.log("\n2. Verifying Server Action Guards in app/(dashboard)/settings/rbac/actions.ts...");
  const rbacActionsPath = path.resolve(process.cwd(), "app/(dashboard)/settings/rbac/actions.ts");
  const rbacActionsCode = fs.readFileSync(rbacActionsPath, "utf-8");

  // updateUserRole
  assert(rbacActionsCode.includes("export async function updateUserRole("), "Must export updateUserRole action.");
  assert(rbacActionsCode.includes('await requirePermission("rbac.manage");'), "updateUserRole must require rbac.manage.");
  assert(
    rbacActionsCode.includes("if (userId === currentUser.id)") &&
    rbacActionsCode.includes('return { error: "Anda tidak dapat mengubah peran akun Anda sendiri." };'),
    "updateUserRole must block users from changing their own role."
  );
  assert(
    rbacActionsCode.includes("if (!callerIsSuper && !callerIsAdmin)"),
    "updateUserRole must check that caller is SUPER_ADMIN or ADMIN."
  );
  assert(
    rbacActionsCode.includes("if (isSuperAdminRole(newRole) && !callerIsSuper)"),
    "updateUserRole must prevent standard ADMIN from assigning SUPER_ADMIN."
  );
  assert(
    rbacActionsCode.includes("if (targetProfile && isSuperAdminRole(targetProfile.role) && !callerIsSuper)"),
    "updateUserRole must prevent standard ADMIN from modifying a SUPER_ADMIN account."
  );

  // updateUser
  assert(rbacActionsCode.includes("export async function updateUser("), "Must export updateUser action.");
  assert(
    rbacActionsCode.includes("if (targetProfile && targetProfile.role.toLowerCase() !== roleId.toLowerCase())") &&
    rbacActionsCode.includes('return { error: "Anda tidak dapat mengubah peran akun Anda sendiri." };'),
    "updateUser must reject self-role modification."
  );

  // createUser
  assert(rbacActionsCode.includes("export async function createUser("), "Must export createUser action.");
  assert(
    rbacActionsCode.includes("const callerIsSuper = await isSuperAdmin(currentUser.id);") &&
    rbacActionsCode.includes("const callerIsAdmin = await isAdmin(currentUser.id);"),
    "createUser must enforce role hierarchy check on caller."
  );

  // deleteUser
  assert(rbacActionsCode.includes("export async function deleteUser("), "Must export deleteUser action.");
  assert(
    rbacActionsCode.includes("if (currentUser.id === userId)"),
    "deleteUser must reject self-deletion."
  );
  console.log("   ✓ RBAC actions enforce strict permissions, self-role blocks, and role hierarchy.");

  console.log("\n3. Verifying Server Action Guards in app/(dashboard)/team/actions.ts...");
  const teamActionsPath = path.resolve(process.cwd(), "app/(dashboard)/team/actions.ts");
  const teamActionsCode = fs.readFileSync(teamActionsPath, "utf-8");

  // updateMemberRoleAction
  assert(teamActionsCode.includes("export async function updateMemberRoleAction("), "Must export updateMemberRoleAction.");
  assert(
    teamActionsCode.includes('await requirePermission("rbac.manage");'),
    "updateMemberRoleAction must require rbac.manage (NOT team.manage)."
  );
  assert(
    teamActionsCode.includes("if (validated.userId === currentUser.id)") &&
    teamActionsCode.includes('return { success: false, error: "Anda tidak dapat mengubah peran akun Anda sendiri." };'),
    "updateMemberRoleAction must block users from changing their own role."
  );
  assert(
    teamActionsCode.includes("if (!callerIsSuper && !callerIsAdmin)") &&
    teamActionsCode.includes("Akses ditolak: Hanya Super Admin dan Administrator yang dapat mengelola peran pengguna."),
    "updateMemberRoleAction must strictly prevent MANAGER and STAFF from updating roles."
  );
  assert(
    teamActionsCode.includes("if (isSuperAdminRole(validated.newRole) && !callerIsSuper)"),
    "updateMemberRoleAction must prevent standard ADMIN from assigning SUPER_ADMIN."
  );

  // deleteMemberAction
  assert(teamActionsCode.includes("export async function deleteMemberAction("), "Must export deleteMemberAction.");
  assert(
    teamActionsCode.includes("if (currentUser.id === validId)"),
    "deleteMemberAction must prevent self-deletion."
  );
  assert(
    teamActionsCode.includes("if (!callerIsSuper && !callerIsAdmin)"),
    "deleteMemberAction must restrict user deletion to SUPER_ADMIN and ADMIN."
  );
  console.log("   ✓ Team actions enforce rbac.manage, self-role protection, and role hierarchy.");

  // ---------------------------------------------------------------------------
  // 3. UI Layer Guards (Team & Users Settings)
  // ---------------------------------------------------------------------------
  console.log("\n4. Verifying UI Layer Protections...");
  
  // TeamMemberActions
  const teamMemberActionsPath = path.resolve(process.cwd(), "components/team/team-member-actions.tsx");
  const teamMemberActionsCode = fs.readFileSync(teamMemberActionsPath, "utf-8");
  assert(
    !teamMemberActionsCode.includes("<select"),
    "TeamMemberActions must NOT render an inline quick role select dropdown."
  );
  assert(
    teamMemberActionsCode.includes("<UserModal"),
    "TeamMemberActions must use secure UserModal for role editing."
  );
  assert(
    teamMemberActionsCode.includes("<ConfirmModal"),
    "TeamMemberActions must render ConfirmModal for account deletion."
  );
  assert(
    teamMemberActionsCode.includes("canEditRole?: boolean;"),
    "TeamMemberActions must accept canEditRole prop."
  );

  // TeamPage
  const teamPagePath = path.resolve(process.cwd(), "app/(dashboard)/team/page.tsx");
  const teamPageCode = fs.readFileSync(teamPagePath, "utf-8");
  assert(
    teamPageCode.includes('hasPermission("rbac.manage")'),
    "TeamPage must check rbac.manage permission."
  );
  assert(
    teamPageCode.includes("canEditRole={canEditRoles}"),
    "TeamPage must pass canEditRoles to TeamMemberActions."
  );

  // UserModal
  const userModalPath = path.resolve(process.cwd(), "components/users/user-modal.tsx");
  const userModalCode = fs.readFileSync(userModalPath, "utf-8");
  assert(
    userModalCode.includes("const isSelf = Boolean(user && currentUserId && user.id === currentUserId);"),
    "UserModal must evaluate isSelf based on currentUserId."
  );
  assert(
    userModalCode.includes('Anda tidak dapat mengubah peran Anda sendiri.'),
    "UserModal must show badge and lock status when editing self."
  );
  assert(
    userModalCode.includes('<input type="hidden" name="roleId" value={roleId} />'),
    "UserModal must maintain hidden input with existing roleId when isSelf is true."
  );

  // UsersDialogHandler
  const usersDialogHandlerPath = path.resolve(process.cwd(), "components/users/users-dialog-handler.tsx");
  const usersDialogHandlerCode = fs.readFileSync(usersDialogHandlerPath, "utf-8");
  assert(
    usersDialogHandlerCode.includes("currentUserId"),
    "UsersDialogHandler must forward currentUserId to UserModal."
  );
  console.log("   ✓ UI layer properly hides and locks role controls with clear self-modification badges.");

  // ---------------------------------------------------------------------------
  // 4. Role Hierarchy & Super Admin Invariants
  // ---------------------------------------------------------------------------
  console.log("\n5. Verifying Role Hierarchy Invariants...");
  assert.strictEqual(isSuperAdminRole("super_admin"), true);
  assert.strictEqual(isSuperAdminRole("SUPER_ADMIN"), true);
  assert.strictEqual(isSuperAdminRole("admin"), false);
  assert.strictEqual(isSuperAdminRole("manager"), false);
  assert.strictEqual(isSuperAdminRole("staff"), false);
  console.log("   ✓ Role hierarchy invariant tests passed.");

  // ---------------------------------------------------------------------------
  // 5. Root Super Admin (admin@xenoent.com) Immutable Protection
  // ---------------------------------------------------------------------------
  console.log("\n6. Verifying Root Super Admin (admin@xenoent.com) Immutable Protections...");
  const rootMigrationPath = path.resolve(process.cwd(), "supabase/migrations/20261024_protect_root_admin.sql");
  assert(fs.existsSync(rootMigrationPath), "Migration 20261024_protect_root_admin.sql must exist.");
  const rootMigrationSql = fs.readFileSync(rootMigrationPath, "utf-8");

  assert(
    rootMigrationSql.includes("protect_root_admin_account()") &&
    schemaSql.includes("protect_root_admin_account()"),
    "Both migration and schema must define protect_root_admin_account() trigger function."
  );
  assert(
    rootMigrationSql.includes("trg_protect_root_admin") &&
    schemaSql.includes("trg_protect_root_admin"),
    "Both migration and schema must create trg_protect_root_admin trigger."
  );
  assert(
    rootMigrationSql.includes("OLD.email = 'admin@xenoent.com'") &&
    schemaSql.includes("OLD.email = 'admin@xenoent.com'"),
    "Trigger must specifically target OLD.email = 'admin@xenoent.com'."
  );
  assert(
    rootMigrationSql.includes("Akses ditolak: Akun root admin tidak dapat dihapus.") &&
    schemaSql.includes("Akses ditolak: Akun root admin tidak dapat dihapus."),
    "Trigger must reject deletion of root admin."
  );
  assert(
    rootMigrationSql.includes("Akses ditolak: Peran akun admin@xenoent.com dilindungi dan tidak dapat diubah oleh pengguna lain.") &&
    schemaSql.includes("Akses ditolak: Peran akun admin@xenoent.com dilindungi dan tidak dapat diubah oleh pengguna lain."),
    "Trigger must reject role modification of root admin by other users."
  );

  // Server Action guards for root admin
  assert(
    rbacActionsCode.includes('targetProfile?.email?.toLowerCase() === "admin@xenoent.com"') &&
    rbacActionsCode.includes('Peran akun admin@xenoent.com dilindungi sistem dan tidak dapat diubah.'),
    "updateUser & updateUserRole must protect admin@xenoent.com with exact error message."
  );
  assert(
    rbacActionsCode.includes('Akses ditolak: Akun root admin tidak dapat dihapus.'),
    "deleteUser must reject deleting admin@xenoent.com."
  );
  assert(
    teamActionsCode.includes('targetProfile?.email?.toLowerCase() === "admin@xenoent.com"') &&
    teamActionsCode.includes('Peran akun admin@xenoent.com dilindungi sistem dan tidak dapat diubah.'),
    "updateMemberRoleAction must protect admin@xenoent.com."
  );
  assert(
    teamActionsCode.includes('Akses ditolak: Akun root admin tidak dapat dihapus.'),
    "deleteMemberAction must reject deleting admin@xenoent.com."
  );

  // UI layer guards for root admin
  const usersTablePath = path.resolve(process.cwd(), "components/users/users-table.tsx");
  const usersTableCode = fs.readFileSync(usersTablePath, "utf-8");
  assert(
    usersTableCode.includes('u.email?.toLowerCase() === "admin@xenoent.com"'),
    "UsersTable must detect isRootAdmin."
  );
  assert(
    usersTableCode.includes('title="Akun Sistem Utama (Terkunci)"') ||
    usersTableCode.includes("Akun Sistem Utama (Terkunci)"),
    "UsersTable must display Akun Sistem Utama (Terkunci) lock badge."
  );
  assert(
    usersTableCode.includes("disabled={isRootAdmin && !isSelf}"),
    "UsersTable must disable edit button for root admin if not self."
  );
  assert(
    usersTableCode.includes("disabled={isSelf || isRootAdmin}"),
    "UsersTable must disable delete button for root admin."
  );

  assert(
    userModalCode.includes('user?.email?.toLowerCase() === "admin@xenoent.com"'),
    "UserModal must detect isRootAdmin."
  );
  assert(
    userModalCode.includes("disabled={isPending || (isRootAdmin && !isSelf)}"),
    "UserModal must disable submit button for root admin if not self."
  );

  assert(
    teamMemberActionsCode.includes("isRootAdmin?: boolean;"),
    "TeamMemberActions must support isRootAdmin prop."
  );
  assert(
    teamMemberActionsCode.includes("!isSelf && !isTargetRootAdmin"),
    "TeamMemberActions must hide delete button for root admin."
  );
  console.log("   ✓ Root Super Admin protections verified across Database, Server Actions, and UI.");

  console.log("\n===============================================================");
  console.log("ALL PRIVILEGE ESCALATION & SELF-ROLE GUARDS VERIFIED!");
  console.log("===============================================================");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
