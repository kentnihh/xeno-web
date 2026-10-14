import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth";
import { UsersManagementView } from "@/components/users/users-management-view";
import {
  FALLBACK_ROLES,
  FALLBACK_PERMISSIONS,
  FALLBACK_ROLE_PERMS,
  FALLBACK_USERS,
} from "@/lib/rbac-fallbacks";
import type { UserWithRBAC } from "@/types/database";

export default async function SettingsRBACPage() {
  const isUserAdmin = await isAdmin();

  if (!isUserAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Akses Ditolak: Khusus Administrator</h2>
          <p className="text-xs text-slate-400 max-w-md mt-1">
            Halaman manajemen pengguna dan konfigurasi RBAC hanya dapat diakses oleh staf dengan peran Admin.
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/login"
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors"
          >
            Masuk sebagai Admin
          </Link>
          <Link
            href="/dashboard"
            className="px-4 py-2 rounded-lg border border-slate-800 text-slate-300 hover:bg-slate-800 text-xs font-semibold transition-colors"
          >
            Kembali ke Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: rawProfiles }, { data: rawRoles }, { data: rawPerms }, { data: rawRP }, { data: rawUR }] =
    await Promise.all([
      supabase.from("profiles").select("*").order("full_name"),
      supabase.from("roles").select("*").order("name"),
      supabase.from("permissions").select("*").order("module"),
      supabase.from("role_permissions").select("*"),
      supabase.from("user_roles").select("*"),
    ]);

  const roles = rawRoles && rawRoles.length > 0 ? rawRoles : FALLBACK_ROLES;
  const permissions = rawPerms && rawPerms.length > 0 ? rawPerms : FALLBACK_PERMISSIONS;
  const rolePermissions = rawRP && rawRP.length > 0 ? rawRP : FALLBACK_ROLE_PERMS;
  const profiles = rawProfiles && rawProfiles.length > 0 ? rawProfiles : FALLBACK_USERS;

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

  return (
    <UsersManagementView
      initialUsers={usersWithRBAC}
      initialRoles={roles}
      initialPermissions={permissions}
      initialRolePermissions={rolePermissions}
      currentUserId={user?.id || null}
    />
  );
}
