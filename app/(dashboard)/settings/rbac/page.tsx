import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin, hasPermission, getCurrentUser, getCurrentProfile, isSuperAdmin, isSuperAdminRole } from "@/lib/auth";
import { getRolesCached, getPermissionsCached, getRolePermissionsCached } from "@/lib/data-cache";
import { UsersManagementView } from "@/components/users/users-management-view";
import type { UserWithRBAC, Role, Permission, RolePermission, Profile } from "@/types/database";

export default async function SettingsRBACPage() {
  const user = await getCurrentUser();
  const [isAdminUser, canRbacManage, canUsersManage, isSuperAdminUser] = await Promise.all([
    isAdmin(user?.id),
    hasPermission("rbac.manage", user?.id),
    hasPermission("users.manage", user?.id),
    isSuperAdmin(user?.id),
  ]);

  if (!isAdminUser && !canRbacManage && !canUsersManage && !isSuperAdminUser) {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  const [
    { data: rawProfiles },
    roles,
    permissions,
    rolePermissions,
    { data: rawUR },
  ] = await Promise.all([
    supabase.from("profiles").select("*").order("full_name"),
    getRolesCached(),
    getPermissionsCached(),
    getRolePermissionsCached(),
    supabase.from("user_roles").select("*"),
  ]);

  const profiles: Profile[] = rawProfiles || [];

  const usersWithRBAC: UserWithRBAC[] = profiles.map((p) => {
    const userRoleIds = (rawUR || []).filter((ur) => ur.user_id === p.id).map((ur) => ur.role_id);
    const assignedRoles = roles.filter((r) => userRoleIds.includes(r.id) || r.id === p.role);
    const activeRoleIds = assignedRoles.map((r) => r.id);
    const activePermIds = rolePermissions.filter((rp) => activeRoleIds.includes(rp.role_id)).map((rp) => rp.permission_id);
    const userPerms = permissions.filter((perm) => activePermIds.includes(perm.id) || p.role === "admin");

    return {
      ...p,
      roles: assignedRoles.length > 0 ? assignedRoles : [{ id: p.role, name: p.role, description: null, created_at: p.created_at }],
      permissions: userPerms,
    };
  });

  // SUPER_ADMIN is a hardcoded system role that bypasses all RBAC checks automatically.
  // It should NOT be displayed in the "Peran" management list or in any role creation/edit forms.
  // Only manageable operational roles (Administrator, Event Manager, Kru Operasional) appear in the Peran tab.
  const visibleRoles = roles.filter(
    (role) =>
      !isSuperAdminRole(role.id) &&
      role.id !== "SUPER_ADMIN" &&
      role.name !== "Super Administrator" &&
      !role.name.toLowerCase().includes("super administrator")
  );

  const callerProfile = await getCurrentProfile();
  const callerRole = (
    callerProfile?.role ||
    (isSuperAdminUser ? "SUPER_ADMIN" : isAdminUser ? "ADMIN" : "STAFF")
  ).toUpperCase();

  return (
    <UsersManagementView
      initialUsers={usersWithRBAC}
      initialRoles={visibleRoles}
      initialPermissions={permissions}
      initialRolePermissions={rolePermissions}
      currentUserId={user?.id || null}
      currentUserRole={callerRole}
    />
  );
}
