import { createClient } from "@/lib/supabase/server";
import { hasPermission, getCurrentUser } from "@/lib/auth";
import { TeamMemberActions } from "@/components/team/team-member-actions";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Mail, ShieldCheck, Shield } from "lucide-react";

export default async function TeamPage() {
  const supabase = await createClient();
  const [canManageTeam, user, { data: rawProfiles }] = await Promise.all([
    hasPermission("team.manage"),
    getCurrentUser(),
    supabase.from("profiles").select("*").order("full_name"),
  ]);

  const team = rawProfiles || [];

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
                    <h3 className="text-sm font-bold text-foreground">{member.full_name}</h3>
                    <div className="flex items-center gap-1.5 mt-1">
                      {member.role === "admin" ? (
                        <ShieldCheck className="w-3.5 h-3.5 text-[#ff9f0a]" />
                      ) : (
                        <Shield className="w-3.5 h-3.5 text-muted-foreground/70" />
                      )}
                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                        member.role === "admin"
                          ? "bg-[#ff9f0a]/15 text-[#ff9f0a] border border-[#ff9f0a]/30"
                          : "bg-[#007aff]/15 text-[#007aff] dark:text-[#3894ff] border border-[#007aff]/30"
                      }`}>
                        {member.role}
                      </span>
                    </div>
                  </div>
                </div>

                {canManageTeam && (
                  <TeamMemberActions
                    memberId={member.id}
                    memberName={member.full_name}
                    currentRole={member.role}
                    isSelf={user?.id === member.id}
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
