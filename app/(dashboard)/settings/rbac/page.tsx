import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin, hasPermission, getCurrentUser, isSuperAdmin, isSuperAdminRole } from "@/lib/auth";
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

  const [{ data: rawProfiles }, { data: rawRoles }, { data: rawPerms }, { data: rawRP }, { data: rawUR }] =
    await Promise.all([
      supabase.from("profiles").select("*").order("full_name"),
      supabase.from("roles").select("*").order("name"),
      supabase.from("permissions").select("*").order("module"),
      supabase.from("role_permissions").select("*"),
      supabase.from("user_roles").select("*"),
    ]);

  const roles: Role[] = rawRoles || [];
  const permissions: Permission[] = rawPerms || [];
  const rolePermissions: RolePermission[] = rawRP || [];
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

  // Exclude SUPER_ADMIN from role assignment options if current user is not SUPER_ADMIN
  const availableRoles = isSuperAdminUser
    ? roles
    : roles.filter((r) => !isSuperAdminRole(r.id));

  return (
    <UsersManagementView
      initialUsers={usersWithRBAC}
      initialRoles={availableRoles}
      initialPermissions={permissions}
      initialRolePermissions={rolePermissions}
      currentUserId={user?.id || null}
    />
  );
}
