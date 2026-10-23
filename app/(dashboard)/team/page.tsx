import { createClient } from "@/lib/supabase/server";
import { hasPermission, getCurrentUser, getCurrentProfile, isAdmin, isSuperAdmin, isSuperAdminRole } from "@/lib/auth";
import { getRolesCached } from "@/lib/data-cache";
import { TeamMemberActions } from "@/components/team/team-member-actions";
import { UserAvatar } from "@/components/ui/user-avatar";
import { RoleBadge } from "@/components/ui/role-badge";
import { Mail, Shield, Lock } from "lucide-react";
import type { Profile } from "@/types/database";

export default async function TeamPage() {
  const supabase = await createClient();
  const [canManageTeam, canManageRoles, user, callerProfile, roles, { data: rawProfiles }] = await Promise.all([
    hasPermission("team.manage"),
    hasPermission("rbac.manage"),
    getCurrentUser(),
    getCurrentProfile(),
    getRolesCached(),
    supabase.from("profiles").select("*").order("full_name"),
  ]);

  const callerIsAdmin = user ? await isAdmin(user.id) : false;
  const callerIsSuper = user ? await isSuperAdmin(user.id) : false;
  const callerRole = (callerProfile?.role || (callerIsSuper ? "super_admin" : callerIsAdmin ? "admin" : "staff")).toUpperCase();
  const canEditRoles = (callerIsAdmin || callerIsSuper) && canManageRoles;
  const canEditMember = canManageTeam || canEditRoles;

  const manageableRoles = (roles || []).filter(
    (role) =>
      !isSuperAdminRole(role.id) &&
      role.id !== "SUPER_ADMIN" &&
      role.name !== "Super Administrator" &&
      !role.name.toLowerCase().includes("super administrator")
  );

  const team: Profile[] = rawProfiles || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Kru & Tim Internal</h1>
        <p className="text-xs text-muted-foreground mt-1 font-medium">Daftar staf operasional Xeno Entertainment & manajemen hak akses</p>
      </div>

      {team.length === 0 ? (
        <div className="apple-card p-12 text-center text-xs text-muted-foreground space-y-2 border border-border shadow-xs">
          <Shield className="w-8 h-8 text-muted-foreground/40 mx-auto" />
          <p className="font-semibold text-foreground text-sm">
            Belum ada anggota tim terdaftar
          </p>
          <p>
            Belum ada profil kru atau tim internal di database.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {team.map((member) => (
            <div key={member.id} className="apple-card-interactive p-5 space-y-3.5 rounded-2xl border border-border shadow-xs hover:shadow-md transition-all">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <UserAvatar user={member} size="md" />
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="text-sm font-bold text-foreground">{member.full_name}</h3>
                      {member.email?.toLowerCase() === "admin@xenoent.com" && (
                        <span
                          className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/30"
                          title="Akun Sistem Utama (Terkunci)"
                        >
                          <Lock className="w-2.5 h-2.5" />
                          <span>Terkunci</span>
                        </span>
                      )}
                    </div>
                    <div className="mt-1">
                      <RoleBadge role={member.role} size="xs" />
                    </div>
                  </div>
                </div>

                {canManageTeam && (
                  <TeamMemberActions
                    member={member}
                    memberId={member.id}
                    memberName={member.full_name}
                    currentRole={member.role}
                    isSelf={user?.id === member.id}
                    canEditRole={canEditRoles}
                    isRootAdmin={member.email?.toLowerCase() === "admin@xenoent.com"}
                    roles={manageableRoles}
                    currentUserId={user?.id || null}
                    currentUserRole={callerRole}
                  />
                )}
              </div>

              <div className="pt-2.5 border-t border-border text-xs font-medium text-muted-foreground flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-muted-foreground/70" />
                <span className="truncate">{member.email}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
